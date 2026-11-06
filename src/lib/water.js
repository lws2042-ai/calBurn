// 나트륨·탄수화물 → 다음 날 아침 수분 변화 예측.
//
// 제1원칙:
//  · 나트륨: 몸은 세포외액 나트륨 농도(~140 mmol/L ≈ 3.22 g/L)를 일정하게 유지한다.
//    평소보다 더 먹은 나트륨 1g은 물 약 0.31L를 붙잡는다. 신장이 1~3일에 걸쳐 배출하므로
//    다음 날 아침에는 일부(≈60%)만 남는다고 본다.
//  · 탄수화물: 글리코겐 1g은 물 약 3g과 함께 저장된다. 평소보다 더 먹은 탄수화물의
//    절반 정도가 글리코겐으로 채워진다고 보고, 저장량은 ±400g으로 제한한다.
//  · 기준선은 "나의 평소"(직전 7일 평균). 데이터가 부족하면 한국인 평균 섭취량을 쓴다.
// 모두 근사치이므로 결과는 범위(±40%)로 표시한다.

import { addDays } from './dates.js'

export const NA_G_PER_L = 3.22
export const NA_RETAIN_NEXT_MORNING = 0.6
export const GLYCOGEN_STORE_FRACTION = 0.5
export const GLYCOGEN_WATER_RATIO = 3
export const GLYCOGEN_MAX_SWING_G = 400
export const DEFAULT_BASELINE = { sodiumMg: 3200, carbsG: 280 }
export const BASELINE_DAYS = 7
const MIN_COVERAGE = 0.6

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** 하루 나트륨·탄수화물 합계와 데이터 충분도(나트륨 정보가 있는 음식의 kcal 비율) */
export function dayNutrients(entry) {
  const foods = entry?.foods ?? []
  let kcal = 0
  let kcalWithNa = 0
  let sodiumMg = 0
  let carbsG = 0
  let hasCarbs = false
  for (const f of foods) {
    const k = Number(f.kcal) || 0
    kcal += k
    if (num(f.sodiumMg) != null) {
      sodiumMg += f.sodiumMg
      kcalWithNa += k
    }
    if (num(f.carbsG) != null) {
      carbsG += f.carbsG
      hasCarbs = true
    }
  }
  if (!foods.length) return null
  return {
    sodiumMg,
    carbsG: hasCarbs ? carbsG : null,
    coverage: kcal > 0 ? kcalWithNa / kcal : 0,
  }
}

/** date 이전 7일 중 데이터가 충분한 날의 평균. 부족하면 기본값 */
export function baselineFor(entries, date) {
  const na = []
  const carbs = []
  for (let i = 1; i <= BASELINE_DAYS; i++) {
    const n = dayNutrients(entries[addDays(date, -i)])
    if (!n || n.coverage < MIN_COVERAGE) continue
    na.push(n.sodiumMg)
    if (n.carbsG != null) carbs.push(n.carbsG)
  }
  const avg = (a) => a.reduce((s, v) => s + v, 0) / a.length
  return {
    sodiumMg: na.length >= 3 ? avg(na) : DEFAULT_BASELINE.sodiumMg,
    carbsG: carbs.length >= 3 ? avg(carbs) : DEFAULT_BASELINE.carbsG,
    personal: na.length >= 3,
  }
}

/** 하루 섭취 → 다음 날 아침 수분 변화 (kg, +는 증가) */
export function predictWater(nutrients, baseline) {
  if (!nutrients || nutrients.coverage < MIN_COVERAGE) return null
  const naExtraG = (nutrients.sodiumMg - baseline.sodiumMg) / 1000
  const naKg = (naExtraG / NA_G_PER_L) * NA_RETAIN_NEXT_MORNING
  let carbKg = 0
  if (nutrients.carbsG != null) {
    const glyG = Math.max(-GLYCOGEN_MAX_SWING_G, Math.min(GLYCOGEN_MAX_SWING_G, (nutrients.carbsG - baseline.carbsG) * GLYCOGEN_STORE_FRACTION))
    carbKg = (glyG * (1 + GLYCOGEN_WATER_RATIO)) / 1000
  }
  const total = naKg + carbKg
  const spread = Math.max(0.1, Math.abs(total) * 0.4)
  return {
    naKg,
    carbKg,
    total,
    low: total - spread,
    high: total + spread,
    naExtraMg: nutrients.sodiumMg - baseline.sodiumMg,
    carbExtraG: nutrients.carbsG != null ? nutrients.carbsG - baseline.carbsG : null,
  }
}

/** 특정 날짜 섭취 기준 "다음 날 아침" 예측 묶음 */
export function forecastFromDay(entries, date) {
  const nutrients = dayNutrients(entries[date])
  const baseline = baselineFor(entries, date)
  return { nutrients, baseline, water: predictWater(nutrients, baseline) }
}
