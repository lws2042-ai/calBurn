import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BOSSES,
  buildArrows,
  comboMultiplier,
  FEVER_COMBO,
  gameXp,
  HEALTHY,
  pickFood,
  pickWeighted,
  POWERUPS,
  combineEffects,
  dietCondition,
  trainingCondition,
  rankOf,
  runKmFor,
  themeOf,
} from '../lib/defense'
import { fmtInt } from '../lib/format'
import { readThemeColors } from '../lib/themes'

const H = 460
const GROUND = 44
const LIVES = 3
const MAX_LIVES = 5
const WAVE_MS = 20000
const FEVER_MS = 6000
const SLOW_MS = 6000
const MUTE_KEY = 'calburn:defense:muted'
const EMOJI_FONT = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'

/** 현재 테마 색을 캔버스용으로 읽는다 */
function gameColors() {
  const t = readThemeColors()
  return {
    accent: t.accent,
    accentDim: `rgba(${t.accentRgb},0.25)`,
    accentRgb: t.accentRgb,
    bad: t.bad,
    text: t.text,
    muted: t.muted,
    line: t.line,
    gold: '#f7c948',
    info: '#7cc4ff',
    healthy: '#9be36b',
  }
}

/** 아주 작은 효과음 신디사이저 (WebAudio) */
function createSfx(isMuted) {
  let ac = null
  const tone = (freq, dur = 0.08, type = 'square', vol = 0.05, slide = 0) => {
    if (isMuted()) return
    try {
      ac ??= new (window.AudioContext || window.webkitAudioContext)()
      const o = ac.createOscillator()
      const gn = ac.createGain()
      o.type = type
      o.frequency.setValueAtTime(freq, ac.currentTime)
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), ac.currentTime + dur)
      gn.gain.setValueAtTime(vol, ac.currentTime)
      gn.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur)
      o.connect(gn).connect(ac.destination)
      o.start()
      o.stop(ac.currentTime + dur)
    } catch {
      /* 오디오 불가 환경 무시 */
    }
  }
  return {
    shoot: () => tone(880, 0.04, 'square', 0.025, -300),
    hit: () => tone(320, 0.05, 'triangle', 0.04),
    kill: (combo) => tone(520 + Math.min(combo, 20) * 30, 0.12, 'triangle', 0.06, 200),
    land: () => tone(120, 0.25, 'sawtooth', 0.06, -60),
    good: () => {
      tone(660, 0.08, 'sine', 0.06)
      setTimeout(() => tone(990, 0.12, 'sine', 0.06), 70)
    },
    bad: () => tone(200, 0.2, 'square', 0.05, -100),
    power: () => {
      tone(523, 0.08, 'sine', 0.06)
      setTimeout(() => tone(784, 0.08, 'sine', 0.06), 60)
      setTimeout(() => tone(1046, 0.14, 'sine', 0.06), 120)
    },
    boss: () => tone(90, 0.6, 'sawtooth', 0.07, 60),
    fever: () => {
      for (let i = 0; i < 4; i++) setTimeout(() => tone(440 * (1 + i * 0.25), 0.1, 'square', 0.05), i * 60)
    },
  }
}

