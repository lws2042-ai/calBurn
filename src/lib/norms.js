// 또래 비교: 국민건강보험공단 건강검진정보 2023 (100만 명 표본)으로 만든
// 성별 × 5세 연령대별 BMI·허리둘레 백분위표(src/data/bmiNorms.json)를 사용한다.
import NORMS from '../data/bmiNorms.json' with { type: 'json' }

/** 나이 → 연령대 코드 (5 = 20~24세 … 18 = 85세+) */
export function ageCode(age) {
  return Math.max(5, Math.min(18, Math.floor(age / 5) + 1))
}

export function ageLabel(code) {
  if (code >= 18) return '85세 이상'
  const lo = (code - 1) * 5
  return `${lo}~${lo + 4}세`
}

/** 값이 분포의 몇 백분위인지 (0~100, 백분위표 사이는 선형 보간) */
export function percentileOf(value, q) {
  if (value <= q[0]) return 0
  if (value >= q[100]) return 100
  let lo = 0
  while (lo < 100 && q[lo + 1] <= value) lo++
  const a = q[lo]
  const b = q[lo + 1]
  // 같은 값이 여러 백분위에 걸쳐 있으면(구간화 데이터) 그 범위의 가운데
  let hi = lo
  while (hi < 100 && q[hi + 1] === a) hi++
  if (b === a || hi > lo) return (lo + hi) / 2
  return lo + (value - a) / (b - a)
}

/**
 * @returns { label, n, median, obeseRate, pct(bmi), source } | null
 * pct = 또래 중 나보다 BMI가 낮은 사람의 비율(%)
 */
export function peerNorm(sex, age, norms = NORMS) {
  const code = ageCode(age)
  const g = norms.groups[`${sex === 'F' ? 2 : 1}-${code}`]
  if (!g) return null
  return {
    label: `${ageLabel(code)} ${sex === 'F' ? '여성' : '남성'}`,
    n: g.n,
    median: g.bmi[50],
    obeseRate: g.obeseRate,
    pctOf: (bmi) => percentileOf(bmi, g.bmi),
    bmiAt: (pct) => g.bmi[Math.max(0, Math.min(100, Math.round(pct)))],
    source: norms.source,
  }
}
