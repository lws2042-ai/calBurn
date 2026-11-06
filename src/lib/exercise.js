// 운동 순(net) 소모 kcal.
// BMR에 안정 시 소모(1 MET)가 이미 포함되므로 "총소모 − 안정 시 소모"만 더한다.

export const INTENSITY = {
  swim: {
    light: { label: '여유', met: 6.0 },
    moderate: { label: '보통 (자유형)', met: 8.3 },
    vigorous: { label: '고강도', met: 10.0 },
  },
  cycle: {
    light: { label: '여유 (<16km/h)', met: 4.0 },
    moderate: { label: '보통 (19–22km/h)', met: 8.0 },
    vigorous: { label: '고강도 (>25km/h)', met: 10.0 },
  },
}

export const EXERCISE_TYPES = {
  run: { label: '러닝', hint: '거리 기반: 0.95 kcal × 체중 × km' },
  walk: { label: '걷기', hint: '거리 기반: 0.5 kcal × 체중 × km' },
  swim: { label: '수영', hint: '(MET − 1) × 체중 × 시간' },
  hike: { label: '등산', hint: '보행 + 상승고도 위치에너지 (효율 25%)' },
  cycle: { label: '자전거', hint: '(MET − 1) × 체중 × 시간' },
  manual: { label: '기타', hint: '워치 kcal × 보정계수 (과대추정 보정)' },
}

const RUN_NET_PER_KG_KM = 0.95
const WALK_NET_PER_KG_KM = 0.5
const RUN_FALLBACK_MET = 9.8 // 거리 없이 시간만 있을 때 (~10km/h)
const WALK_FALLBACK_MET = 3.5
const HIKE_BASE_MET = 3.5
/** 1kg을 1m 올리는 데 드는 대사 에너지: 9.81 J / 0.25 효율 / 4184 J/kcal */
const KCAL_PER_KG_PER_M_CLIMB = 9.81 / 0.25 / 4184

const num = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0)
const netMet = (met, kg, minutes) => Math.max(0, met - 1) * kg * (minutes / 60)

/**
 * @param ex       { type, distanceKm?, minutes?, intensity?, elevationM?, kcal? }
 * @param weightKg 그날의 (추세)체중
 * @param opts     { watchCorrection } 직접 입력 kcal 보정계수
 */
export function exerciseKcal(ex, weightKg, { watchCorrection = 0.8 } = {}) {
  const kg = num(weightKg)
  const km = num(ex.distanceKm)
  const min = num(ex.minutes)
  switch (ex.type) {
    case 'run':
      return km ? RUN_NET_PER_KG_KM * kg * km : netMet(RUN_FALLBACK_MET, kg, min)
    case 'walk':
      return km ? WALK_NET_PER_KG_KM * kg * km : netMet(WALK_FALLBACK_MET, kg, min)
    case 'swim':
    case 'cycle': {
      const met = INTENSITY[ex.type][ex.intensity]?.met ?? INTENSITY[ex.type].moderate.met
      return netMet(met, kg, min)
    }
    case 'hike':
      return netMet(HIKE_BASE_MET, kg, min) + kg * num(ex.elevationM) * KCAL_PER_KG_PER_M_CLIMB
    case 'manual':
      return num(ex.kcal) * watchCorrection
    default:
      return 0
  }
}

/** 기록 목록에 보여줄 한 줄 요약 */
export function describeExercise(ex) {
  const parts = []
  if (ex.distanceKm) parts.push(`${ex.distanceKm}km`)
  if (ex.minutes) parts.push(`${ex.minutes}분`)
  if (ex.elevationM) parts.push(`↑${ex.elevationM}m`)
  if (ex.intensity && INTENSITY[ex.type]) parts.push(INTENSITY[ex.type][ex.intensity]?.label)
  if (ex.type === 'manual') parts.push(`${ex.kcal} kcal 입력`)
  if (ex.note) parts.push(ex.note)
  return parts.filter(Boolean).join(' · ')
}
