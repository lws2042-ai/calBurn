// 정직한 장부: "기록이 체중을 예측하는가?"를 표본 밖(out-of-sample)으로 검증한다.
//
// 같은 기간으로 비교하면 엔진이 그 기간 체중으로 소모량을 역산하므로 항상 맞는다(검증 불가).
// 그래서: [−28, −14] 기간까지로 알아낸 기저 소모량만 가지고, 이후 14일의 기록으로
// 체중 변화를 "미리" 예측 → 실제 추세 변화와 비교한다.
// 체중계는 속일 수 없으므로, 일관되게 기록해야만 예측이 맞는다 (굿하트의 법칙 방지).

import { KCAL_PER_KG } from './constants.js'
import { addDays } from './dates.js'
import { analyze } from './engine.js'

export const HONEST_WINDOW = 14
export const HONEST_MIN_LOGGED = 10 // 14일 중 최소 기록일
export const HONEST_MAX_ERR_KCAL = 300 // 하루 평균 오차 허용치 → 점수 0%
export const HONEST_PASS = 0.7 // 70% 이상이면 "정직한 장부"
export const HONEST_XP_MULT = 1.2

/**
 * @returns null (데이터 부족) | { score 0~1, honest, predictedKg, actualKg, errKcalPerDay, logged }
 */
export function ledgerAccuracy(state, today, cache = new Map()) {
  const at = (d) => {
    if (!cache.has(d)) cache.set(d, analyze(state, d))
    return cache.get(d)
  }
  const start = addDays(today, -HONEST_WINDOW)
  if (!state.profile) return null
  const prior = at(start) // 이 시점까지의 데이터만으로 학습한 기저 소모량
  if (!prior.observed) return null // 사전 학습이 안 됐으면 판단 보류

  const now = at(today)
  const rows = now.series.filter((r) => r.date > start && r.date <= today)
  const startRow = now.series.find((r) => r.date === start)
  const endRow = rows.at(-1)
  if (!startRow?.trend || !endRow?.trend) return null

  const logged = rows.filter((r) => r.intake != null)
  if (logged.length < HONEST_MIN_LOGGED) {
    return { score: 0, honest: false, logged: logged.length, reason: 'few-logs' }
  }

  // 사전 기저소모 + 그날 운동 → 그날 소모. 미기록일은 기록일 평균 섭취로 보간
  const meanIntake = logged.reduce((s, r) => s + r.intake, 0) / logged.length
  const baseAt = (w) => (prior.base * (10 * w + (prior.bmr - 10 * prior.current))) / prior.bmr
  let predictedKg = 0
  for (const r of rows) {
    const intake = r.intake ?? meanIntake
    predictedKg += (intake - (baseAt(r.trend ?? prior.current) + r.exercise)) / KCAL_PER_KG
  }
  const actualKg = endRow.trend - startRow.trend
  const errKcalPerDay = (Math.abs(predictedKg - actualKg) * KCAL_PER_KG) / rows.length
  const score = Math.max(0, Math.min(1, 1 - errKcalPerDay / HONEST_MAX_ERR_KCAL))
  return { score, honest: score >= HONEST_PASS, predictedKg, actualKg, errKcalPerDay, logged: logged.length }
}
