// 먹기 "전" 의사결정 피드백: 이 음식의 비용을 운동·지방·목표일·내일 수분으로 환산한다.
// 제1원칙: 행동을 바꾸는 피드백은 결정하는 순간에 있어야 한다 (먹은 뒤 기록은 이미 늦다).

import { KCAL_PER_KG } from './constants.js'
import { GLYCOGEN_STORE_FRACTION, GLYCOGEN_WATER_RATIO, NA_G_PER_L, NA_RETAIN_NEXT_MORNING } from './water.js'

/** 기록 화면의 날짜 행 + 분석 결과 → 결정에 필요한 맥락 */
export function decisionContext(analysis, row) {
  const plan = analysis.plan
  return {
    weightKg: row?.trend ?? analysis.current,
    intake: row?.intake ?? null,
    expend: row?.expend ?? analysis.base,
    losing: analysis.goal < analysis.current,
    // 현재 습관 기준 하루 평균 적자 (kcal, +면 감량 중)
    dailyDeficit: plan ? analysis.base + plan.exercise - plan.intake : null,
    etaDays: analysis.model?.status === 'ok' ? analysis.model.days : null,
  }
}

/**
 * @param food { kcal, sodiumMg?, carbsG? }  섭취량 기준 값
 */
export function impactOf(food, ctx) {
  const kcal = food.kcal
  const w = ctx.weightKg
  const before = ctx.intake == null ? null : ctx.intake - ctx.expend
  const after = (ctx.intake ?? 0) + kcal - ctx.expend
  const delayDays = ctx.losing && ctx.dailyDeficit > 50 ? kcal / ctx.dailyDeficit : null

  // 내일 아침 수분 (한계 효과: 이 음식만큼 더해지는 양)
  const naKg = food.sodiumMg != null ? (food.sodiumMg / 1000 / NA_G_PER_L) * NA_RETAIN_NEXT_MORNING : null
  const carbKg = food.carbsG != null ? (food.carbsG * GLYCOGEN_STORE_FRACTION * (1 + GLYCOGEN_WATER_RATIO)) / 1000 : null

  return {
    kcal,
    runKm: kcal / (0.95 * w),
    walkKm: kcal / (0.5 * w),
    fatG: (kcal / KCAL_PER_KG) * 1000,
    delayDays,
    etaBefore: ctx.etaDays,
    etaAfter: ctx.etaDays != null && delayDays != null ? ctx.etaDays + delayDays : null,
    balanceBefore: before,
    balanceAfter: after,
    flipsToSurplus: ctx.losing && after > 0 && (before == null || before <= 0),
    waterKg: naKg == null && carbKg == null ? null : (naKg ?? 0) + (carbKg ?? 0),
    naKg,
    carbKg,
  }
}
