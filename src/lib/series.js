import { MAX_TREND_SLOPE, TREND_ALPHA, TREND_BETA } from './constants.js'
import { dateRange } from './dates.js'
import { exerciseKcal } from './exercise.js'

const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

/** 섭취 kcal. 음식 기록이 하나도 없으면 null (= 미기록, 0과 다름!) */
export function intakeOf(entry) {
  if (!entry?.foods?.length) return null
  return entry.foods.reduce((s, f) => s + (Number(f.kcal) || 0), 0)
}

export function firstDate(state, today) {
  let first = state.profile?.startDate ?? today
  for (const d of Object.keys(state.entries)) if (d < first) first = d
  return first > today ? today : first
}

/**
 * 원본 기록 → 날짜별 연속 시계열.
 * trend: Holt 이중 지수평활 (수준 L + 기울기 b).
 *   단순 지수평균은 감량 중 ~9일 늦게 따라와 현재 체중을 과대평가한다(지연 편향).
 *   기울기를 함께 추정하면 지연 없이 노이즈만 걸러낸다.
 *   측정 공백 g일: 예측 = L + b·g 에 대해 갱신. 미측정일은 L + b·(경과일)로 이어간다.
 */
export function buildSeries(state, today) {
  const { profile, entries } = state
  const rows = []
  let level = null
  let slope = 0
  let lastWeighIdx = null
  let trend = null

  dateRange(firstDate(state, today), today).forEach((date, i) => {
    const e = entries[date]
    const weight = isNum(e?.weightKg) ? e.weightKg : null
    if (weight != null) {
      if (level == null) level = weight
      else {
        const g = i - lastWeighIdx
        const a = 1 - (1 - TREND_ALPHA) ** g
        const forecast = level + slope * g
        const next = forecast + a * (weight - forecast)
        slope += TREND_BETA * ((next - level) / g - slope)
        slope = Math.max(-MAX_TREND_SLOPE, Math.min(MAX_TREND_SLOPE, slope))
        level = next
      }
      lastWeighIdx = i
      trend = level
    } else if (level != null) {
      trend = level + slope * (i - lastWeighIdx)
    }
    const refWeight = trend ?? profile.startWeightKg
    const exercise = (e?.exercises ?? []).reduce((s, x) => s + exerciseKcal(x, refWeight, profile), 0)
    rows.push({ date, weight, trend, intake: intakeOf(e), exercise })
  })
  return rows
}
