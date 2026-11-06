// 히스토리 집계: 월별 요약
import { mean, sum } from './stats.js'

/**
 * series(analyze 결과의 일별 행) → 월별 요약
 * change: 그 달 마지막 추세 − 직전 달 마지막 추세(첫 달은 그 달 첫 추세)
 */
export function monthlySummary(series) {
  const months = new Map()
  for (const r of series) {
    const key = r.date.slice(0, 7)
    if (!months.has(key)) months.set(key, [])
    months.get(key).push(r)
  }
  const out = []
  let prevEnd = null
  for (const [month, rows] of months) {
    const trends = rows.filter((r) => r.trend != null)
    const start = prevEnd ?? trends[0]?.trend ?? null
    const end = trends.at(-1)?.trend ?? null
    const logged = rows.filter((r) => r.intake != null)
    const balances = rows.filter((r) => r.balance != null).map((r) => r.balance)
    out.push({
      month,
      days: rows.length,
      loggedDays: logged.length,
      weighIns: rows.filter((r) => r.weight != null).length,
      startTrend: start,
      endTrend: end,
      change: start != null && end != null ? end - start : null,
      avgIntake: mean(logged.map((r) => r.intake)),
      avgExercise: mean(rows.map((r) => r.exercise)),
      avgExpend: mean(rows.map((r) => r.expend).filter((v) => v != null)),
      avgBalance: mean(balances),
      totalBalance: sum(balances),
    })
    if (end != null) prevEnd = end
  }
  return out
}
