// BMI와 비만도 분류 (대한비만학회 2022 기준, 아시아인 기준치)

export function bmi(weightKg, heightCm) {
  const m = heightCm / 100
  return weightKg / (m * m)
}

export const BMI_CLASSES = [
  { max: 18.5, key: 'under', label: '저체중', tone: 'info' },
  { max: 23, key: 'normal', label: '정상', tone: 'good' },
  { max: 25, key: 'pre', label: '비만 전단계', tone: 'warn' },
  { max: 30, key: 'ob1', label: '1단계 비만', tone: 'warn' },
  { max: 35, key: 'ob2', label: '2단계 비만', tone: 'bad' },
  { max: Infinity, key: 'ob3', label: '3단계 비만', tone: 'bad' },
]

export function bmiClass(value) {
  return BMI_CLASSES.find((c) => value < c.max)
}

/** 정상 BMI(18.5 ~ 22.9)에 해당하는 체중 범위 */
export function healthyWeightRange(heightCm) {
  const m2 = (heightCm / 100) ** 2
  return { min: 18.5 * m2, max: 22.9 * m2 }
}

/** 캐릭터 체형 계수 0(마름) ~ 1(고도비만). BMI 17 → 0, BMI 38 → 1 */
export function bodyFactor(value) {
  return Math.min(1, Math.max(0, (value - 17) / (38 - 17)))
}
