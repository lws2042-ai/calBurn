/** Mifflin-St Jeor 기초대사량 (kcal/일) */
export function bmr({ sex, weightKg, heightCm, age }) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return sex === 'F' ? base - 161 : base + 5
}

/** 출생연도 기준 나이 (해당 날짜의 연도 − 출생연도) */
export function ageAt(birthYear, isoDate) {
  return Number(isoDate.slice(0, 4)) - birthYear
}
