import { HAIR_COLORS, SKIN_TONES } from '../lib/avatarLook'
import { hairShapes } from '../lib/hairStyles'
import { smooth } from '../lib/svgPath'

// 손그림 감성 일러스트 얼굴 (SVG).
// 따뜻한 피부 · 크고 맑은 눈 · 작은 코와 입 · 볼 홍조 · 끝이 뾰족한 머리 다발 · 살짝 흔들리는 손그림 선.
// layer="back": 몸 뒤에 그릴 뒷머리만, layer="front": 얼굴과 앞머리.
// 특정 작품의 캐릭터를 묘사하지 않는 일반적인 얼굴이다.

/** 얼굴형: taper = 아래로 갈수록 좁아지는 정도(클수록 갸름), drop = 턱 길이 배율 */
const FACE_SHAPE = {
  oval: { taper: 0, drop: 1 },
  round: { taper: -0.08, drop: 0.97 },
  slim: { taper: 0.06, drop: 1.03 },
}
const EYE_SHAPE = {
  almond: { w: 1, h: 1, lift: 0 },
  round: { w: 0.94, h: 1.18, lift: -0.3 },
  sharp: { w: 1.08, h: 0.78, lift: 0.9 },
}

export default function Face({ cx, hy, rx, ry, f, sex, variant, uid, look, layer = 'front' }) {
  const F = sex === 'F'
  const goal = variant === 'goal'
  const g = (n) => `${n}${uid}`
  const SKIN = SKIN_TONES[look.skin] ?? SKIN_TONES.warm
  const HAIR = HAIR_COLORS[look.hairColor] ?? HAIR_COLORS.darkbrown
  const hair = hairShapes(look.hairStyle, { cx, hy, rx, ry, goal })
  const { capTop } = hair

  const wobble = (id, scale) => (
    <filter id={g(id)} x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="2" seed="3" result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale={scale} xChannelSelector="R" yChannelSelector="G" />
    </filter>
  )

  // ── 뒷머리 (몸 뒤) ──
  if (layer === 'back') {
    if (!hair.back) return null
    return (
      <g filter={`url(#${g('wcb')})`}>
        <defs>{wobble('wcb', 0.45)}</defs>
        <path d={hair.back} fill={HAIR.dark} stroke={HAIR.dark} strokeWidth="0.6" />
        {goal &&
          [-1, 1].map((s) => (
            <path key={s} d={`M${cx + s * (rx + 1)},${hy + 4} Q${cx + s * (rx + 8)},${hy + 22} ${cx + s * (rx + 3)},${hy + 44}`} fill="none" stroke={HAIR.light} strokeWidth="0.9" opacity="0.5" />
          ))}
      </g>
    )
  }

  // ── 얼굴형 ──
  // 달걀형 곡선: 위쪽은 타원, 아래쪽은 sin² 비율로 부드럽게 좁아진다 → 턱각·턱끝에 꺾임이 없다.
  // 목표=갸름한 달걀형, 비만=아래가 넓은 둥근 얼굴 (뾰족한 V라인은 쓰지 않음)
  const fs = FACE_SHAPE[look.face] ?? FACE_SHAPE.oval
  const taper = Math.max(-0.05, Math.min(0.4, (goal ? 0.22 : 0.2 - f * 0.16) + fs.taper))
  const drop = (goal ? 1.03 : 1 + f * 0.02) * fs.drop
  const outline = []
  for (let i = 0; i < 64; i++) {
    const t = (i / 64) * Math.PI * 2
    const s = Math.sin(t)
    const lower = s > 0
    const k = lower ? 1 - taper * s ** 2.2 : 1 - 0.06 * s ** 2 // 아래: 턱 쪽으로 좁아짐, 위: 이마 살짝 좁게
    outline.push([cx + rx * Math.cos(t) * k, hy + ry * s * (lower ? drop : 1)])
  }
  const faceD = smooth(outline)
  const chinY = hy + ry * drop
  const jaw = rx * (1 - taper * 0.6) // 턱 아래 그림자·이중턱 위치용
  const chinW = rx * (1 - taper) * 0.35

  // ── 눈 ──
  const es = EYE_SHAPE[look.eyes] ?? EYE_SHAPE.almond
  const eyeY = hy + ry * 0.12
  const eyeDX = rx * 0.42
  const eyeW = 3.5 * es.w
  const eyeH = (goal ? 3.0 : 3.2 - f * 0.6) * es.h
  const liftO = 0.6 + es.lift
  const eye = (d) => {
    const ex = cx + d * eyeDX
    const i = ex - d * eyeW
    const o = ex + d * eyeW
    const white = `M${i},${eyeY} Q${ex},${eyeY - eyeH * 1.15} ${o},${eyeY - liftO} Q${ex},${eyeY + eyeH * 0.85} ${i},${eyeY} Z`
    return (
      <g key={d}>
        <path d={white} fill="#fffaf5" />
        <clipPath id={g(`e${d}`)}>
          <path d={white} />
        </clipPath>
        <g clipPath={`url(#${g(`e${d}`)})`}>
          <ellipse cx={ex + d * 0.15} cy={eyeY - 0.1} rx="2.35" ry="2.7" fill={`url(#${g('iris')})`} />
          <ellipse cx={ex + d * 0.15} cy={eyeY + 0.1} rx="1.1" ry="1.3" fill="#0f0806" />
          <path d={`M${i},${eyeY} Q${ex},${eyeY - eyeH * 1.15} ${o},${eyeY - liftO} L${o},${eyeY - 4} L${i},${eyeY - 4} Z`} fill="#000" opacity="0.18" transform="translate(0 0.9)" />
        </g>
        <circle cx={ex + 0.8} cy={eyeY - 1.1} r="0.95" fill="#fff" />
        <circle cx={ex - 0.9} cy={eyeY + 1.1} r={goal ? 0.5 : 0.35} fill="#fff" opacity="0.85" />
        <path
          d={`M${i - d * 0.2},${eyeY + 0.2} Q${ex},${eyeY - eyeH * 1.2} ${o + d * 0.6},${eyeY - liftO - 0.3} L${o + d * (F ? 1.6 : 0.9)},${eyeY - liftO - (F ? 1.3 : 0.7)} Q${ex},${eyeY - eyeH * 1.45} ${i - d * 0.2},${eyeY + 0.2} Z`}
          fill="#2a1710"
        />
        <path d={`M${o - d * 0.4},${eyeY + 0.6 - es.lift * 0.4} Q${o - d * 1.2},${eyeY + eyeH * 0.6} ${ex},${eyeY + eyeH * 0.82}`} fill="none" stroke="#7b4a38" strokeWidth="0.45" strokeLinecap="round" />
        <path d={`M${ex - d * 1.8},${eyeY - eyeH * 1.1} Q${ex + d * 0.6},${eyeY - eyeH * 1.55} ${o + d * 0.3},${eyeY - 1.3 - liftO}`} fill="none" stroke={SKIN.line} strokeWidth="0.45" opacity="0.6" />
      </g>
    )
  }
  const brow = (d) => {
    const bx = cx + d * eyeDX
    const by = eyeY - eyeH - (goal ? 3.4 : 3)
    return (
      <path
        key={`b${d}`}
        d={`M${bx - d * 3.2},${by + 1} Q${bx + d * 0.4},${by - (F ? 1.6 : 1) - es.lift * 0.6} ${bx + d * 3.8},${by + 0.6 - es.lift * 0.4}`}
        fill="none"
        stroke={look.hairColor === 'blonde' ? '#8a6a3c' : '#3a241a'}
        strokeWidth={F ? 0.85 : 1.25}
        strokeLinecap="round"
      />
    )
  }

  const ny = hy + ry * 0.48
  const my = hy + ry * 0.7
  const mw = (F ? 2.6 : 3) + f * 0.6
  const smile = goal ? 1.1 : 0.5
  const fringe = hair.locks.filter((l) => l.fringe)

  return (
    <g className="face">
      <defs>
        <radialGradient id={g('iris')} cx="0.45" cy="0.3" r="0.8">
          <stop offset="0" stopColor={goal ? '#8a5a3a' : '#6e4a33'} />
          <stop offset="0.55" stopColor="#3b2316" />
          <stop offset="1" stopColor="#1a0e08" />
        </radialGradient>
        <linearGradient id={g('hair')} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={HAIR.base} />
          <stop offset="1" stopColor={HAIR.dark} />
        </linearGradient>
        <filter id={g('soft')} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.9" />
        </filter>
        {wobble('wc', 0.2)}
        <clipPath id={g('fc')}>
          <path d={faceD} />
        </clipPath>
      </defs>

      <g filter={`url(#${g('wc')})`}>
        {/* 귀 */}
        {[-1, 1].map((d) => (
          <g key={`ear${d}`}>
            <path d={smooth([[cx + d * (rx - 1), hy - 2], [cx + d * (rx + 2.4), hy - 2.5], [cx + d * (rx + 2.6), hy + 2.5], [cx + d * (rx + 1), hy + 6], [cx + d * (rx - 1), hy + 5]])} fill={SKIN.base} stroke={SKIN.line} strokeWidth="0.55" />
            <path d={`M${cx + d * (rx + 1.4)},${hy - 0.5} Q${cx + d * (rx + 0.5)},${hy + 2} ${cx + d * (rx + 0.9)},${hy + 4}`} fill="none" stroke={SKIN.deep} strokeWidth="0.5" />
            {F && goal && <circle cx={cx + d * (rx + 0.9)} cy={hy + 6.8} r="0.85" fill="#f3e2b0" stroke="#c9a65a" strokeWidth="0.3" />}
          </g>
        ))}

        {/* 얼굴 */}
        <path d={faceD} fill={SKIN.base} stroke={SKIN.line} strokeWidth="0.75" />
        <g clipPath={`url(#${g('fc')})`}>
          {/* 앞머리 그림자 */}
          <path d={hair.cap} fill={SKIN.shade} transform="translate(0.6 2.4)" opacity="0.8" />
          {fringe.map((l, i) => (
            <path key={i} d={l.d} fill={SKIN.shade} transform="translate(0.5 2)" opacity="0.75" />
          ))}
          <path d={`M${cx + rx},${hy} Q${cx + jaw},${hy + ry * 0.75} ${cx + chinW},${chinY} L${cx + rx + 3},${chinY + 3} Z`} fill={SKIN.shade} opacity="0.55" />
          <g filter={`url(#${g('soft')})`}>
            <ellipse cx={cx - eyeDX - 0.6} cy={hy + ry * 0.42} rx={3.2 + f * 1.2} ry="1.7" fill="#f29a92" opacity={(0.55 + f * 0.15) * (look.skin === 'deep' ? 0.5 : 1)} />
            <ellipse cx={cx + eyeDX + 0.6} cy={hy + ry * 0.42} rx={3.2 + f * 1.2} ry="1.7" fill="#f29a92" opacity={(0.55 + f * 0.15) * (look.skin === 'deep' ? 0.5 : 1)} />
          </g>
          <ellipse cx={cx - rx * 0.2} cy={hy - ry * 0.3} rx={rx * 0.4} ry="2.2" fill="#fff" opacity="0.18" filter={`url(#${g('soft')})`} />
        </g>

        {!goal && f > 0.45 && <path d={`M${cx - jaw * 0.75},${hy + ry * 0.95} Q${cx},${chinY + 4 + f * 3.5} ${cx + jaw * 0.75},${hy + ry * 0.95}`} fill="none" stroke={SKIN.line} strokeWidth="0.6" opacity="0.65" />}

        {eye(-1)}
        {eye(1)}
        {brow(-1)}
        {brow(1)}

        {/* 코 */}
        <path d={`M${cx + 0.4},${ny - 3} Q${cx + 1.4},${ny - 0.6} ${cx + 0.2},${ny + 0.4}`} fill="none" stroke={SKIN.deep} strokeWidth="0.6" strokeLinecap="round" />
        <path d={`M${cx - 1.2},${ny + 0.5} Q${cx},${ny + 1.1} ${cx + 1.1},${ny + 0.5}`} fill="none" stroke={SKIN.line} strokeWidth="0.5" strokeLinecap="round" opacity="0.7" />

        {/* 입 */}
        <path d={`M${cx - mw},${my - smile * (goal ? 1 : 0.5)} Q${cx},${my + (goal ? 1.5 : 1)} ${cx + mw},${my - smile * (goal ? 1 : 0.5)}`} fill="none" stroke="#8f4a40" strokeWidth={goal ? 0.8 : 0.75} strokeLinecap="round" />
        <path d={`M${cx - 1.5},${my + 1.4} Q${cx},${my + 2.2} ${cx + 1.5},${my + 1.4}`} fill="none" stroke="#de8d80" strokeWidth="0.65" strokeLinecap="round" />

        {/* 앞머리 */}
        <path d={hair.cap} fill={`url(#${g('hair')})`} />
        {hair.locks.map((l, i) => (
          <path key={i} d={l.d} fill={`url(#${g('hair')})`} />
        ))}
        {hair.tie && <ellipse cx={hair.tie[0] + 3} cy={hair.tie[1] + 1} rx="2" ry="1.4" style={{ fill: 'var(--accent)' }} />}
        <g filter={`url(#${g('soft')})`} opacity={goal ? 0.8 : 0.55}>
          <path d={`M${cx - rx * 0.7},${capTop + 5} Q${cx - rx * 0.35},${capTop + 2.2} ${cx - rx * 0.05},${capTop + 2.8}`} fill="none" stroke={HAIR.light} strokeWidth="1.6" strokeLinecap="round" />
          <path d={`M${cx + rx * 0.2},${capTop + 2.8} Q${cx + rx * 0.45},${capTop + 2.6} ${cx + rx * 0.62},${capTop + 4.2}`} fill="none" stroke={HAIR.light} strokeWidth="1.2" strokeLinecap="round" />
        </g>

        {/* 안경 */}
        {look.glasses && (
          <g fill="rgba(255,255,255,0.08)" stroke="#1d1a19" strokeWidth="0.75">
            <rect x={cx - eyeDX - eyeW - 1.2} y={eyeY - eyeH - 1.3} width={eyeW * 2 + 2.4} height={eyeH * 2 + 1.8} rx="2.2" />
            <rect x={cx + eyeDX - eyeW - 1.2} y={eyeY - eyeH - 1.3} width={eyeW * 2 + 2.4} height={eyeH * 2 + 1.8} rx="2.2" />
            <path d={`M${cx - eyeDX + eyeW + 1.2},${eyeY - 1} Q${cx},${eyeY - 2.4} ${cx + eyeDX - eyeW - 1.2},${eyeY - 1}`} fill="none" />
            <path d={`M${cx - eyeDX - eyeW - 1.2},${eyeY - 1} L${cx - rx},${eyeY - 1.6} M${cx + eyeDX + eyeW + 1.2},${eyeY - 1} L${cx + rx},${eyeY - 1.6}`} fill="none" />
          </g>
        )}
      </g>
    </g>
  )
}
