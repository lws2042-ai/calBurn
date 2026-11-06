import { useId } from 'react'
import { resolveLook, SKIN_TONES } from '../lib/avatarLook'
import { bmi, bodyFactor } from '../lib/bmi'
import { shade, smooth } from '../lib/svgPath'
import Face from './Face'

const VW = 160
const VH = 300
const CX = 80
const Y = { head: 38, chin: 58, neck: 66, sh: 76, chest: 96, waist: 128, hip: 152, crotch: 166, knee: 216, ankle: 272, foot: 284 }
const SHOES = { start: '#5c5f66', current: '#c9d1cc', goal: '#f4f7f5' }

/** 표시용 체형 계수: 시작은 과장(뚱뚱함 강조), 목표는 더 슬림하게 */
function displayFactor(f, variant) {
  if (variant === 'start') return Math.min(1, 0.32 + f * 1.3)
  if (variant === 'goal') return Math.max(0, f * 0.7 - 0.06)
  return f
}

const mirror = (pts) => pts.map(([x, y]) => [2 * CX - x, y]).reverse()

/**
 * 키·체중·체형 + 사용자가 고른 외형(look)으로 그리는 아바타.
 * 같은 옷이라도 시작=헐렁하게, 목표=몸에 맞게(넣어 입기·벨트) 연출한다.
 */
