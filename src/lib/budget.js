// 주간 칼로리 예산.
// 하루 단위로만 보면 회식 날이 곧 "실패"가 된다. 에너지 보존은 하루가 아니라 누적으로 작동하므로
// 주 단위 예산으로 보고, 미리 등록한 회식·외식의 초과분을 남은 날들이 나눠서 흡수한다.

import { MIN_SAFE_INTAKE } from './constants.js'
import { addDays, diffDays, parseISO } from './dates.js'

export const DEFICIT_OPTIONS = [300, 500, 750]
export const DEFAULT_DEFICIT = 500
export const EVENT_PRESETS = [
  { label: '회식', extraKcal: 1200 },
  { label: '외식', extraKcal: 700 },
  { label: '뒷풀이', extraKcal: 1000 },
  { label: '생일·모임', extraKcal: 900 },
  { label: '여행', extraKcal: 800 },
]

/** 그 주 월요일 */
export function weekStart(date) {
  const dow = (parseISO(date).getDay() + 6) % 7 // 월=0 … 일=6
  return addDays(date, -dow)
}

/**
 * @param maintenance  하루 유지 칼로리 (기저 + 평균 운동)
 * @param deficit      하루 목표 적자
 * @param intakeOf     date → 기록된 섭취 kcal | null
 * @param plans        { [date]: { label, extraKcal } }
 */
export function weeklyBudget({ today, maintenance, deficit = DEFAULT_DEFICIT, intakeOf, plans = {}, sex = 'M' }) {
  const start = weekStart(today)
  const target = maintenance - deficit // 평범한 하루 목표
  const floor = MIN_SAFE_INTAKE[sex] ?? 1200
  const weekBudget = target * 7

  const days = []
  let spent = 0
  for (let i = 0; i < 7; i++) {
    const date = addDays(start, i)
    const past = date < today
    const intake = intakeOf(date)
    const plan = plans[date] ?? null
    days.push({ date, past, isToday: date === today, intake, plan })
    // 지난 날: 기록이 있으면 실제, 없으면 계획대로 먹었다고 가정
    if (past) spent += intake ?? target + (plan?.extraKcal ?? 0)
  }

  const future = days.filter((d) => !d.past) // 오늘 포함
  const eventBudgets = future.filter((d) => d.plan).reduce((s, d) => s + target + d.plan.extraKcal, 0)
  const normalDays = future.filter((d) => !d.plan).length
  const remaining = weekBudget - spent
  let normalBudget = normalDays ? (remaining - eventBudgets) / normalDays : 0
  const floorHit = normalDays > 0 && normalBudget < floor
  if (floorHit) normalBudget = floor

  for (const d of days) {
    if (d.past) d.budget = target + (d.plan?.extraKcal ?? 0)
    else d.budget = d.plan ? target + d.plan.extraKcal : normalBudget
    d.left = d.intake != null ? d.budget - d.intake : d.budget
  }

  // 등록된 이벤트로 평범한 날이 하루 얼마나 줄었는지
  const eventExtra = future.filter((d) => d.plan).reduce((s, d) => s + d.plan.extraKcal, 0)
  const pastOver = spent - days.filter((d) => d.past).reduce((s, d) => s + target + (d.plan?.extraKcal ?? 0), 0)

  return {
    start,
    end: addDays(start, 6),
    target,
    weekBudget,
    spent,
    remaining,
    normalBudget,
    floor,
    floorHit,
    eventExtra,
    pastOver, // 지난 날 초과(+)/절약(−) 합
    days,
    today: days.find((d) => d.isToday),
    daysLeft: diffDays(today, addDays(start, 6)) + 1,
  }
}
