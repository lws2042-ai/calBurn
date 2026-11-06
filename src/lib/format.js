const MINUS = '−'

export const fmtInt = (n) => Math.round(n).toLocaleString('ko-KR')

/** 부호 명시: +320 / −420 */
export function fmtSigned(n, digits = 0) {
  const v = digits ? Math.abs(n).toFixed(digits) : Math.abs(Math.round(n)).toLocaleString('ko-KR')
  if (Math.round(n * 10 ** digits) === 0) return digits ? (0).toFixed(digits) : '0'
  return (n < 0 ? MINUS : '+') + v
}

export const fmtKg = (n, digits = 1) => n.toFixed(digits)

/** kcal → 지방 g (부호 유지) */
export const kcalToFatG = (kcal) => (kcal / 7700) * 1000