export default function Avatar({ sex = 'M', heightCm = 170, weightKg = 65, size = 220, variant = 'current', className = '', crop = null, look: lookIn }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const look = resolveLook(lookIn, sex)
  const SKIN = SKIN_TONES[look.skin] ?? SKIN_TONES.warm
  const F = sex === 'F'
  const f = displayFactor(bodyFactor(bmi(weightKg, heightCm)), variant)
  const goal = variant === 'goal'

  const top = look.top
  const bottom = look.bottom
  const topC = top.color
  const topS = shade(topC, 0.22)
  const botC = bottom.color
  const botS = shade(botC, 0.35)
  const skirt = bottom.style === 'skirt'
  const longPants = bottom.style === 'slacks' || bottom.style === 'jeans'
  const tucked = goal && (top.style === 'shirt' || top.style === 'tshirt')

  // ── 체형 (반폭) ─────────────────────────────
  const shoulder = (F ? 25 : 30) + f * 10 + (goal && !F ? 3 : 0)
  const chest = (F ? 24 : 26) + f * 17
  const waist = (F ? 16 : 20) + f * 33
  const hip = (F ? 28 : 24) + f * 21
  const neckW = (F ? 6 : 7.5) + f * 6
  const faceRx = (F ? 13.2 : 14.2) + f * 5.5 - (goal ? 0.6 : 0)
  const faceRy = (F ? 18.5 : 19.5) + f * 1.5
  const upperArm = (F ? 9 : 10.5) + f * 9
  const foreArm = (F ? 7.5 : 8.5) + f * 6
  const gap = Math.max(0, 5 - f * 8)
  const stance = goal ? 15 : 12 + f * 4
  const knee = 7.5 + f * 6
  const calf = 8 + f * 6
  const ankle = 4.6 + f * 1.6
  const belly = f > 0.35 ? (f - 0.35) * 26 : 0
  const s = Math.min(1.12, Math.max(0.86, heightCm / 175))

  // ── 다리 ────────────────────────────────────
  const leg = (dir) => {
    const X = (v) => CX + dir * v
    return smooth([
      [X(gap * 0.5 + 1), Y.crotch],
      [X(hip - 1), Y.hip - 2],
      [X(hip - 2 + f * 2), Y.crotch + 14],
      [X(stance + knee + 3), Y.knee - 18],
      [X(stance + knee), Y.knee],
      [X(stance + calf + 1), Y.knee + 24],
      [X(stance + ankle + 1), Y.ankle],
      [X(stance - ankle), Y.ankle],
      [X(stance - calf * 0.75), Y.knee + 24],
      [X(stance - knee + 1), Y.knee],
      [X(Math.max(gap, 1) + f * 3), Y.crotch + 16],
    ])
  }

  // ── 상의 실루엣 ─────────────────────────────
  const hem = tucked ? Y.hip - 8 : Y.hip - 2 + f * 4 + (top.style === 'hoodie' ? 4 : 0)
  const hemHalf = Math.max(hip, waist) + (tucked ? -1 : 1)
  const tank = top.style === 'tank'
  const shirtLeft = [
    [CX - neckW - (tank ? 5 : 2), Y.neck - (tank ? 0 : 2)],
    [CX - shoulder + (tank ? 10 : 4), Y.sh - (tank ? 2 : 3)],
    [CX - shoulder + (tank ? 6 : 0), Y.sh + (tank ? 10 : 6)],
    [CX - chest, Y.chest + 2],
    [CX - waist - (tucked ? 0 : 1.5), Y.waist],
    [CX - hemHalf, hem - 4],
    [CX - hemHalf * 0.55, hem + belly * 0.7],
  ]
  const shirtD = smooth([...shirtLeft, [CX, hem + belly], ...mirror(shirtLeft)])

  // ── 팔: [어깨, 팔꿈치, 손목] ─────────────────
  const side = Math.max(chest, waist, hip)
  const armPts = (dir, pose) => {
    const X = (v) => CX + dir * v
    if (pose === 'hip') {
      return [
        [X(shoulder - upperArm * 0.4), Y.sh + 6],
        [X(waist + 26), Y.waist - 10],
        [X(waist + 3), Y.hip - 10],
      ]
    }
    return [
      [X(shoulder - upperArm * 0.4), Y.sh + 6],
      [X(Math.max(chest, waist * 0.92) + upperArm * 0.55 + 1), Y.waist - 6],
      [X(side + foreArm * 0.5 + 2), Y.hip + 8],
    ]
  }
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]

  const arm = (dir, pose) => {
    const [sh, el, wr] = armPts(dir, pose)
    const hoodie = top.style === 'hoodie'
    const sleeveT = { tshirt: 0.5, shirt: 0.72, tank: 0 }[top.style] ?? 0.5
    return (
      <g>
        <path d={`M${sh} L${el} L${wr}`} stroke={SKIN.line} strokeWidth={foreArm + 2} className="av-limb" />
        <path d={`M${sh} L${el}`} stroke={SKIN.base} strokeWidth={upperArm} className="av-limb" />
        <path d={`M${el} L${wr}`} stroke={SKIN.base} strokeWidth={foreArm} className="av-limb" />
        {hoodie ? (
          <>
            <path d={`M${sh} L${el} L${lerp(el, wr, 0.92)}`} stroke={topS} strokeWidth={upperArm + 3.5} className="av-limb" />
            <path d={`M${sh} L${el} L${lerp(el, wr, 0.92)}`} stroke={topC} strokeWidth={upperArm + 1.5} className="av-limb" />
          </>
        ) : (
          sleeveT > 0 && (
            <>
              <path d={`M${sh} L${lerp(sh, el, sleeveT)}`} stroke={topS} strokeWidth={upperArm + 3.5} className="av-limb" />
              <path d={`M${sh} L${lerp(sh, el, sleeveT)}`} stroke={topC} strokeWidth={upperArm + 1.5} className="av-limb" />
            </>
          )
        )}
        {pose !== 'hip' && <ellipse cx={wr[0]} cy={wr[1] + 5} rx={foreArm * 0.55 + 1} ry={foreArm * 0.7 + 1.5} fill={SKIN.base} stroke={SKIN.line} strokeWidth="1" />}
        {goal && dir < 0 && !hoodie && (
          <rect x={wr[0] - foreArm / 2 - 0.5} y={wr[1] - 6} width={foreArm + 1} height="4" rx="1" fill="#0b0f0d" style={{ stroke: 'var(--accent)' }} strokeWidth="0.8" />
        )}
      </g>
    )
  }

  const legsClip = `lc${uid}`
  const pantsBottom = longPants ? Y.ankle - 2 : Y.crotch + 26 + f * 4
  const hy = Y.head
  const glowId = `gl${uid}`

  // ── 목선 ─────────────────────────────────────
  const neckline = () => {
    if (top.style === 'shirt') {
      return (
        <>
          <path d={`M${CX - neckW - 2} ${Y.neck - 2} L${CX} ${Y.neck + 14} L${CX + neckW + 2} ${Y.neck - 2}`} fill={SKIN.shade} />
          <path d={`M${CX - neckW - 3} ${Y.neck - 3} L${CX - 3} ${Y.neck + 12} L${CX - 9} ${Y.neck + 2} Z M${CX + neckW + 3} ${Y.neck - 3} L${CX + 3} ${Y.neck + 12} L${CX + 9} ${Y.neck + 2} Z`} fill={shade(topC, -0.15)} stroke={topS} strokeWidth="0.6" />
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={CX} cy={Y.neck + 22 + i * 14} r="1.1" fill={shade(topC, 0.5)} />
          ))}
        </>
      )
    }
    if (tank) return <path d={`M${CX - neckW - 5} ${Y.neck} Q${CX} ${Y.neck + 18} ${CX + neckW + 5} ${Y.neck}`} fill={SKIN.shade} stroke={topS} strokeWidth="1.4" />
    return <path d={`M${CX - neckW - 1} ${Y.neck - 2} Q${CX} ${Y.neck + 9} ${CX + neckW + 1} ${Y.neck - 2}`} fill={SKIN.shade} stroke={topS} strokeWidth="1.5" />
  }

  return (
    <svg className={`avatar avatar--${variant} ${crop ? "avatar--crop" : ""} ${className}`} viewBox={crop ?? `0 0 ${VW} ${VH}`} width={crop ? size : (size * VW) / VH} height={size} role="img" aria-label="체형 아바타">
      <defs>
        <clipPath id={legsClip}>
          <rect x="0" y="0" width={VW} height={pantsBottom} />
        </clipPath>
        <radialGradient id={`sh${uid}`} cx="0.5" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="1" stopColor="#000" stopOpacity="0.18" />
        </radialGradient>
        <filter id={glowId} x="-30%" y="-10%" width="160%" height="120%">
          <feDropShadow dx="0" dy="0" stdDeviation={goal ? 4 : 2} style={{ floodColor: 'var(--accent)' }} floodOpacity={goal ? 0.55 : 0.25} />
        </filter>
      </defs>

      <ellipse cx={CX} cy={Y.foot + 4} rx={30 + f * 22} ry="5" className="av-floor" />

      <g transform={`translate(${CX} ${Y.foot}) scale(${s}) translate(${-CX} ${-Y.foot})`} filter={`url(#${glowId})`}>
        {/* 뒷머리 (몸 뒤) */}
        <Face cx={CX} hy={hy} rx={faceRx} ry={faceRy} f={f} sex={sex} variant={variant} uid={`${uid}b`} look={look} layer="back" />

        {/* 후드 모자 (목 뒤) */}
        {top.style === 'hoodie' && (
          <path d={smooth([[CX - neckW - 9, Y.neck + 4], [CX - neckW - 6, Y.chin - 8], [CX, Y.chin - 4], [CX + neckW + 6, Y.chin - 8], [CX + neckW + 9, Y.neck + 4], [CX, Y.neck + 6]])} fill={topS} />
        )}

        {/* 다리 */}
        <path d={leg(-1)} fill={SKIN.base} stroke={SKIN.line} strokeWidth="1" />
        <path d={leg(1)} fill={SKIN.base} stroke={SKIN.line} strokeWidth="1" />

        {/* 하의 */}
        {skirt ? (
          <path
            d={smooth([
              [CX - hip + 2, Y.hip - 10],
              [CX + hip - 2, Y.hip - 10],
              [CX + hip + 8 + f * 6, Y.knee - 8],
              [CX, Y.knee - 4],
              [CX - hip - 8 - f * 6, Y.knee - 8],
            ])}
            fill={botC}
            stroke={botS}
            strokeWidth="1"
          />
        ) : (
          <g clipPath={`url(#${legsClip})`}>
            <path d={leg(-1)} fill={botC} stroke={botS} strokeWidth="1" />
            <path d={leg(1)} fill={botC} stroke={botS} strokeWidth="1" />
            <path d={smooth([[CX - hip, Y.hip - 10], [CX + hip, Y.hip - 10], [CX + hip - 1, Y.crotch + 2], [CX, Y.crotch + 3], [CX - hip + 1, Y.crotch + 2]])} fill={botC} />
          </g>
        )}
        {bottom.style === 'slacks' &&
          [-1, 1].map((d) => <path key={d} d={`M${CX + d * stance} ${Y.crotch + 20} L${CX + d * stance} ${Y.ankle - 6}`} className="av-crease" />)}
        {bottom.style === 'jeans' &&
          [-1, 1].map((d) => (
            <g key={d} className="av-stitch">
              <path d={`M${CX + d * (stance + knee + 1)} ${Y.crotch + 6} L${CX + d * (stance + ankle + 1)} ${Y.ankle - 4}`} />
              <path d={`M${CX + d * (hip - 3)} ${Y.hip - 6} Q${CX + d * (hip - 8)} ${Y.hip + 4} ${CX + d * (hip - 14)} ${Y.hip - 6}`} />
            </g>
          ))}

        {/* 신발 */}
        {[-1, 1].map((d) => (
          <g key={d}>
            <path
              d={smooth([
                [CX + d * (stance - ankle - 2), Y.ankle - 1],
                [CX + d * (stance + ankle + 3), Y.ankle - 1],
                [CX + d * (stance + ankle + 9), Y.foot - 2],
                [CX + d * (stance + ankle + 6), Y.foot + 1],
                [CX + d * (stance - ankle - 3), Y.foot + 1],
              ])}
              fill={SHOES[variant] ?? SHOES.current}
              stroke="#0a0d0b"
              strokeWidth="1"
            />
            {goal && <path d={`M${CX + d * (stance - ankle)} ${Y.foot - 3} L${CX + d * (stance + ankle + 6)} ${Y.foot - 3}`} style={{ stroke: 'var(--accent)' }} strokeWidth="1.4" />}
          </g>
        ))}

        {goal && arm(1, 'hip')}

        {/* 목 */}
        <path d={`M${CX - neckW} ${Y.chin - 6} L${CX - neckW} ${Y.neck + 2} L${CX + neckW} ${Y.neck + 2} L${CX + neckW} ${Y.chin - 6} Z`} fill={SKIN.shade} />

        {/* 상의 */}
        <path d={shirtD} fill={topC} stroke={topS} strokeWidth="1.2" />
        <path d={shirtD} fill={`url(#sh${uid})`} />
        {neckline()}
        {top.style === 'hoodie' && (
          <>
            <path d={`M${CX - hemHalf * 0.5} ${Y.waist + 6} L${CX + hemHalf * 0.5} ${Y.waist + 6} L${CX + hemHalf * 0.6} ${hem - 4} L${CX - hemHalf * 0.6} ${hem - 4} Z`} fill="none" stroke={topS} strokeWidth="1.2" />
            <path d={`M${CX - 4} ${Y.neck + 4} L${CX - 5} ${Y.neck + 22} M${CX + 4} ${Y.neck + 4} L${CX + 5} ${Y.neck + 22}`} stroke={shade(topC, -0.5)} strokeWidth="1" strokeLinecap="round" />
          </>
        )}

        {/* 체형 디테일 */}
        {f > 0.55 && !goal && (
          <>
            <path d={`M${CX - chest + 8} ${Y.chest + 4} Q${CX - chest / 2} ${Y.chest + 14 + f * 6} ${CX - 3} ${Y.chest + 6}`} className="av-fold" />
            <path d={`M${CX + chest - 8} ${Y.chest + 4} Q${CX + chest / 2} ${Y.chest + 14 + f * 6} ${CX + 3} ${Y.chest + 6}`} className="av-fold" />
          </>
        )}
        {belly > 2 && (
          <>
            <path d={`M${CX - waist * 0.75} ${Y.waist + 8} Q${CX} ${Y.waist + 22 + belly * 0.6} ${CX + waist * 0.75} ${Y.waist + 8}`} className="av-fold" />
            <path d={`M${CX - waist + 2} ${Y.waist - 8} Q${CX - waist - 3} ${Y.waist + 4} ${CX - waist + 4} ${Y.waist + 14}`} className="av-fold" />
            <path d={`M${CX + waist - 2} ${Y.waist - 8} Q${CX + waist + 3} ${Y.waist + 4} ${CX + waist - 4} ${Y.waist + 14}`} className="av-fold" />
          </>
        )}
        {tucked && (
          <>
            <rect x={CX - hemHalf + 1} y={hem - 4} width={(hemHalf - 1) * 2} height="5" fill="#0a0d0b" />
            <rect x={CX - 4} y={hem - 4.5} width="8" height="6" rx="1" fill="none" stroke="#c9b27c" strokeWidth="1.2" />
          </>
        )}
        {goal && !F && top.style !== 'hoodie' && (
          <>
            <path d={`M${CX - chest + 7} ${Y.chest + 12} Q${CX - chest / 2} ${Y.chest + 17} ${CX - 2} ${Y.chest + 13}`} className="av-fold av-fold--light" />
            <path d={`M${CX + chest - 7} ${Y.chest + 12} Q${CX + chest / 2} ${Y.chest + 17} ${CX + 2} ${Y.chest + 13}`} className="av-fold av-fold--light" />
          </>
        )}

        {arm(-1, 'down')}
        {!goal && arm(1, 'down')}

        {/* 얼굴 · 헤어 */}
        <Face cx={CX} hy={hy} rx={faceRx} ry={faceRy} f={f} sex={sex} variant={variant} uid={uid} look={look} />
      </g>

      {goal && (
        <g className="av-sparkles">
          <path d="M22 60 l2.4 -7 l2.4 7 l7 2.4 l-7 2.4 l-2.4 7 l-2.4 -7 l-7 -2.4 z" />
          <path d="M136 104 l1.6 -4.6 l1.6 4.6 l4.6 1.6 l-4.6 1.6 l-1.6 4.6 l-1.6 -4.6 l-4.6 -1.6 z" />
          <path d="M128 30 l1.2 -3.4 l1.2 3.4 l3.4 1.2 l-3.4 1.2 l-1.2 3.4 l-1.2 -3.4 l-3.4 -1.2 z" />
          <path d="M30 190 l1 -3 l1 3 l3 1 l-3 1 l-1 3 l-1 -3 l-3 -1 z" />
        </g>
      )}
    </svg>
  )
}
