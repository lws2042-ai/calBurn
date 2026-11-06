// 헤어스타일 7종의 형태. 반환:
//   capTop  정수리 높이
//   cap     머리 윗부분 덩어리
//   locks   [{ d, fringe }]  앞머리·옆머리 다발 (fringe=true 는 이마에 그림자를 드리움)
//   back    몸 뒤에 그릴 뒷머리 경로 (없으면 null)
//   tie     머리끈 위치 (포니테일)
import { lock, smooth } from './svgPath.js'

function capPath(cx, hy, rx, ry, capTop, hairline = 0.68) {
  return smooth([
    [cx - rx - 1.6, hy - ry * 0.15],
    [cx - rx - 2.2, hy - ry * 0.65],
    [cx - rx * 0.55, capTop + 1.5],
    [cx + rx * 0.1, capTop],
    [cx + rx * 0.65, capTop + 1.5],
    [cx + rx + 2.2, hy - ry * 0.65],
    [cx + rx + 1.6, hy - ry * 0.15],
    [cx + rx * 0.8, hy - ry * 0.55],
    [cx, hy - ry * hairline],
    [cx - rx * 0.8, hy - ry * 0.55],
  ])
}

/** 긴 뒷머리: 끝이 뾰족한 다발들로 마무리, wave=물결 진폭 */
function longBack(cx, hy, rx, ry, capTop, len, wave = 0) {
  const bottom = hy + len
  const half = rx + 5
  const tips = 6
  const edge = []
  for (let i = 0; i <= tips; i++) {
    const t = i / tips
    edge.push([cx + half - t * half * 2, bottom + (i % 2 ? -5 : 2) + Math.sin(t * Math.PI) * 3])
  }
  const side = (s) => {
    const pts = []
    for (let k = 0; k <= 4; k++) {
      const y = hy + 4 + ((bottom - 12 - hy - 4) * k) / 4
      pts.push([cx + s * (half + 1 + (wave ? Math.sin(k * 1.6) * wave : 0)), y])
    }
    return s > 0 ? pts : pts.reverse()
  }
  return smooth([[cx, capTop - 0.5], [cx + rx + 4, hy - ry * 0.4], ...side(1), ...edge, ...side(-1), [cx - rx - 4, hy - ry * 0.4]])
}

