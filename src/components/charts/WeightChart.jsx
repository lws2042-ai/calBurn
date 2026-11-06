import { useId, useMemo, useState } from 'react'
import { addDays, diffDays, shortDate, weekday } from '../../lib/dates'
import { fmtSigned } from '../../lib/format'
import { ledgerLine, milestones, noiseSigma, weeklyChanges } from '../../lib/weightInsight'
import { linear, niceTicks, pathD, useWidth } from './chartUtils'

const H = 280
const PAD = { l: 42, r: 16, t: 18, b: 28 }
const RANGES = [
  ['14', '2주'],
  ['30', '1개월'],
  ['90', '3개월'],
  ['all', '전체'],
]
const LAYERS = [
  ['band', '변동 범위'],
  ['ledger', '에너지 장부'],
  ['proj', '예측'],
]

export default function WeightChart({ analysis }) {
  const [ref, W] = useWidth()
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [range, setRange] = useState('30')
  const [layers, setLayers] = useState({ band: true, ledger: true, proj: true })
  const [hoverIdx, setHoverIdx] = useState(null)

  const { series, goal, today, model, rate, startWeight } = analysis
  const { sigma } = useMemo(() => noiseSigma(series), [series])
  const ledgerAll = useMemo(() => ledgerLine(series), [series])
  const weeks = useMemo(() => weeklyChanges(series, 8), [series])
  const stones = useMemo(() => milestones(series, startWeight, goal), [series, startWeight, goal])

  const rows = range === 'all' ? series : series.slice(-Number(range))
  const first = rows[0].date
  const histDays = diffDays(first, today)
  const current = series.at(-1).trend

  // ── 미래 구간: 목표 도달일까지, 단 보이는 과거 길이를 넘지 않게 ──
  const goalDays = model?.status === 'ok' ? model.days : null
  const futureDays = layers.proj ? Math.min(Math.max(goalDays ?? 30, 14), Math.max(14, histDays), 180) : 0
  const projModel = layers.proj ? (model?.path ?? []).filter((p) => p.day <= futureDays) : []
  const slopePerDay = rate ? rate.kgPerWeek / 7 : null
  const projTrend =
    layers.proj && slopePerDay != null && current != null
      ? [0, futureDays].map((d) => ({ day: d, w: current + slopePerDay * d }))
      : []
  const totalDays = Math.max(1, histDays + futureDays)

  // 장부선은 보이는 구간 시작점에서 실제 추세와 같은 곳에서 출발시킨다 → "이 기간" 기록 오차만 보인다
  const ledgerVis = layers.ledger ? ledgerAll.filter((p) => p.date >= first) : []
  const anchor = ledgerVis.length ? rows.find((r) => r.date === ledgerVis[0].date)?.trend : null
  const ledger = anchor != null ? ledgerVis.map((p) => ({ ...p, w: p.w - ledgerVis[0].w + anchor })) : ledgerVis

  // ── y 범위: 보이는 데이터 기준. 목표가 멀면 축을 늘리지 않고 화살표로 표시 ──
  const dataYs = rows.flatMap((r) => [r.weight, r.trend]).filter((v) => v != null)
  if (!dataYs.length) dataYs.push(startWeight)
  if (layers.band) rows.forEach((r) => r.trend != null && dataYs.push(r.trend + sigma, r.trend - sigma))
  ledger.forEach((p) => dataYs.push(p.w))
  projModel.forEach((p) => dataYs.push(p.w))
  projTrend.forEach((p) => dataYs.push(p.w))
  const dMin = Math.min(...dataYs)
  const dMax = Math.max(...dataYs)
  const goalVisible = goal >= dMin - 3 && goal <= dMax + 3
  const yMin = Math.min(dMin, goalVisible ? goal : dMin) - 0.4
  const yMax = Math.max(dMax, goalVisible ? goal : dMax) + 0.4

  const x = linear(0, totalDays, PAD.l, W - PAD.r)
  const y = linear(yMin, yMax, H - PAD.b, PAD.t)
  const xd = (date) => x(diffDays(first, date))
  const xf = (day) => x(histDays + day)
  const ticks = niceTicks(yMin, yMax, 5)

  const trendRows = rows.filter((r) => r.trend != null)
  const trendPts = trendRows.map((r) => [xd(r.date), y(r.trend)])
  const bandD =
    layers.band && trendRows.length > 1
      ? pathD([
          ...trendRows.map((r) => [xd(r.date), y(r.trend + sigma)]),
          ...[...trendRows].reverse().map((r) => [xd(r.date), y(r.trend - sigma)]),
        ]) + 'Z'
      : null

  const hover = hoverIdx != null ? rows[hoverIdx] : null
  const hoverLedger = hover && ledger.find((p) => p.date === hover.date)

  function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const idx = Math.round(((e.clientX - rect.left - PAD.l) / (W - PAD.l - PAD.r)) * totalDays)
    setHoverIdx(idx >= 0 && idx < rows.length ? idx : null)
  }

  const goalDate = goalDays != null ? addDays(today, goalDays) : null
  const fid = (n) => `${n}${uid}`

  return (
    <div ref={ref} className="chart wchart">
      <div className="chart__head">
        <h2>체중 추이</h2>
        <div className="seg seg--sm">
          {RANGES.map(([k, l]) => (
            <button key={k} className={range === k ? 'on' : ''} onClick={() => setRange(k)}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="legend">
        <span className="lg lg-trend">추세</span>
        <span className="lg lg-dot-lo">추세보다 낮게</span>
        <span className="lg lg-dot-hi">추세보다 높게</span>
        {LAYERS.map(([k, l]) => (
          <button key={k} className={`lg-toggle lg-${k} ${layers[k] ? 'on' : ''}`} onClick={() => setLayers((p) => ({ ...p, [k]: !p[k] }))}>
            {l}
          </button>
        ))}
      </div>

      <div className="wchart__plot">
        <svg width={W} height={H} onPointerMove={onMove} onPointerLeave={() => setHoverIdx(null)} role="img" aria-label="체중 추이 차트">
          <defs>
            <filter id={fid('glow')} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id={fid('band')} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--accent)" stopOpacity="0.10" />
              <stop offset="1" stopColor="var(--accent)" stopOpacity="0.04" />
            </linearGradient>
          </defs>

          {/* 미래 영역 */}
          {futureDays > 0 && <rect className="future-zone" x={xd(today)} y={PAD.t} width={W - PAD.r - xd(today)} height={H - PAD.t - PAD.b} />}

          {ticks.map((t) => (
            <g key={t}>
              <line className="grid" x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} />
              <text className="axis" x={PAD.l - 6} y={y(t)} dy="0.32em" textAnchor="end">
                {Number.isInteger(t) ? t : t.toFixed(1)}
              </text>
            </g>
          ))}

          {/* 목표 */}
          {goalVisible ? (
            <>
              <line className="goal-line" x1={PAD.l} x2={W - PAD.r} y1={y(goal)} y2={y(goal)} />
              <text className="goal-label" x={PAD.l + 4} y={y(goal) - 5}>
                목표 {goal}kg
              </text>
            </>
          ) : (
            <text className="goal-label" x={W - PAD.r} y={goal < yMin ? H - PAD.b - 6 : PAD.t + 10} textAnchor="end">
              목표 {goal}kg {goal < yMin ? '↓' : '↑'}
            </text>
          )}

          {/* 일상 변동 범위 (추세 ± σ) */}
          {bandD && <path d={bandD} fill={`url(#${fid('band')})`} className="band" />}

          {/* 에너지 장부선 */}
          {ledger.length > 1 && <path className="ledger-line" d={pathD(ledger.map((p) => [xd(p.date), y(p.w)]))} />}

          <line className="today-line" x1={xd(today)} x2={xd(today)} y1={PAD.t} y2={H - PAD.b} />

          {/* 측정값: 추세와의 연결선 + 점 (아래=녹색, 위=적색) */}
          {rows.map((r) =>
            r.weight == null || r.trend == null ? null : (
              <g key={r.date}>
                <line className="stem" x1={xd(r.date)} x2={xd(r.date)} y1={y(r.weight)} y2={y(r.trend)} />
                <circle className={r.weight <= r.trend ? 'dot lo' : 'dot hi'} cx={xd(r.date)} cy={y(r.weight)} r="3" />
              </g>
            ),
          )}

          {/* 예측 */}
          {projTrend.length > 1 && <path className="proj-trend" d={pathD(projTrend.map((p) => [xf(p.day), y(p.w)]))} />}
          {projModel.length > 1 && <path className="proj-line" d={pathD(projModel.map((p) => [xf(p.day), y(p.w)]))} />}

          {/* 추세선 */}
          {trendPts.length > 1 && <path className="trend-line" d={pathD(trendPts)} filter={`url(#${fid('glow')})`} />}
          {trendPts.length > 0 && (
            <circle className="trend-head" cx={trendPts.at(-1)[0]} cy={trendPts.at(-1)[1]} r="4.5" filter={`url(#${fid('glow')})`} />
          )}

          {/* 1kg 마일스톤 */}
          {stones
            .filter((m) => m.date >= first)
            .map((m) => {
              const r = rows.find((r) => r.date === m.date)
              const cx = xd(m.date)
              const cy = y(r.trend)
              return (
                <g key={m.kg} className="milestone">
                  <rect x={cx - 4} y={cy - 4} width="8" height="8" transform={`rotate(45 ${cx} ${cy})`} />
                  <text x={cx} y={cy - 9} textAnchor="middle">
                    {m.kg}
                  </text>
                </g>
              )
            })}

          {/* 목표 도달 지점 */}
          {goalDate && goalDays <= futureDays && goalVisible && (
            <g className="goal-hit">
              <circle cx={xf(goalDays)} cy={y(goal)} r="5" filter={`url(#${fid('glow')})`} />
              <text x={xf(goalDays)} y={y(goal) + 18} textAnchor="end">
                {shortDate(goalDate)} 도달
              </text>
            </g>
          )}

          {hover && <line className="hover-line" x1={xd(hover.date)} x2={xd(hover.date)} y1={PAD.t} y2={H - PAD.b} />}

          <text className="axis" x={PAD.l} y={H - 8}>
            {shortDate(first)}
          </text>
          <text className="axis" x={xd(today)} y={H - 8} textAnchor={futureDays ? 'middle' : 'end'}>
            오늘
          </text>
          {futureDays > 0 && (
            <text className="axis" x={W - PAD.r} y={H - 8} textAnchor="end">
              {shortDate(addDays(today, futureDays))}
            </text>
          )}
        </svg>

        {hover && (
          <div className="tip" style={{ left: Math.min(Math.max(xd(hover.date), 90), W - 90) }}>
            <div className="tip__date">
              {hover.date} ({weekday(hover.date)})
            </div>
            <div>
              측정 <b>{hover.weight?.toFixed(1) ?? '—'}</b> · 추세 <b>{hover.trend?.toFixed(2) ?? '—'}</b>
            </div>
            {hover.weight != null && hover.trend != null && (
              <div className="muted">
                추세 대비 {fmtSigned(hover.weight - hover.trend, 2)} kg ({((hover.weight - hover.trend) / sigma).toFixed(1)}σ)
              </div>
            )}
            <div className="muted">밸런스 {hover.balance == null ? '미기록' : `${fmtSigned(hover.balance)} kcal`}</div>
            {hoverLedger && <div className="muted">장부 체중 {hoverLedger.w.toFixed(2)}</div>}
          </div>
        )}
      </div>

      <div className="chart-foot">
        <span className="muted small">
          일상 변동폭 σ = <b className="mono">±{sigma.toFixed(2)} kg</b> — 이 안의 변동은 수분
        </span>
      </div>

      {weeks.length > 0 && (
        <div className="weeks">
          <span className="muted small">주간 추세 변화</span>
          <div className="weeks__row">
            {weeks.map((w) => {
              const good = goal < startWeight ? w.delta < 0 : w.delta > 0
              return (
                <div key={w.end} className={`wk ${good ? 'good' : 'bad'}`} title={`~${w.end}`}>
                  <div className="wk__bar">
                    <span style={{ height: `${Math.min(100, (Math.abs(w.delta) / 1.2) * 100)}%` }} />
                  </div>
                  <div className="mono">{fmtSigned(w.delta, 2)}</div>
                  <div className="muted">{shortDate(w.end)}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
