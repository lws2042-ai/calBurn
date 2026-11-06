import { useId, useState } from 'react'
import { shortDate } from '../../lib/dates'
import { fmtInt, fmtSigned } from '../../lib/format'
import { linear, niceTicks, useWidth } from './chartUtils'

const H = 200
const PAD = { l: 44, r: 10, t: 12, b: 24 }
const DAYS = 28

/** 일별 칼로리 밸런스 막대: 아래(녹색) = 적자, 위(적색) = 흑자 */
export default function BalanceChart({ analysis }) {
  const [ref, W] = useWidth()
  const glowId = `bglow${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const [hover, setHover] = useState(null)

  const rows = analysis.series.slice(-DAYS)
  const maxAbs = Math.max(300, ...rows.filter((r) => r.balance != null).map((r) => Math.abs(r.balance))) * 1.1
  const y = linear(-maxAbs, maxAbs, H - PAD.b, PAD.t)
  const slot = (W - PAD.l - PAD.r) / rows.length
  const bw = Math.max(2, Math.min(18, slot * 0.62))
  const ticks = niceTicks(-maxAbs, maxAbs, 4)

  const h = hover != null ? rows[hover] : null

  return (
    <div ref={ref} className="chart">
      <div className="chart__head">
        <h2>일별 칼로리 밸런스</h2>
        <span className="muted small mono">
          {h
            ? `${shortDate(h.date)} · ${h.balance == null ? '섭취 미기록' : `${fmtSigned(h.balance)} kcal (섭취 ${fmtInt(h.intake)} / 소모 ${fmtInt(h.expend)})`}`
            : `최근 ${DAYS}일 · 녹색 적자 / 적색 흑자`}
        </span>
      </div>
      <svg width={W} height={H} onPointerLeave={() => setHover(null)} role="img" aria-label="일별 칼로리 밸런스 차트">
        <defs>
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line className={t === 0 ? 'zero-line' : 'grid'} x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} />
            <text className="axis" x={PAD.l - 6} y={y(t)} dy="0.32em" textAnchor="end">
              {t === 0 ? '0' : fmtSigned(t)}
            </text>
          </g>
        ))}

        {rows.map((r, i) => {
          const cx = PAD.l + slot * (i + 0.5)
          return (
            <g key={r.date} onPointerEnter={() => setHover(i)}>
              <rect x={PAD.l + slot * i} y={PAD.t} width={slot} height={H - PAD.t - PAD.b} fill="transparent" />
              {r.balance == null ? (
                <line className="missing" x1={cx - bw / 2} x2={cx + bw / 2} y1={y(0)} y2={y(0)} />
              ) : (
                <rect
                  className={r.balance <= 0 ? 'bar deficit' : 'bar surplus'}
                  x={cx - bw / 2}
                  y={Math.min(y(0), y(r.balance))}
                  width={bw}
                  height={Math.max(1, Math.abs(y(r.balance) - y(0)))}
                  filter={hover === i ? `url(#${glowId})` : undefined}
                />
              )}
            </g>
          )
        })}

        <text className="axis" x={PAD.l} y={H - 6}>
          {shortDate(rows[0].date)}
        </text>
        <text className="axis" x={W - PAD.r} y={H - 6} textAnchor="end">
          오늘
        </text>
      </svg>
    </div>
  )
}
