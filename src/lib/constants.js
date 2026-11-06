// 물리·생리 상수와 알고리즘 파라미터. 모든 "매직 넘버"는 여기에만 둔다.

/** 체지방 1kg ≈ 7,700 kcal */
export const KCAL_PER_KG = 7700

/** 체중 추세 Holt 평활 계수: α 수준(작을수록 매끈), β 기울기 */
export const TREND_ALPHA = 0.12
export const TREND_BETA = 0.06
/** 추세 기울기 상한 (kg/일). 생리적으로 지방은 하루 0.3kg 이상 변하기 어렵다 */
export const MAX_TREND_SLOPE = 0.3

/** 실측 소모량 역산/감량 속도 계산 창 (일) */
export const WINDOW_DAYS = 14

/** 감량 속도 계산 최소 조건: 체중 측정 횟수, 첫~마지막 측정 간격(일) */
export const MIN_RATE_WEIGH_INS = 3
export const MIN_RATE_SPAN_DAYS = 4

/** 실측 TDEE 역산 최소 조건 */
export const MIN_OBS_WEIGH_INS = 5
export const MIN_OBS_SPAN_DAYS = 7
export const MIN_OBS_INTAKE_DAYS = 7

/** 섭취 기록일이 이 값에 도달하면 실측값을 100% 신뢰 */
export const FULL_TRUST_DAYS = 21

/** 실측 기저소모량은 공식값 대비 이 범위로 제한 (이상치 방어) */
export const OBS_CLAMP = [0.7, 1.3]

/** 예측 시뮬레이션 최대 일수 (3년) */
export const MAX_PROJECTION_DAYS = 1095

/** 안전 지표 */
export const SAFE_LOSS_PCT_PER_WEEK = 1.0
export const MIN_SAFE_INTAKE = { M: 1500, F: 1200 }

/** 운동을 제외한 일상 활동계수 (운동은 따로 더한다 → 이중계산 방지) */
export const ACTIVITY_LEVELS = [
  { value: 1.2, label: '좌식', desc: '사무직, 하루 대부분 앉아 있음' },
  { value: 1.375, label: '가벼움', desc: '서서 일하거나 하루 7천 보 이상' },
  { value: 1.55, label: '활동적', desc: '하루 종일 움직이는 일' },
  { value: 1.725, label: '매우 활동적', desc: '육체노동' },
]
