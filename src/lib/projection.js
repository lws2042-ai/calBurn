import { KCAL_PER_KG, MAX_PROJECTION_DAYS } from './constants.js'

/**
 * 현재 습관(섭취·운동)을 유지할 때 체중이 수렴하는 평형점.
 * 기저소모 baseAt(w)가 w에 대해 선형(BMR = 10w + k)이므로 해석적으로 풀린다:
 *   baseAt(w) + exercise = intake  →  w_eq
 * @param baseSlope  기저소모가 체중 1kg당 변하는 양 (kcal/kg)
 */
export function equilibriumWeight({ current, base, baseSlope, intake, exercise }) {
  if (!(baseSlope > 0)) return null
  return current + (intake - exercise - base) / baseSlope
}

/**
 * 하루 단위 시뮬레이션: w_{d+1} = w_d + (섭취 − (기저(w_d) + 운동)) / 7700
 * 체중이 변하면 기저소모도 변한다 → 단순 나눗셈보다 정확.
 *
 * status:
 *   'reached'  이미 목표 도달
 *   'ok'       days 후 도달
 *   'wrong'    현재 패턴은 목표 반대 방향
 *   'plateau'  목표 전에 평형체중(equilibrium)에서 멈춤
 *   'too-long' 3년 초과
 */
export function simulateToGoal({ start, goal, intake, exercise, baseAt, equilibrium, maxDays = MAX_PROJECTION_DAYS }) {
  const need = goal - start
  if (Math.abs(need) < 0.05) return { status: 'reached', days: 0, path: [{ day: 0, w: start }] }

  const firstDelta = (intake - (baseAt(start) + exercise)) / KCAL_PER_KG
  if (firstDelta * need <= 0) return { status: 'wrong', dailyDelta: firstDelta, path: [] }

  // 평형점이 목표에 못 미치면 영원히 도달 불가
  if (equilibrium != null && (need < 0 ? equilibrium > goal : equilibrium < goal)) {
    return { status: 'plateau', equilibrium, path: simulatePath(start, intake, exercise, baseAt, 180) }
  }

  let w = start
  const path = [{ day: 0, w }]
  for (let d = 1; d <= maxDays; d++) {
    w += (intake - (baseAt(w) + exercise)) / KCAL_PER_KG
    path.push({ day: d, w })
    if (need < 0 ? w <= goal : w >= goal) return { status: 'ok', days: d, path }
  }
  return { status: 'too-long', path }
}

function simulatePath(start, intake, exercise, baseAt, days) {
  let w = start
  const path = [{ day: 0, w }]
  for (let d = 1; d <= days; d++) {
    w += (intake - (baseAt(w) + exercise)) / KCAL_PER_KG
    path.push({ day: d, w })
  }
  return path
}

/** 실측 추세 기울기(kg/일)를 그대로 연장했을 때 도달 일수 */
export function trendEta({ current, goal, slope, maxDays = MAX_PROJECTION_DAYS }) {
  const need = goal - current
  if (Math.abs(need) < 0.05) return { status: 'reached', days: 0 }
  if (slope == null) return null
  if (slope * need <= 0) return { status: 'wrong' }
  const days = Math.ceil(need / slope)
  return days > maxDays ? { status: 'too-long' } : { status: 'ok', days }
}
