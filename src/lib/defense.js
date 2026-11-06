// 칼로리 디펜스: 떨어지는 음식(kcal) vs 운동 화살(순소모 kcal).
// 물리 규칙: 화살 데미지 = 내 체중으로 계산한 운동 순소모 kcal,
//            재장전 = 실제 운동 시간 × 60ms  →  DPS = 그 운동의 분당 소모 kcal (강도가 곧 화력)

import { addDays } from './dates.js'
import { exerciseKcal } from './exercise.js'
import { classifyFood, emojiFor, isAggregate } from './foodClass.js'

/** 대표 1회 제공량 기준 대략값 (kcal) */
export const FOODS = [
  { emoji: '🍗', name: '치킨 다리', kcal: 290, w: 3 },
  { emoji: '🍕', name: '피자 1조각', kcal: 280, w: 3 },
  { emoji: '🍩', name: '도넛', kcal: 250, w: 3 },
  { emoji: '🥤', name: '콜라 1캔', kcal: 140, w: 4 },
  { emoji: '🍦', name: '아이스크림', kcal: 200, w: 3 },
  { emoji: '🍙', name: '삼각김밥', kcal: 200, w: 3 },
  { emoji: '🍫', name: '초콜릿 바', kcal: 230, w: 3 },
  { emoji: '🍺', name: '맥주 500ml', kcal: 210, w: 2 },
  { emoji: '🍟', name: '감자튀김(M)', kcal: 330, w: 2 },
  { emoji: '🍰', name: '케이크 1조각', kcal: 350, w: 2 },
  { emoji: '🍔', name: '햄버거', kcal: 520, w: 1 },
  { emoji: '🍜', name: '라면 1봉', kcal: 500, w: 1 },
]

export const ARROW_DEFS = [
  { id: 'walk1', label: '걷기 1km', ex: { type: 'walk', distanceKm: 1 }, minutes: 12 },
  { id: 'run1', label: '러닝 1km', ex: { type: 'run', distanceKm: 1 }, minutes: 6 },
  { id: 'run5', label: '러닝 5km', ex: { type: 'run', distanceKm: 5 }, minutes: 30 },
  { id: 'swim30', label: '수영 30분', ex: { type: 'swim', minutes: 30, intensity: 'moderate' }, minutes: 30 },
  { id: 'cycle30', label: '자전거 30분', ex: { type: 'cycle', minutes: 30, intensity: 'moderate' }, minutes: 30 },
  { id: 'hike60', label: '등산 1시간 ↑300m', ex: { type: 'hike', minutes: 60, elevationM: 300 }, minutes: 60 },
]

export const MS_PER_EXERCISE_MINUTE = 60

export function buildArrows(weightKg, profile) {
  return ARROW_DEFS.map((d) => {
    const kcal = exerciseKcal(d.ex, weightKg, profile)
    return { ...d, kcal, cooldownMs: d.minutes * MS_PER_EXERCISE_MINUTE, perMin: kcal / d.minutes }
  })
}

/** 이 kcal을 태우려면 러닝 몇 km? */
export const runKmFor = (kcal, weightKg) => kcal / (0.95 * weightKg)

/** 건강 음식: 쏘면 안 된다. 바닥에 닿으면(먹으면) 보너스 */
export const HEALTHY = [
  { emoji: '🥦', name: '브로콜리', kcal: 30 },
  { emoji: '🍎', name: '사과', kcal: 95 },
  { emoji: '🥗', name: '샐러드', kcal: 120 },
  { emoji: '🥚', name: '삶은 달걀', kcal: 75 },
  { emoji: '🍠', name: '고구마', kcal: 130 },
]

/** 아이템: 쏴서 획득 */
export const POWERUPS = [
  { emoji: '💧', name: '물 한 잔', power: 'slow', desc: '6초 슬로우', w: 3 },
  { emoji: '🛡️', name: '단백질 쉴드', power: 'shield', desc: '1회 방어', w: 3 },
  { emoji: '💓', name: '회복', power: 'life', desc: '생명 +1', w: 1 },
]

