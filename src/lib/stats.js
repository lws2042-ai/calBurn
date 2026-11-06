export const sum = (arr) => arr.reduce((s, v) => s + v, 0)

export const mean = (arr) => (arr.length ? sum(arr) / arr.length : null)

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

/** 최소제곱 선형회귀. points: [{x, y}] → { slope, intercept } | null */
export function linearRegression(points) {
  const n = points.length
  if (n < 2) return null
  const mx = sum(points.map((p) => p.x)) / n
  const my = sum(points.map((p) => p.y)) / n
  let num = 0
  let den = 0
  for (const p of points) {
    num += (p.x - mx) * (p.y - my)
    den += (p.x - mx) ** 2
  }
  if (den === 0) return null
  const slope = num / den
  return { slope, intercept: my - slope * mx }
}