export function hairShapes(style, { cx, hy, rx, ry, goal }) {
  const lift = goal ? 2 : 0 // 목표: 볼륨 업
  switch (style) {
    case 'volume': {
      const capTop = hy - ry - 6.5 - lift
      const part = [cx - rx * 0.35, capTop + 2.5]
      return {
        capTop,
        cap: capPath(cx, hy, rx, ry, capTop),
        back: null,
        locks: [
          { d: lock(part, [cx - rx - 0.6, hy - ry * 0.3], 6.5, -2), fringe: true },
          { d: lock(part, [cx - rx * 0.35, hy - ry * 0.52], 6, 0.5), fringe: true },
          { d: lock([part[0] + 2, part[1] - 0.5], [cx + rx * 0.25, hy - ry * 0.45], 7, 1.6), fringe: true },
          { d: lock([part[0] + 4, part[1]], [cx + rx * 0.8, hy - ry * 0.38], 7.5, 2.2), fringe: true },
          { d: lock([cx + rx * 0.5, capTop + 4], [cx + rx + 1.2, hy - ry * 0.05], 6, 1.5), fringe: true },
          { d: lock([cx - rx - 0.5, hy - ry * 0.5], [cx - rx + 0.8, hy + ry * 0.2], 3.5, -0.6) },
          { d: lock([cx + rx + 0.5, hy - ry * 0.5], [cx + rx - 0.8, hy + ry * 0.2], 3.5, 0.6) },
        ],
      }
    }
    case 'crop': {
      const capTop = hy - ry - 2.5 - lift * 0.5
      const fringeY = hy - ry * 0.6
      const locks = []
      for (let i = 0; i < 6; i++) {
        const x = cx - rx * 0.85 + (rx * 1.7 * i) / 5
        locks.push({ d: lock([x + 1.5, capTop + 3], [x - 0.5, fringeY + (i % 2) * 1.2], 5, -0.4), fringe: true })
      }
      locks.push({ d: lock([cx - rx - 0.4, hy - ry * 0.5], [cx - rx + 0.5, hy - ry * 0.05], 2.6, -0.3) })
      locks.push({ d: lock([cx + rx + 0.4, hy - ry * 0.5], [cx + rx - 0.5, hy - ry * 0.05], 2.6, 0.3) })
      return { capTop, cap: capPath(cx, hy, rx, ry, capTop, 0.72), back: null, locks }
    }
    case 'bob': {
      const capTop = hy - ry - 5 - lift
      const chin = hy + ry * 0.95
      const back = smooth([
        [cx, capTop - 0.5],
        [cx + rx + 4, hy - ry * 0.4],
        [cx + rx + 5, hy + ry * 0.5],
        [cx + rx + 3.5, chin],
        [cx + rx * 0.4, chin + 1.5],
        [cx - rx * 0.4, chin + 1.5],
        [cx - rx - 3.5, chin],
        [cx - rx - 5, hy + ry * 0.5],
        [cx - rx - 4, hy - ry * 0.4],
      ])
      const locks = []
      for (let i = 0; i < 5; i++) {
        const x = cx - rx * 0.8 + (rx * 1.6 * i) / 4
        locks.push({ d: lock([x, capTop + 2], [x + 0.3, hy - ry * 0.3], 7.5, 0), fringe: true })
      }
      locks.push({ d: lock([cx - rx - 1, hy - ry * 0.55], [cx - rx + 1, chin - 1], 6.5, -1.5) })
      locks.push({ d: lock([cx + rx + 1, hy - ry * 0.55], [cx + rx - 1, chin - 1], 6.5, 1.5) })
      return { capTop, cap: capPath(cx, hy, rx, ry, capTop), back, locks }
    }
    case 'long':
    case 'wavy': {
      const wavy = style === 'wavy'
      const capTop = hy - ry - 4.5 - lift
      const part = [cx - rx * 0.15, capTop + 2.5]
      const len = goal ? 50 : 36
      const b = wavy ? 2.5 : 1.5
      return {
        capTop,
        cap: capPath(cx, hy, rx, ry, capTop),
        back: longBack(cx, hy, rx, ry, capTop, len, wavy ? 3 : 0),
        locks: [
          { d: lock(part, [cx - rx - 0.5, hy + ry * 0.05], 7, -2.5), fringe: true },
          { d: lock(part, [cx - rx * 0.55, hy - ry * 0.32], 6, -1.5), fringe: true },
          { d: lock(part, [cx - rx * 0.12, hy - ry * 0.4], 4.5, -0.5), fringe: true },
          { d: lock([part[0] + 1, part[1]], [cx + rx * 0.35, hy - ry * 0.36], 5.5, 1.2), fringe: true },
          { d: lock([part[0] + 2, part[1]], [cx + rx + 0.5, hy - ry * 0.05], 7, 2.5), fringe: true },
          { d: lock([cx - rx - 1, hy - ry * 0.55], [cx - rx + (wavy ? 0 : 1.5), hy + ry * 1.15], 5, -b) },
          { d: lock([cx + rx + 1, hy - ry * 0.55], [cx + rx - (wavy ? 0 : 1.5), hy + ry * 1.15], 5, b) },
          ...(wavy
            ? [
                { d: lock([cx - rx + 1, hy + ry * 0.6], [cx - rx - 2, hy + ry * 1.5], 4.5, 2) },
                { d: lock([cx + rx - 1, hy + ry * 0.6], [cx + rx + 2, hy + ry * 1.5], 4.5, -2) },
              ]
            : []),
        ],
      }
    }
    case 'ponytail': {
      const capTop = hy - ry - 3.5 - lift * 0.5
      const root = [cx + rx * 0.55, hy - ry * 0.75]
      return {
        capTop,
        cap: capPath(cx, hy, rx, ry, capTop, 0.8),
        back: lock(root, [cx + rx + 9, hy + ry + (goal ? 26 : 18)], 11, -5),
        tie: root,
        locks: [
          { d: lock([cx - rx * 0.6, hy - ry * 0.8], [cx - rx - 0.5, hy + ry * 0.35], 2.4, -1) },
          { d: lock([cx + rx * 0.6, hy - ry * 0.8], [cx + rx + 0.5, hy + ry * 0.35], 2.4, 1) },
        ],
      }
    }
    case 'short':
    default: {
      const capTop = hy - ry - 4 - lift
      return {
        capTop,
        cap: capPath(cx, hy, rx, ry, capTop),
        back: null,
        locks: [
          { d: lock([cx - rx * 0.6, capTop + 3], [cx - rx - 0.3, hy - ry * 0.35], 6, -1), fringe: true },
          { d: lock([cx - rx * 0.2, capTop + 2.5], [cx - rx * 0.4, hy - ry * 0.55], 6, -0.5), fringe: true },
          { d: lock([cx + rx * 0.15, capTop + 2.5], [cx + rx * 0.1, hy - ry * 0.58], 6, 0.3), fringe: true },
          { d: lock([cx + rx * 0.5, capTop + 3], [cx + rx * 0.6, hy - ry * 0.5], 6, 0.8), fringe: true },
          { d: lock([cx + rx * 0.7, capTop + 4], [cx + rx + 0.3, hy - ry * 0.3], 5, 1), fringe: true },
          { d: lock([cx - rx - 0.3, hy - ry * 0.5], [cx - rx + 0.6, hy + ry * 0.1], 3, -0.4) },
          { d: lock([cx + rx + 0.3, hy - ry * 0.5], [cx + rx - 0.6, hy + ry * 0.1], 3, 0.4) },
        ],
      }
    }
  }
}
