// 게임화: 결과(체중)가 아니라 결과를 만드는 "행동"에 보상한다.
// - 측정·기록 = 피드백 루프 유지 → 가장 큰 보상
// - 건강한 범위의 적자만 보상 (굶기·과속 감량은 보상하지 않음)
// 모든 값은 원본 기록에서 다시 계산 (저장하지 않음).

import { KCAL_PER_KG, MIN_SAFE_INTAKE } from './constants.js'
import { addDays } from './dates.js'
import { HONEST_XP_MULT, ledgerAccuracy } from './honesty.js'

export const XP = {
  weigh: 10,
  intake: 20,
  exercisePer10kcal: 1,
  exerciseMax: 60,
  healthyBalance: 30,
  perfectDay: 15,
}

/** 건강한 밸런스 범위 (감량: −1000~−100, 증량: +100~+600) */
export function isHealthyBalance(balance, intake, losing, sex) {
  if (balance == null || intake == null) return false
  if (losing) return balance <= -100 && balance >= -1000 && intake >= (MIN_SAFE_INTAKE[sex] ?? 1200)
  return balance >= 100 && balance <= 600
}

export function dayXp(row, losing, sex) {
  const weighed = row.weight != null
  const logged = row.intake != null
  const exXp = Math.min(XP.exerciseMax, Math.floor(row.exercise / 10) * XP.exercisePer10kcal)
  const healthy = isHealthyBalance(row.balance, row.intake, losing, sex)
  let xp = (weighed ? XP.weigh : 0) + (logged ? XP.intake : 0) + exXp + (healthy ? XP.healthyBalance : 0)
  if (weighed && logged && row.exercise > 0) xp += XP.perfectDay
  return xp
}

/** 레벨 L에 필요한 누적 XP = 50·L·(L−1) → 2레벨 100, 3레벨 300, 5레벨 1000 */
export const xpForLevel = (L) => 50 * L * (L - 1)
export function levelOf(xp) {
  let L = 1
  while (xpForLevel(L + 1) <= xp) L++
  return { level: L, cur: xp - xpForLevel(L), need: xpForLevel(L + 1) - xpForLevel(L) }
}

const TITLES = [
  [1, '불씨'],
  [3, '기록자'],
  [5, '연소가'],
  [8, '엔진'],
  [12, '용광로'],
  [16, '핵융합로'],
  [20, '항성'],
]
export const titleOf = (level) => TITLES.filter(([l]) => level >= l).at(-1)[1]

const active = (row) => row.weight != null || row.intake != null

/** 실패하지 않는 설계: 이틀까지 쉬어도 스트릭은 끊기지 않는다 (사흘 연속 공백이면 끊김) */
export const STREAK_GRACE_DAYS = 2

/** 유예를 반영한 스트릭 진행: 기록한 날 수를 센다 */
function streakRuns(series) {
  let run = 0
  let gap = 0
  const out = []
  for (const r of series) {
    if (active(r)) {
      run++
      gap = 0
    } else if (++gap > STREAK_GRACE_DAYS) {
      run = 0
    }
    out.push(run)
  }
  return out
}

/** 현재 스트릭 (기록한 날 수, 쉰 날은 세지 않지만 이틀까지는 끊지 않음) */
export function streaks(series) {
  const runs = streakRuns(series)
  const best = Math.max(0, ...runs)
  const current = runs.at(-1) ?? 0
  let idle = 0 // 마지막 기록 이후 쉰 날 (오늘 포함)
  for (let i = series.length - 1; i >= 0 && !active(series[i]); i--) idle++
  return {
    current,
    best,
    todayDone: series.length > 0 && active(series.at(-1)),
    idleDays: idle,
    graceLeft: Math.max(0, STREAK_GRACE_DAYS - idle),
  }
}

/** 마지막 기록일 (오늘 제외) — 복귀 환영 메시지용 */
export function lastActiveBefore(series, today) {
  for (let i = series.length - 1; i >= 0; i--) if (series[i].date < today && active(series[i])) return series[i]
  return null
}

export function dailyQuests(todayRow, losing, sex) {
  return [
    { id: 'weigh', label: '아침 체중 기록', done: todayRow.weight != null, xp: XP.weigh },
    { id: 'intake', label: '섭취 kcal 기록', done: todayRow.intake != null, xp: XP.intake },
    { id: 'move', label: '운동 100 kcal 이상', done: todayRow.exercise >= 100, xp: 10 },
    {
      id: 'balance',
      label: losing ? '건강한 적자 (−100 ~ −1000)' : '건강한 흑자 (+100 ~ +600)',
      done: isHealthyBalance(todayRow.balance, todayRow.intake, losing, sex),
      xp: XP.healthyBalance,
    },
  ]
}