/** 보스: 3웨이브마다 */
export const BOSSES = [
  { emoji: '🍗', name: '치킨 한 마리', kcal: 1900 },
  { emoji: '🎂', name: '홀케이크', kcal: 2400 },
  { emoji: '🍕', name: '라지 피자', kcal: 2200 },
  { emoji: '🍱', name: '야식 세트', kcal: 2600 },
]

/** 웨이브 테마: 해당 음식의 출현 확률을 높인다 */
export const WAVE_THEMES = [
  { name: '워밍업', boost: [] },
  { name: '편의점 습격', boost: ['🥤', '🍙', '🍫', '🍦'] },
  { name: '야식 타임 🌙', boost: ['🍗', '🍜', '🍺', '🍟'] },
  { name: '회식 자리', boost: ['🍺', '🍗', '🍕', '🍟'] },
  { name: '디저트 카페', boost: ['🍰', '🍩', '🍦', '🍫'] },
  { name: '패스트푸드', boost: ['🍔', '🍟', '🥤', '🍕'] },
]
export const themeOf = (wave) => {
  const n = WAVE_THEMES.length
  return WAVE_THEMES[(((Math.floor(wave) - 1) % n) + n) % n] ?? WAVE_THEMES[0]
}

export function pickFood(rand = Math.random, boost = []) {
  const weight = (f) => f.w * (boost.includes(f.emoji) ? 4 : 1)
  const total = FOODS.reduce((s, f) => s + weight(f), 0)
  let r = rand() * total
  for (const f of FOODS) {
    r -= weight(f)
    if (r <= 0) return f
  }
  return FOODS[0]
}

export function pickWeighted(list, rand = Math.random) {
  const total = list.reduce((s, x) => s + (x.w ?? 1), 0)
  let r = rand() * total
  for (const x of list) {
    r -= x.w ?? 1
    if (r <= 0) return x
  }
  return list[0]
}

/** 콤보 → 점수 배수 (5콤보마다 +0.5, 최대 ×3) */
export const comboMultiplier = (combo) => Math.min(3, 1 + Math.floor(combo / 5) * 0.5)

export const FEVER_COMBO = 10

/** 결과 등급 */
export function rankOf(score) {
  if (score >= 9000) return { grade: 'SS', title: '애프터버너' }
  if (score >= 5000) return { grade: 'S', title: '지방 파괴자' }
  if (score >= 2500) return { grade: 'A', title: '버너' }
  if (score >= 1000) return { grade: 'B', title: '러너' }
  return { grade: 'C', title: '입문자' }
}

// ── 실제 식단 → 게임 컨디션 ─────────────────────────
// 최근 7일 기록의 건강/해로움 비율이 게임 시작 조건을 바꾼다.
const NEUTRAL_FX = { lifeDelta: 0, shield: 0, dmgMult: 1, cdMult: 1, fallMult: 1, junkHpMult: 1 }
export const DIET_TIERS = [
  { id: 'clean', min: 0.3, label: '🥗 클린 식단', fx: { ...NEUTRAL_FX, lifeDelta: 1, shield: 1, dmgMult: 1.15, fallMult: 0.9 }, desc: '💓+1 · 🛡️ 쉴드로 시작 · 화살 +15% · 낙하 −10%' },
  { id: 'good', min: 0.1, label: '🙂 괜찮은 식단', fx: { ...NEUTRAL_FX, shield: 1, dmgMult: 1.05 }, desc: '🛡️ 쉴드로 시작 · 화살 +5%' },
  { id: 'normal', min: -0.1, label: '😐 보통 식단', fx: NEUTRAL_FX, desc: '효과 없음' },
  { id: 'greasy', min: -0.3, label: '🍟 기름진 한 주', fx: { ...NEUTRAL_FX, cdMult: 1.15, fallMult: 1.1 }, desc: '재장전 +15% (나트륨 부종) · 낙하 +10%' },
  { id: 'junk', min: -Infinity, label: '🍕 정크 위크', fx: { ...NEUTRAL_FX, lifeDelta: -1, cdMult: 1.25, fallMult: 1.2, junkHpMult: 1.15 }, desc: '💔−1 · 재장전 +25% · 낙하 +20% · 정크 체력 +15%' },
]
const NONE_TIER = { id: 'none', label: '📭 기록 없음', fx: NEUTRAL_FX, desc: '음식을 기록하면 식단이 게임에 반영됩니다' }