export default function CalorieDefense({ weightKg, profile, best, onFinish, entries, today }) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const selRef = useRef(1)
  const onFinishRef = useRef(onFinish)
  const mutedRef = useRef(false)
  const [sel, setSel] = useState(1)
  const [phase, setPhase] = useState('ready') // ready | playing | over
  const [paused, setPaused] = useState(false)
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem(MUTE_KEY) === '1'
    } catch {
      return false
    }
  })
  const [result, setResult] = useState(null)
  const arrows = useMemo(() => buildArrows(weightKg, profile), [weightKg, profile])
  // 실제 식단 → 게임 컨디션 (최근 7일) + 떨어질 내 음식 (최근 14일)
  const diet = useMemo(() => dietCondition(entries ?? {}, today), [entries, today])
  // 실제 운동량 → 공격력 (최근 7일 운동 순소모 kcal)
  const training = useMemo(() => trainingCondition(entries ?? {}, today, weightKg, profile), [entries, today, weightKg, profile])
  const fxAll = useMemo(() => combineEffects(diet, training), [diet, training])

  useEffect(() => {
    onFinishRef.current = onFinish
  }, [onFinish])
  useEffect(() => {
    mutedRef.current = muted
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [muted])

  function choose(i) {
    selRef.current = i
    setSel(i)
  }
  function togglePause() {
    const g = gameRef.current
    if (!g || g.over) return
    g.paused = !g.paused
    setPaused(g.paused)
  }
  function start() {
    setPaused(false)
    setPhase('playing')
  }

  useEffect(() => {
    if (phase !== 'playing') return
    const C = gameColors()
    const fx = fxAll
    const myPool = diet.pool
    const sfx = createSfx(() => mutedRef.current)
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const W = Math.min(720, wrapRef.current.clientWidth)
    const dpr = window.devicePixelRatio || 1
    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = `${W}px`
    canvas.style.height = `${H}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const g = {
      x: W / 2,
      move: 0,
      firing: false,
      paused: false,
      foods: [],
      shots: [],
      texts: [],
      sparks: [],
      cd: 0,
      cdMax: 1,
      spawnIn: 600,
      lives: Math.max(1, Math.min(MAX_LIVES, LIVES + fx.lifeDelta)),
      shield: fx.shield,
      mineKills: 0,
      score: 0,
      burned: 0,
      eatenKcal: 0,
      shotsFired: 0,
      wastedKcal: 0,
      kills: {},
      elapsed: 0,
      shake: 0,
      flash: 0,
      combo: 0,
      maxCombo: 0,
      feverT: 0,
      slowT: 0,
      wave: 1,
      banner: { text: diet.tier.id === 'none' ? `WAVE 1 · ${themeOf(1).name}` : `${diet.tier.label} 컨디션으로 시작!`, t: 2000 },
      bossWave: 0,
      bossesKilled: 0,
      healthyEaten: 0,
      healthyShot: 0,
      nextId: 1,
      over: false,
    }
    gameRef.current = g

    const float = (x, y, text, color, size = 14, life = 1100) => g.texts.push({ x, y, text, color, size, life, max: life })
    const burst = (x, y, color, n = 14, speed = 160) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2
        const s = 60 + Math.random() * speed
        g.sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 500 + Math.random() * 300, color })
      }
    }
    const breakCombo = () => {
      if (g.combo >= 5) float(g.x, H - GROUND - 60, `콤보 끊김 (${g.combo})`, C.muted, 13, 900)
      g.combo = 0
    }
    const addKill = (food, mult) => {
      g.combo++
      g.maxCombo = Math.max(g.maxCombo, g.combo)
      const gained = Math.round(food.kcal * mult)
      g.score += gained
      g.burned += food.kcal
      g.kills[food.name] = (g.kills[food.name] ?? 0) + 1
      if (food.mine) g.mineKills++
      sfx.kill(g.combo)
      if (g.combo === FEVER_COMBO || (g.combo > FEVER_COMBO && g.combo % FEVER_COMBO === 0)) {
        g.feverT = FEVER_MS
        g.banner = { text: '🔥 애프터번 FEVER! 관통 + 연사', t: 1600 }
        sfx.fever()
      }
      return gained
    }

    function fire() {
      if (g.cd > 0 || g.over) return
      const a = arrows[selRef.current]
      const fever = g.feverT > 0
      // 식단 컨디션: 데미지·재장전 보정
      g.shots.push({ x: g.x, y: H - GROUND - 18, dmg: a.kcal * fx.dmgMult, pierce: fever, hit: new Set() })
      g.cd = g.cdMax = a.cooldownMs * fx.cdMult * (fever ? 0.5 : 1)
      g.shotsFired++
      sfx.shoot()
    }

    function spawn() {
      const wave = g.wave
      const speed = (34 + wave * 8) * fx.fallMult
      const x = 30 + Math.random() * (W - 60)
      const base = { id: g.nextId++, x, y: -26, hit: 0 }
      const r = Math.random()
      // 내가 실제로 먹은 음식 (40%)
      if (myPool.length && r >= 0.06 && Math.random() < 0.4) {
        const m = myPool[Math.floor(Math.random() * myPool.length)]
        if (m.kind === 'healthy') {
          g.foods.push({ ...base, ...m, hp: m.kcal, vy: speed * 0.85 + Math.random() * 10, r: 20 })
        } else {
          const big = m.kcal > 700 // 큰 한 끼는 미니 보스급
          const hp = Math.round(m.kcal * fx.junkHpMult)
          g.foods.push({ ...base, ...m, kcal: hp, hp, vy: (big ? speed * 0.7 : speed) + Math.random() * 12, r: big ? 32 : 22, big })
        }
        return
      }
      if (r < 0.06) {
        const p = pickWeighted(POWERUPS)
        g.foods.push({ ...base, ...p, kind: 'power', hp: 1, kcal: 1, vy: speed * 0.9, r: 20 })
      } else if (r < 0.2) {
        const h = HEALTHY[Math.floor(Math.random() * HEALTHY.length)]
        g.foods.push({ ...base, ...h, kind: 'healthy', hp: h.kcal, vy: speed * 0.85 + Math.random() * 10, r: 20 })
      } else {
        const f = pickFood(Math.random, themeOf(wave).boost)
        const hp = Math.round(f.kcal * fx.junkHpMult)
        g.foods.push({ ...base, ...f, kind: 'junk', kcal: hp, hp, vy: speed + Math.random() * 14, r: 22 })
      }
    }

    function spawnBoss() {
      const b = BOSSES[(g.bossWave - 1) % BOSSES.length]
      g.foods.push({ id: g.nextId++, ...b, kind: 'boss', hp: b.kcal, x: W / 2, y: -50, vy: 16 + g.wave, r: 44, hit: 0, sway: Math.random() * 6 })
      g.banner = { text: `👹 BOSS · ${b.name} ${fmtInt(b.kcal)}kcal`, t: 2200 }
      sfx.boss()
    }

    function update(dt) {
      g.elapsed += dt
      const s = dt / 1000
      g.x = Math.max(16, Math.min(W - 16, g.x + g.move * 460 * s))
      g.cd = Math.max(0, g.cd - dt)
      g.feverT = Math.max(0, g.feverT - dt)
      g.slowT = Math.max(0, g.slowT - dt)
      g.flash = Math.max(0, g.flash - dt)
      if (g.banner) g.banner.t -= dt
      if (g.firing) fire()

      // 웨이브 진행
      const wave = 1 + Math.floor(g.elapsed / WAVE_MS)
      if (wave !== g.wave) {
        g.wave = wave
        g.banner = { text: `WAVE ${wave} · ${themeOf(wave).name}`, t: 1800 }
        if (wave % 3 === 0 && g.bossWave !== wave) {
          g.bossWave = wave
          setTimeout(spawnBoss, 1200)
        }
      }

      // 스폰 (보스가 있는 동안은 덜)
      const bossAlive = g.foods.some((f) => f.kind === 'boss')
      g.spawnIn -= dt
      if (g.spawnIn <= 0) {
        spawn()
        g.spawnIn = Math.max(520, 2000 - g.wave * 150) * (0.7 + Math.random() * 0.6) * (bossAlive ? 1.8 : 1)
      }

      const slow = g.slowT > 0 ? 0.45 : 1
      for (const sh of g.shots) sh.y -= 660 * s
      for (const f of g.foods) {
        f.y += f.vy * s * slow
        if (f.kind === 'boss') f.x = W / 2 + Math.sin(g.elapsed / 900 + f.sway) * (W / 2 - 70)
        f.hit = Math.max(0, f.hit - dt)
      }

      // 충돌
      for (const sh of g.shots) {
        if (sh.dead) continue
        for (const f of g.foods) {
          if (f.dead || sh.hit.has(f.id) || Math.abs(sh.x - f.x) > f.r + 2 || Math.abs(sh.y - f.y) > f.r) continue
          sh.hit.add(f.id)
          if (!sh.pierce) sh.dead = true
          const mult = comboMultiplier(g.combo)

          if (f.kind === 'healthy') {
            // 건강 음식을 쐈다 → 감점, 콤보 끊김
            f.dead = true
            g.healthyShot++
            g.score = Math.max(0, g.score - 100)
            breakCombo()
            g.flash = 250
            sfx.bad()
            burst(f.x, f.y, C.healthy, 8)
            float(f.x, f.y, `${f.emoji} 쏘지 마세요! −100`, C.bad, 14, 1300)
          } else if (f.kind === 'power') {
            f.dead = true
            sfx.power()
            burst(f.x, f.y, C.info, 16)
            if (f.power === 'slow') {
              g.slowT = SLOW_MS
              float(f.x, f.y, '💧 수분 보충 — 슬로우!', C.info, 15, 1300)
            } else if (f.power === 'shield') {
              g.shield = Math.min(3, g.shield + 1)
              float(f.x, f.y, '🛡️ 단백질 쉴드 +1', C.info, 15, 1300)
            } else {
              g.lives = Math.min(MAX_LIVES, g.lives + 1)
              float(f.x, f.y, '💓 생명 +1', C.bad, 15, 1300)
            }
          } else {
            const dealt = Math.min(f.hp, sh.dmg)
            g.wastedKcal += sh.dmg - dealt
            f.hp -= sh.dmg
            f.hit = 120
            sfx.hit()
            float(f.x + 18, f.y - 10, `−${Math.round(sh.dmg)}`, g.feverT ? C.gold : C.accent, 13, 700)
            if (f.hp <= 0) {
              f.dead = true
              const gained = addKill(f, f.kind === 'boss' ? mult * 2 : mult)
              if (f.kind === 'boss') {
                g.bossesKilled++
                g.lives = Math.min(MAX_LIVES, g.lives + 1)
                g.shake = 400
                burst(f.x, f.y, C.gold, 60, 320)
                float(f.x, f.y - 10, `👑 보스 격파! +${fmtInt(gained)}  💓+1`, C.gold, 18, 2000)
                float(f.x, f.y + 16, `${f.name} = 러닝 ${runKmFor(f.kcal, weightKg).toFixed(1)}km`, C.text, 13, 2000)
              } else {
                burst(f.x, f.y, g.feverT ? C.gold : C.accent)
                float(f.x, f.y, `${f.emoji} ${f.kcal}kcal = 러닝 ${runKmFor(f.kcal, weightKg).toFixed(1)}km`, C.text, 13, 1500)
                if (mult > 1) float(f.x, f.y + 16, `×${mult} +${fmtInt(gained)}`, C.gold, 12, 1000)
              }
            }
          }
          if (sh.dead) break
        }
      }

      // 땅에 닿음 = 먹음
      for (const f of g.foods) {
        if (f.dead || f.y < H - GROUND - (f.kind === 'boss' ? 30 : 6)) continue
        f.dead = true
        if (f.kind === 'power') continue // 놓친 아이템은 그냥 사라짐
        if (f.kind === 'healthy') {
          g.healthyEaten++
          g.score += Math.round(80 * comboMultiplier(g.combo))
          sfx.good()
          burst(f.x, H - GROUND, C.healthy, 10)
          float(f.x, H - GROUND - 30, `${f.emoji} 좋은 선택! +80`, C.healthy, 14, 1300)
          if (g.healthyEaten % 3 === 0 && g.lives < MAX_LIVES) {
            g.lives++
            float(f.x, H - GROUND - 52, '💓 건강 3개 → 생명 +1', C.healthy, 13, 1500)
          }
          continue
        }
        const dmg = f.kind === 'boss' ? 2 : 1
        if (g.shield > 0) {
          g.shield--
          sfx.power()
          burst(f.x, H - GROUND, C.info, 14)
          float(f.x, H - GROUND - 30, '🛡️ 쉴드가 막았다!', C.info, 15, 1300)
          continue
        }
        g.lives -= dmg
        g.eatenKcal += f.hp
        g.shake = f.kind === 'boss' ? 500 : 260
        g.flash = 300
        breakCombo()
        sfx.land()
        burst(f.x, H - GROUND, C.bad, 12)
        float(f.x, H - GROUND - 30, `+${fmtInt(f.hp)} kcal 흑자!${dmg > 1 ? ' 💔💔' : ''}`, C.bad, 15, 1400)
      }

      g.foods = g.foods.filter((f) => !f.dead)
      g.shots = g.shots.filter((sh) => !sh.dead && sh.y > -20)
      for (const t of g.texts) {
        t.life -= dt
        t.y -= 22 * s
      }
      g.texts = g.texts.filter((t) => t.life > 0)
      for (const p of g.sparks) {
        p.life -= dt
        p.x += p.vx * s
        p.y += p.vy * s
        p.vy += 300 * s
      }
      g.sparks = g.sparks.filter((p) => p.life > 0)
      g.shake = Math.max(0, g.shake - dt)

      if (g.lives <= 0 && !g.over) {
        g.over = true
        const r = {
          score: g.score,
          burned: g.burned,
          eatenKcal: g.eatenKcal,
          wastedKcal: g.wastedKcal,
          shots: g.shotsFired,
          kills: g.kills,
          maxCombo: g.maxCombo,
          bossesKilled: g.bossesKilled,
          mineKills: g.mineKills,
          healthyEaten: g.healthyEaten,
          healthyShot: g.healthyShot,
          wave: g.wave,
          seconds: Math.round(g.elapsed / 1000),
          xp: gameXp(g.score),
        }
        setTimeout(() => {
          setResult(r)
          setPhase('over')
          onFinishRef.current(r)
        }, 900)
      }
    }

    function drawFood(f) {
      const boss = f.kind === 'boss'
      const size = boss ? 64 : f.big ? 46 : 32
      // 내가 먹은 음식: 금색 테두리
      if (f.mine && f.kind === 'junk') {
        ctx.beginPath()
        ctx.arc(f.x, f.y, f.r + 3, 0, Math.PI * 2)
        ctx.strokeStyle = C.gold
        ctx.globalAlpha = 0.55
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.globalAlpha = 1
      }
      if (f.kind === 'healthy' || f.kind === 'power') {
        ctx.beginPath()
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2)
        ctx.strokeStyle = f.kind === 'healthy' ? C.healthy : C.info
        ctx.globalAlpha = 0.5 + 0.3 * Math.sin(g.elapsed / 150)
        ctx.lineWidth = 2
        ctx.setLineDash(f.kind === 'healthy' ? [4, 3] : [])
        ctx.stroke()
        ctx.setLineDash([])
        ctx.globalAlpha = 1
      }
      if (boss) {
        ctx.shadowColor = C.bad
        ctx.shadowBlur = 24
      }
      ctx.font = `${size}px ${EMOJI_FONT}`
      ctx.globalAlpha = f.hit ? 0.6 : 1
      ctx.fillText(f.emoji, f.x, f.y)
      ctx.globalAlpha = 1
      ctx.shadowBlur = 0

      // 이름 / 안내
      const mineTag = f.mine ? ' · 내 기록' : ''
      const label = f.kind === 'healthy' ? `${f.name}${mineTag} · 쏘지 마세요` : f.kind === 'power' ? `${f.name} · ${f.desc}` : `${f.name}${mineTag}`
      ctx.font = `600 ${boss ? 13 : 11}px "IBM Plex Sans KR",sans-serif`
      ctx.fillStyle = f.kind === 'healthy' ? C.healthy : f.kind === 'power' ? C.info : boss || f.mine ? C.gold : C.text
      ctx.globalAlpha = 0.9
      ctx.fillText(label, f.x, f.y - (boss ? 46 : 26))
      ctx.globalAlpha = 1

      if (f.kind === 'junk' || boss) {
        const bw = boss ? 110 : 44
        const by = f.y + (boss ? 40 : 20)
        ctx.globalAlpha = 0.25
        ctx.fillStyle = C.bad
        ctx.fillRect(f.x - bw / 2, by, bw, boss ? 6 : 4)
        ctx.globalAlpha = 1
        ctx.fillRect(f.x - bw / 2, by, bw * Math.max(0, f.hp / f.kcal), boss ? 6 : 4)
        ctx.font = '11px "JetBrains Mono",monospace'
        ctx.fillStyle = C.muted
        ctx.fillText(`${Math.max(0, Math.round(f.hp))}`, f.x, by + 12)
      }
    }

    function draw() {
      ctx.save()
      if (g.shake) ctx.translate((Math.random() - 0.5) * 10 * (g.shake / 300), (Math.random() - 0.5) * 4 * (g.shake / 300))
      ctx.clearRect(-10, -10, W + 20, H + 20)

      // 피버·슬로우 배경
      if (g.feverT) {
        ctx.fillStyle = `rgba(247,201,72,${0.05 + 0.04 * Math.sin(g.elapsed / 80)})`
        ctx.fillRect(0, 0, W, H)
      }
      if (g.slowT) {
        ctx.fillStyle = 'rgba(124,196,255,0.07)'
        ctx.fillRect(0, 0, W, H)
      }

      ctx.strokeStyle = C.line
      ctx.lineWidth = 1
      for (let y = 40; y < H - GROUND; y += 40) {
        ctx.beginPath()
        ctx.moveTo(0, y + 0.5)
        ctx.lineTo(W, y + 0.5)
        ctx.stroke()
      }

      // 땅 (= 내 몸)
      const grd = ctx.createLinearGradient(0, H - GROUND, 0, H)
      grd.addColorStop(0, `rgba(${C.accentRgb},0.18)`)
      grd.addColorStop(1, `rgba(${C.accentRgb},0.02)`)
      ctx.fillStyle = grd
      ctx.fillRect(0, H - GROUND, W, GROUND)
      ctx.strokeStyle = g.shield ? C.info : C.accent
      ctx.shadowColor = ctx.strokeStyle
      ctx.shadowBlur = g.shield ? 16 : 10
      ctx.lineWidth = g.shield ? 3 : 1
      ctx.beginPath()
      ctx.moveTo(0, H - GROUND + 0.5)
      ctx.lineTo(W, H - GROUND + 0.5)
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.lineWidth = 1

      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (const f of g.foods) drawFood(f)

      // 화살
      const arrowColor = g.feverT ? C.gold : C.accent
      ctx.strokeStyle = arrowColor
      ctx.shadowColor = arrowColor
      ctx.shadowBlur = 12
      ctx.lineWidth = g.feverT ? 3.5 : 2.5
      for (const sh of g.shots) {
        ctx.beginPath()
        ctx.moveTo(sh.x, sh.y)
        ctx.lineTo(sh.x, sh.y + (g.feverT ? 30 : 22))
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(sh.x - 5, sh.y + 7)
        ctx.lineTo(sh.x, sh.y)
        ctx.lineTo(sh.x + 5, sh.y + 7)
        ctx.stroke()
      }
      ctx.shadowBlur = 0

      for (const p of g.sparks) {
        ctx.globalAlpha = Math.max(0, p.life / 800)
        ctx.fillStyle = p.color
        ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3)
      }
      ctx.globalAlpha = 1

      // 발사대
      const by = H - GROUND - 6
      ctx.fillStyle = arrowColor
      ctx.shadowColor = arrowColor
      ctx.shadowBlur = g.cd ? 4 : 16
      ctx.beginPath()
      ctx.moveTo(g.x, by - 18)
      ctx.lineTo(g.x - 13, by)
      ctx.lineTo(g.x + 13, by)
      ctx.closePath()
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.fillStyle = C.accentDim
      ctx.fillRect(g.x - 22, by + 10, 44, 4)
      ctx.fillStyle = g.cd ? C.muted : arrowColor
      ctx.fillRect(g.x - 22, by + 10, 44 * (1 - g.cd / g.cdMax), 4)

      for (const t of g.texts) {
        ctx.globalAlpha = Math.min(1, t.life / (t.max * 0.4))
        ctx.font = `600 ${t.size}px "IBM Plex Sans KR",sans-serif`
        ctx.fillStyle = t.color
        ctx.fillText(t.text, Math.max(110, Math.min(W - 110, t.x)), t.y)
      }
      ctx.globalAlpha = 1

      // 피격 플래시
      if (g.flash) {
        ctx.fillStyle = `rgba(255,80,80,${(g.flash / 300) * 0.18})`
        ctx.fillRect(0, 0, W, H)
      }

      // HUD
      ctx.textAlign = 'left'
      ctx.font = '600 15px "JetBrains Mono",monospace'
      ctx.fillStyle = C.accent
      ctx.shadowColor = C.accent
      ctx.shadowBlur = 8
      ctx.fillText(`${fmtInt(g.score)}점`, 12, 20)
      ctx.shadowBlur = 0
      const mult = comboMultiplier(g.combo)
      if (g.combo >= 2) {
        ctx.font = '600 12px "JetBrains Mono",monospace'
        ctx.fillStyle = mult > 1 ? C.gold : C.muted
        ctx.fillText(`${g.combo} COMBO${mult > 1 ? ` ×${mult}` : ''}`, 12, 40)
      }
      ctx.textAlign = 'right'
      ctx.font = '600 15px "JetBrains Mono",monospace'
      ctx.fillStyle = C.bad
      ctx.fillText('♥'.repeat(Math.max(0, g.lives)) + '♡'.repeat(Math.max(0, LIVES - g.lives)), W - 12, 20)
      if (g.shield) {
        ctx.font = `14px ${EMOJI_FONT}`
        ctx.fillText('🛡️'.repeat(g.shield), W - 12, 40)
      }
      ctx.textAlign = 'center'
      ctx.fillStyle = C.muted
      ctx.font = '12px "JetBrains Mono",monospace'
      ctx.fillText(`WAVE ${g.wave}`, W / 2, 20)
      // 타이머 바: 피버·슬로우
      const bars = []
      if (g.feverT) bars.push([g.feverT / FEVER_MS, C.gold, 'FEVER'])
      if (g.slowT) bars.push([g.slowT / SLOW_MS, C.info, 'SLOW'])
      bars.forEach(([p, col, label], i) => {
        const y0 = 34 + i * 12
        ctx.fillStyle = col
        ctx.globalAlpha = 0.25
        ctx.fillRect(W / 2 - 60, y0, 120, 5)
        ctx.globalAlpha = 1
        ctx.fillRect(W / 2 - 60, y0, 120 * p, 5)
        ctx.font = '9px "JetBrains Mono",monospace'
        ctx.fillText(label, W / 2 + 80, y0 + 3)
      })
      ctx.fillStyle = C.muted
      ctx.font = '12px "JetBrains Mono",monospace'
      ctx.fillText(`▲ ${arrows[selRef.current].label} · ${Math.round(arrows[selRef.current].kcal)} kcal`, W / 2, H - 14)

      // 웨이브 배너
      if (g.banner && g.banner.t > 0) {
        const a = Math.min(1, g.banner.t / 400)
        ctx.globalAlpha = a
        ctx.fillStyle = 'rgba(0,0,0,0.55)'
        ctx.fillRect(0, H / 2 - 30, W, 52)
        ctx.font = '700 20px "IBM Plex Sans KR",sans-serif'
        ctx.fillStyle = g.banner.text.startsWith('👹') ? C.bad : g.banner.text.startsWith('🔥') ? C.gold : C.accent
        ctx.fillText(g.banner.text, W / 2, H / 2 - 4)
        ctx.globalAlpha = 1
      }

      if (g.paused) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'
        ctx.fillRect(0, 0, W, H)
        ctx.fillStyle = C.text
        ctx.font = '700 24px "IBM Plex Sans KR",sans-serif'
        ctx.fillText('일시정지', W / 2, H / 2 - 10)
        ctx.font = '13px "IBM Plex Sans KR",sans-serif'
        ctx.fillStyle = C.muted
        ctx.fillText('P 또는 Esc로 계속', W / 2, H / 2 + 18)
      }
      ctx.restore()
    }

    let raf
    let last = performance.now()
    const loop = (now) => {
      const dt = Math.max(0, Math.min(50, now - last)) // 첫 프레임 시각이 앞설 수 있어 음수 방지
      last = now
      if (!g.paused) update(dt)
      draw()
      if (!g.over || g.sparks.length) raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const toX = (e) => e.clientX - canvas.getBoundingClientRect().left
    const onPointerMove = (e) => {
      if (!g.paused) g.x = toX(e)
    }
    const onPointerDown = (e) => {
      if (g.paused) return
      g.x = toX(e)
      g.firing = true
      canvas.setPointerCapture?.(e.pointerId)
    }
    const onPointerUp = () => {
      g.firing = false
    }
    const keys = new Set()
    const onKey = (e) => {
      const down = e.type === 'keydown'
      if (['ArrowLeft', 'ArrowRight', ' ', 'a', 'd'].includes(e.key)) e.preventDefault()
      if (down && (e.key === 'p' || e.key === 'P' || e.key === 'Escape')) {
        if (!g.over) {
          g.paused = !g.paused
          setPaused(g.paused)
        }
        return
      }
      if (down && /^[1-6]$/.test(e.key)) choose(Number(e.key) - 1)
      if (e.key === ' ') g.firing = down && !g.paused
      if (['ArrowLeft', 'a'].includes(e.key)) down ? keys.add('L') : keys.delete('L')
      if (['ArrowRight', 'd'].includes(e.key)) down ? keys.add('R') : keys.delete('R')
      g.move = (keys.has('R') ? 1 : 0) - (keys.has('L') ? 1 : 0)
    }
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    return () => {
      cancelAnimationFrame(raf)
      gameRef.current = null
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
    }
  }, [phase, arrows, weightKg, diet, fxAll])

  const rank = result ? rankOf(result.score) : null

  return (
    <div className="defense" ref={wrapRef}>
      <div className="defense__toolbar">
        <button className="btn btn--ghost small-btn" onClick={() => setMuted((m) => !m)} aria-label="효과음">
          {muted ? '🔇 소리 꺼짐' : '🔊 소리 켜짐'}
        </button>
        {phase === 'playing' && (
          <button className="btn btn--ghost small-btn" onClick={togglePause}>
            {paused ? '▶ 계속' : '⏸ 일시정지'}
          </button>
        )}
      </div>
      <div className="defense__stage">
        <canvas ref={canvasRef} className={phase === 'ready' ? 'hidden' : ''} />
        {phase === 'ready' && (
          <div className="defense__overlay defense__overlay--ready">
            {/* 배경: 떨어지는 음식 (게임임을 한눈에) */}
            <div className="hero-rain" aria-hidden="true">
              {['🍗', '🍕', '🍩', '🍜', '🥤', '🍔', '🍰', '🍟', '🍺', '🍦'].map((e, i) => (
                <span key={i} style={{ left: `${5 + i * 9.5}%`, animationDelay: `${(i * 0.73) % 4}s`, animationDuration: `${4 + (i % 3)}s` }}>
                  {e}
                </span>
              ))}
            </div>
            <div className="game-badge">🎮 MINI GAME</div>
            <div className="defense__title defense__title--hero glow-text">칼로리 디펜스</div>
            <p className="defense__tagline">하늘에서 떨어지는 음식을 <b>운동 화살</b>로 태워 없애세요! 🏹</p>
            <button className="btn btn--play" onClick={start}>
              ▶ 게임 시작
            </button>
            {best > 0 && (
              <div className="defense__best mono">
                🏆 최고 기록 <b>{fmtInt(best)}</b>점
              </div>
            )}
            <p className="muted small">
              화살 데미지 = <b>당신의 체중({weightKg.toFixed(1)}kg)</b>으로 계산한 실제 소모 kcal · 재장전 = 실제 운동 시간
            </p>
            <DietCard diet={diet} training={training} fx={fxAll} />
            <ul className="defense__rules">
              <li>
                <b>🔥 콤보</b> 놓치지 않고 연속 처치 → 점수 최대 ×3, <b>10콤보</b>면 <b>애프터번 피버</b>(관통·연사)
              </li>
              <li>
                <b>🥦 건강 음식</b>은 쏘지 마세요! 먹으면 보너스, 3개마다 💓+1
              </li>
              <li>
                <b>💧🛡️💓 아이템</b>은 쏴서 획득 · <b>👹 보스</b>는 3웨이브마다 (놓치면 💔💔)
              </li>
            </ul>
            <p className="muted small">마우스/터치로 조준 · 누르고 있으면 연사 · ←→ 이동, Space 발사, 1~6 화살, P 일시정지</p>
            <button className="btn btn--play btn--play-sm" onClick={start}>
              ▶ 시작
            </button>
          </div>
        )}
        {phase === 'over' && result && (
          <div className="defense__overlay">
            <div className="defense__rank">
              <span className={`rank rank--${rank.grade}`}>{rank.grade}</span>
              <span>{rank.title}</span>
            </div>
            <div className="defense__score mono glow-text">{fmtInt(result.score)}점</div>
            {result.score > best && <div className="badge-new">🏆 최고 기록 갱신!</div>}
            <div className="defense__stats mono small">
              <span>WAVE {result.wave}</span>
              <span>최고 콤보 {result.maxCombo}</span>
              <span>보스 격파 {result.bossesKilled}</span>
              {result.mineKills > 0 && <span>🍽️ 내 음식 처치 {result.mineKills}</span>}
              <span>🥦 먹음 {result.healthyEaten}</span>
              {result.healthyShot > 0 && <span className="c-bad">🥦 오사격 {result.healthyShot}</span>}
              {result.xp > 0 && <span className="c-good">+{result.xp} XP</span>}
            </div>
            <div className="defense__lesson">
              태운 {fmtInt(result.burned)} kcal = 지방 {fmtInt((result.burned / 7700) * 1000)}g = 현실에서 <b>러닝 {runKmFor(result.burned, weightKg).toFixed(1)}km</b>
              <br />
              <span className="muted">먹는 건 몇 초, 태우는 건 몇 시간. 가장 강한 화살은 애초에 먹지 않는 것입니다.</span>
            </div>
            <button className="btn btn--primary" onClick={start}>
              다시 하기
            </button>
          </div>
        )}
      </div>

      <div className="arrows">
        {arrows.map((a, i) => (
          <button key={a.id} className={i === sel ? 'arrow on' : 'arrow'} onClick={() => choose(i)}>
            <span className="arrow__key mono">{i + 1}</span>
            <span className="arrow__label">{a.label}</span>
            <span className="arrow__stat mono">
              {Math.round(a.kcal)} kcal · {(a.cooldownMs / 1000).toFixed(1)}s
            </span>
          </button>
        ))}
      </div>
      <p className="muted small">
        화력(DPS) = 분당 소모 kcal. 같은 시간이면 강도가 높은 운동이 더 강합니다. 큰 화살은 재장전이 길어 작은 음식엔 화력이 낭비됩니다.
      </p>
    </div>
  )
}

/** 시작 화면: 내 식단 컨디션과 게임 효과 */
function DietCard({ diet, training, fx }) {
  const { tier, counts, top, pool } = diet
  const tone = { clean: 'good', good: 'good', normal: 'neutral', greasy: 'bad', junk: 'bad', none: 'neutral' }[tier.id]
  return (
    <div className={`diet-card diet-card--${tone}`}>
      <div className="diet-card__head">
        <b>최근 7일 식단 컨디션: {tier.label}</b>
      </div>
      <div className="diet-card__fx">{tier.desc}</div>
      {tier.id !== 'none' && (
        <div className="diet-card__counts small">
          <span className="c-good">건강 {counts.healthy}</span> · <span className="c-bad">해로움 {counts.harmful}</span> · <span className="muted">중립 {counts.neutral}</span>
          {top.harmful.length > 0 && <span className="muted"> — 주범: {top.harmful.join(', ')}</span>}
          {top.healthy.length > 0 && <span className="muted"> — 잘한 선택: {top.healthy.join(', ')}</span>}
        </div>
      )}
      {pool.length > 0 && <div className="muted small">내가 먹은 음식 {pool.length}종이 하늘에서 떨어집니다 (금색 테두리 = 내 기록)</div>}

      <div className="diet-card__sep" />
      <div className="diet-card__head">
        <b>
          최근 7일 운동: {training.tier.label} <span className="mono muted">({training.kcal.toLocaleString()} kcal · {training.sessions}회)</span>
        </b>
      </div>
      <div className={`diet-card__fx ${training.tier.dmgMult > 1 ? 'c-good' : 'muted'}`}>{training.tier.desc}</div>
      {training.next && (
        <div className="muted small">
          {training.next.label}까지 {(training.next.min - training.kcal).toLocaleString()} kcal 더 → {training.next.desc}
        </div>
      )}

      <div className="diet-card__total mono small">
        최종: 화살 ×{fx.dmgMult.toFixed(2)} · 재장전 ×{fx.cdMult.toFixed(2)}
        {fx.lifeDelta !== 0 && ` · 생명 ${fx.lifeDelta > 0 ? '+' : ''}${fx.lifeDelta}`}
        {fx.shield > 0 && ' · 쉴드 1'}
        {fx.fallMult !== 1 && ` · 낙하 ×${fx.fallMult.toFixed(2)}`}
      </div>
    </div>
  )
}