/** 업적: 기록을 날짜순으로 훑으며 처음 조건을 만족한 날짜를 기록 */
export const ACHIEVEMENTS = [
  { id: 'first', icon: '🔥', title: '점화', desc: '첫 기록' },
  { id: 'streak7', icon: '📅', title: '일주일의 불꽃', desc: '7일 연속 기록' },
  { id: 'streak30', icon: '🗓️', title: '꺼지지 않는 불', desc: '30일 연속 기록' },
  { id: 'fat1', icon: '🧈', title: '지방 1kg 소각', desc: '누적 적자 7,700 kcal' },
  { id: 'fat5', icon: '🏭', title: '소각로', desc: '누적 적자 38,500 kcal (지방 5kg)' },
  { id: 'trend1', icon: '📉', title: '진짜 변화', desc: '추세 체중 1kg 변화' },
  { id: 'half', icon: '🌓', title: '반환점', desc: '목표까지 50% 도달' },
  { id: 'goal', icon: '🏆', title: '목표 달성', desc: '추세 체중이 목표 도달' },
  { id: 'marathon', icon: '🏃', title: '마라토너', desc: '러닝 누적 42.195 km' },
  { id: 'everest', icon: '🏔️', title: '에베레스트', desc: '등산 누적 상승고도 8,848 m' },
  { id: 'seal', icon: '🦭', title: '물개', desc: '수영 누적 10시간' },
  { id: 'calibrated', icon: '🎯', title: '정밀 측정기', desc: '섭취 21일 기록 → 실측 보정 100%' },
  { id: 'defense', icon: '🏹', title: '칼로리 디펜더', desc: '칼로리 디펜스 3,000점' },
  { id: 'honest', icon: '🧾', title: '정직한 장부', desc: '기록이 2주 뒤 체중을 70% 이상 정확히 예측' },
]

export function achievementDates(state, analysis) {
  const { series, startWeight, goal } = analysis
  const losing = goal < startWeight
  const got = {}
  const hit = (id, date) => {
    if (!got[id]) got[id] = date
  }
  let run = 0
  let gap = 0
  let deficit = 0
  let runKm = 0
  let climbM = 0
  let swimMin = 0
  let loggedDays = 0
  const startTrend = series.find((r) => r.trend != null)?.trend

  for (const r of series) {
    const e = state.entries[r.date]
    if (active(r)) {
      run++
      gap = 0
    } else if (++gap > STREAK_GRACE_DAYS) {
      run = 0
    }
    if (active(r)) hit('first', r.date)
    if (run >= 7) hit('streak7', r.date)
    if (run >= 30) hit('streak30', r.date)

    if (r.balance != null) deficit += losing ? -r.balance : r.balance
    if (deficit >= KCAL_PER_KG) hit('fat1', r.date)
    if (deficit >= KCAL_PER_KG * 5) hit('fat5', r.date)

    if (r.trend != null && startTrend != null) {
      const moved = losing ? startTrend - r.trend : r.trend - startTrend
      if (moved >= 1) hit('trend1', r.date)
      const total = Math.abs(startWeight - goal)
      if (total > 0 && moved >= total / 2) hit('half', r.date)
      if (losing ? r.trend <= goal : r.trend >= goal) hit('goal', r.date)
    }

    for (const x of e?.exercises ?? []) {
      if (x.type === 'run') runKm += Number(x.distanceKm) || 0
      if (x.type === 'hike') climbM += Number(x.elevationM) || 0
      if (x.type === 'swim') swimMin += Number(x.minutes) || 0
    }
    if (runKm >= 42.195) hit('marathon', r.date)
    if (climbM >= 8848) hit('everest', r.date)
    if (swimMin >= 600) hit('seal', r.date)

    if (r.intake != null) loggedDays++
    if (loggedDays >= 21) hit('calibrated', r.date)
  }
  if ((state.game?.best ?? 0) >= 3000) got.defense = state.game.bestDate ?? analysis.today
  return { got, progress: { runKm, climbM, swimMin, deficit, loggedDays, run } }
}

/**
 * 정직한 장부 이력: 7일마다 "지난 14일 기록이 체중을 예측했는가"를 검증.
 * 통과한 주의 XP에는 ×1.2 보너스.
 */
export function honestyHistory(state, analysis) {
  const series = analysis.series
  const first = series[0]?.date
  if (!first) return { checks: [], firstHonest: null, current: null }
  const checks = []
  const cache = new Map([[analysis.today, analysis]]) // 검증 시점끼리 겹치는 분석 재사용
  for (let d = addDays(first, 28); d <= analysis.today; d = addDays(d, 7)) {
    const r = ledgerAccuracy(state, d, cache)
    if (r) checks.push({ date: d, ...r })
  }
  const current = ledgerAccuracy(state, analysis.today, cache)
  return { checks, firstHonest: checks.find((c) => c.honest)?.date ?? (current?.honest ? analysis.today : null), current }
}

export function gamify(state, analysis) {
  const losing = analysis.goal < analysis.startWeight
  const sex = state.profile.sex
  const xpByDate = new Map(analysis.series.map((r) => [r.date, dayXp(r, losing, sex)]))
  const baseXp = [...xpByDate.values()].reduce((s, v) => s + v, 0)

  // 정직한 장부 보너스: 통과한 검증 시점 직전 7일의 XP × 0.2
  const honesty = honestyHistory(state, analysis)
  let honestBonus = 0
  for (const c of honesty.checks) {
    if (!c.honest) continue
    for (let i = 0; i < 7; i++) honestBonus += (xpByDate.get(addDays(c.date, -i)) ?? 0) * (HONEST_XP_MULT - 1)
  }
  const totalXp = Math.round(baseXp + honestBonus) + (state.game?.xp ?? 0)
  const lv = levelOf(totalXp)
  const honestNow = !!honesty.current?.honest
  const todayBase = dayXp(analysis.todayRow, losing, sex)
  const achievements = achievementDates(state, analysis)
  if (honesty.firstHonest) achievements.got.honest = honesty.firstHonest

  return {
    xp: totalXp,
    ...lv,
    title: titleOf(lv.level),
    todayXp: Math.round(todayBase * (honestNow ? HONEST_XP_MULT : 1)),
    honesty: { ...honesty.current, honestNow, bonusXp: Math.round(honestBonus), mult: HONEST_XP_MULT },
    streak: streaks(analysis.series),
    quests: dailyQuests(analysis.todayRow, losing, sex),
    achievements,
    yesterday: addDays(analysis.today, -1),
  }
}
