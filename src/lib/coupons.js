// 칼로리 쿠폰: 지난 한 주 목표 적자를 "안전하게" 달성하면 +500 kcal 쿠폰.
// 에너지는 누적으로 작동하므로 아낀 만큼 쓸 수 있다 → 금지 대신 "계획된 즐거움"(요요·폭식 방지).

import { MIN_SAFE_INTAKE } from './constants.js'
import { addDays } from './dates.js'
import { DEFAULT_DEFICIT, weekStart } from './budget.js'
import { mean } from './stats.js'

export const COUPON_KCAL = 500
export const COUPON_VALID_DAYS = 14
export const COUPON_MIN_LOGGED = 5
export const COUPON_TARGET_SHARE = 0.7 // 목표 적자의 70% 이상
export const COUPON_MAX_DEFICIT = 1000 // 이보다 과한 적자(굶기)는 보상하지 않음

/** 완료된 주마다 쿠폰 획득 여부 판정 */
export function earnedCoupons(series, { today, deficit = DEFAULT_DEFICIT, sex = 'M' }) {
  const first = series[0]?.date
  if (!first) return []
  const byDate = new Map(series.map((r) => [r.date, r]))
  const floor = MIN_SAFE_INTAKE[sex] ?? 1200
  const out = []
  for (let ws = weekStart(first); addDays(ws, 6) < today; ws = addDays(ws, 7)) {
    const logged = []
    for (let i = 0; i < 7; i++) {
      const r = byDate.get(addDays(ws, i))
      if (r?.balance != null) logged.push(r)
    }
    if (logged.length < COUPON_MIN_LOGGED) continue
    const meanBal = mean(logged.map((r) => r.balance))
    const meanIntake = mean(logged.map((r) => r.intake))
    const ok = meanBal <= -deficit * COUPON_TARGET_SHARE && meanBal >= -COUPON_MAX_DEFICIT && meanIntake >= floor
    if (!ok) continue
    const earned = addDays(ws, 7)
    out.push({ id: `c${ws}`, week: ws, earned, expires: addDays(earned, COUPON_VALID_DAYS - 1), kcal: COUPON_KCAL, meanBal })
  }
  return out
}

/** 지금 쓸 수 있는 쿠폰 (만료 임박 순) */
export function availableCoupons(coupons, used = {}, today) {
  return coupons.filter((c) => !used[c.id] && c.earned <= today && c.expires >= today).sort((a, b) => (a.expires < b.expires ? -1 : 1))
}