/**
 * @returns { tier, score(−1~1), counts, effects, pool(게임에 떨어질 내 음식), top }
 */
export function dietCondition(entries, today, days = 7, poolDays = 14) {
  const counts = { healthy: 0, harmful: 0, neutral: 0 }
  const named = { healthy: new Map(), harmful: new Map() }
  const pool = new Map()

  for (let i = 0; i < poolDays; i++) {
    const date = addDays(today, -i)
    for (const f of entries[date]?.foods ?? []) {
      const cls = classifyFood(f)
      if (i < days && (!isAggregate(f) || f.name?.startsWith('간편:'))) {
        counts[cls]++
        if (cls !== 'neutral' && !isAggregate(f)) named[cls].set(f.name, (named[cls].get(f.name) ?? 0) + 1)
      }
      if (isAggregate(f) || !f.name) continue
      const kcal = Math.round(Math.min(1600, Math.max(60, Number(f.kcal) || 0)))
      if (!pool.has(f.name) || pool.get(f.name).kcal < kcal) {
        pool.set(f.name, { name: f.name, emoji: emojiFor(f.name), kcal, cls, kind: cls === 'healthy' ? 'healthy' : 'junk', mine: true })
      }
    }
  }

  const total = counts.healthy + counts.harmful + counts.neutral
  const score = total ? (counts.healthy - counts.harmful) / total : 0
  const tier = total ? DIET_TIERS.find((t) => score >= t.min) : NONE_TIER
  const top = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n)
  return {
    tier,
    score,
    counts,
    effects: tier.fx,
    pool: [...pool.values()],
    top: { healthy: top(named.healthy), harmful: top(named.harmful) },
  }
}

// ── 실제 운동량 → 공격력 ─────────────────────────
// 최근 7일 운동 순소모 kcal이 많을수록 화살이 강해진다 (근력·심폐 단련).
export const TRAINING_TIERS = [
  { min: 5000, label: '🏆 철인', dmgMult: 1.35, cdMult: 0.85, desc: '화살 +35% · 재장전 −15%' },
  { min: 3000, label: '💪 단련됨', dmgMult: 1.25, cdMult: 0.9, desc: '화살 +25% · 재장전 −10%' },
  { min: 1500, label: '🏃 활동적', dmgMult: 1.15, cdMult: 1, desc: '화살 +15%' },
  { min: 500, label: '🚶 몸풀기', dmgMult: 1.05, cdMult: 1, desc: '화살 +5%' },
  { min: 0, label: '🛋️ 운동 부족', dmgMult: 1, cdMult: 1, desc: '보너스 없음 — 운동을 기록하면 화살이 강해집니다' },
]

export function trainingCondition(entries, today, weightKg, profile, days = 7) {
  let kcal = 0
  let sessions = 0
  for (let i = 0; i < days; i++) {
    for (const x of entries[addDays(today, -i)]?.exercises ?? []) {
      kcal += exerciseKcal(x, weightKg, profile)
      sessions++
    }
  }
  const tier = TRAINING_TIERS.find((t) => kcal >= t.min)
  const next = [...TRAINING_TIERS].reverse().find((t) => t.min > kcal) ?? null
  return { kcal: Math.round(kcal), sessions, tier, next }
}

/** 식단 효과 × 운동 효과 → 최종 게임 효과 */
export function combineEffects(diet, training) {
  return {
    ...diet.effects,
    dmgMult: diet.effects.dmgMult * training.tier.dmgMult,
    cdMult: diet.effects.cdMult * training.tier.cdMult,
  }
}

/** 게임 점수 → 보너스 XP (판당 최대 20) */
export const gameXp = (score) => Math.min(20, Math.floor(score / 150))
