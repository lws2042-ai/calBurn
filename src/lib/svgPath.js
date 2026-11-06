// SVG 경로 헬퍼 (아바타 공용)

export const r1 = (v) => Math.round(v * 10) / 10

/** Catmull-Rom → 베지어: 점들을 자연스러운 곡선으로 */
export function smooth(pts, closed = true) {
  const n = pts.length
  const get = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))])
  let d = `M${r1(pts[0][0])},${r1(pts[0][1])}`
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const [p0, p1, p2, p3] = [get(i - 1), get(i), get(i + 1), get(i + 2)]
    d += `C${r1(p1[0] + (p2[0] - p0[0]) / 6)},${r1(p1[1] + (p2[1] - p0[1]) / 6)} ${r1(p2[0] - (p3[0] - p1[0]) / 6)},${r1(p2[1] - (p3[1] - p1[1]) / 6)} ${r1(p2[0])},${r1(p2[1])}`
  }
  return closed ? `${d}Z` : d
}

/** 머리 다발: 뿌리(폭 w)에서 끝으로 뾰족해지는 잎 모양. bend = 휘는 정도 */
export function lock([rx, ry], [tx, ty], w, bend = 0) {
  const dx = tx - rx
  const dy = ty - ry
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const mx = (rx + tx) / 2 + nx * bend
  const my = (ry + ty) / 2 + ny * bend
  const a = [rx + (nx * w) / 2, ry + (ny * w) / 2]
  const b = [rx - (nx * w) / 2, ry - (ny * w) / 2]
  return `M${r1(a[0])},${r1(a[1])} Q${r1(mx + (nx * w) / 2)},${r1(my + (ny * w) / 2)} ${r1(tx)},${r1(ty)} Q${r1(mx - (nx * w) / 3)},${r1(my - (ny * w) / 3)} ${r1(b[0])},${r1(b[1])} Z`
}

/** #rrggbb 를 amt(0~1)만큼 어둡게(+) 또는 밝게(−) */
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
    Math.round(amt >= 0 ? c * (1 - amt) : c + (255 - c) * -amt),
  )
  return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`
}
