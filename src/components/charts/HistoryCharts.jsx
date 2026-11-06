import { useId, useMemo, useState } from 'react'
import { diffDays, shortDate, weekday } from '../../lib/dates'
import { fmtInt, fmtSigned } from '../../lib/format'
import { monthlySummary } from '../../lib/history'
import { linear, niceTicks, pathD, useWidth } from './chartUtils'

const PAD = { l: 42, r: 14, t: 16, b: 28 }

/** 전체 기간 체중 추이 + 월별 변화 + 월별 섭취·소모 */
export default function HistoryCharts({ analysis }) {
  const months = useMemo(() => monthlySummary(analysis.series), [analysis.series])
  return (
    <div className="stack">
      <section className="panel">
        <LongWeightChart analysis={analysis} months={months} />
      </section>
      <section className="panel">
        <MonthlyChangeChart months={months} losing={analysis.goal < analysis.startWeight} />
      </section>
      <section className="panel">
        <MonthlyEnergyChart months={months} />
      </section>
      <section className="panel">
        <h2>월별 요약</h2>
        <div className="table-wrap">
          <table className="table mono">
            <thead>
              <tr>
                <th>월</th>
                <th>변화</th>
                <th>월말 추세</th>
                <th>평균 섭취</th>
                <th>평균 소모</th>
                <th>평균 밸런스</th>
                <th>기록일</th>
              </tr>
            </thead>
            <tbody>
              {[...months].reverse().map((m) => (
                <tr key={m.month} className="no-click">
                  <td>{monthLabel(m.month)}</td>
                  <td className={m.change == null ? 'muted' : m.change <= 0 ? 'c-good' : 'c-bad'}>{m.change == null ? '—' : `${fmtSigned(m.change, 2)}`}</td>
                  <td>{m.endTrend?.toFixed(1) ?? '—'}</td>
                  <td>{m.avgIntake != null ? fmtInt(m.avgIntake) : '—'}</td>
                  <td>{m.avgExpend != null ? fmtInt(m.avgExpend) : '—'}</td>
                  <td className={m.avgBalance == null ? 'muted' : m.avgBalance <= 0 ? 'c-good' : 'c-bad'}>{m.avgBalance == null ? '—' : fmtSigned(m.avgBalance)}</td>
                  <td className="muted">
                    {m.loggedDays}/{m.days}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

const monthLabel = (ym) => `${Number(ym.slice(5))}월`

/** 전체 기간 체중: 측정점 + 추세선 + 목표선 + 월 눈금 + 최고/최저 */
function LongWeightChart({ analysis, months }) {
  const [ref, W] = useWidth()
  const H = 280
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [hover, setHover] = useState(null)
  const { series, goal } = analysis
  const first = series[0].date
  const total = Math.max(1, series.length - 1)

  const ys = series.flatMap((r) => [r.weight, r.trend]).filter((v) => v != null)
  if (!ys.length) ys.push(analysis.startWeight)
  const goalVisible = goal >= Math.min(...ys) - 4
  const yMin = Math.min(...ys, goalVisible ? goal : Infinity) - 0.6
  const yMax = Math.max(...ys) + 0.6
  const x = linear(0, total, PAD.l, W - PAD.r)
  const y = linear(yMin, yMax, H - PAD.b, PAD.t)
  const xd = (d) => x(diffDays(first, d))

  const trend = series.filter((r) => r.trend != null)
  const weighed = series.filter((r) => r.weight != null)
  const maxR = weighed.reduce((a, r) => (a == null || r.weight > a.weight ? r : a), null)
  const minR = weighed.reduce((a, r) => (a == null || r.weight < a.weight ? r : a), null)
  const h = hover != null ? series[hover] : null

  function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const i = Math.round(((e.clientX - rect.left - PAD.l) / (W - PAD.l - PAD.r)) * total)
    setHover(i >= 0 && i <= total ? i : null)
  }

  return (
    <div ref={ref} className="chart">
      <div className="chart__head">
        <h2>전체 체중 추이</h2>
        <span className="muted small mono">
          {h ? `${h.date}(${weekday(h.date)}) · 측정 ${h.weight?.toFixed(1) ?? '—'} · 추세 ${h.trend?.toFixed(2) ?? '—'}` : `${shortDate(first)} ~ 오늘 · ${series.length}일`}
        </span>
      </div>
      <svg width={W} height={H} onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label="전체 체중 추이">
        <defs>
          <filter id={`g${uid}`} x="-10%" y="-20%" width="120%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id={`a${uid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--accent)', stopOpacity: 0.22 }} />
            <stop offset="1" style={{ stopColor: 'var(--accent)', stopOpacity: 0 }} />
          </linearGradient>
        </defs>

        {niceTicks(yMin, yMax, 5).map((t) => (
          <g key={t}>
            <line className="grid" x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} />
            <text className="axis" x={PAD.l - 6} y={y(t)} dy="0.32em" textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        {/* 월 경계 */}
        {months.map((m) => {
          const d = `${m.month}-01`
          if (d < first) return null
          const mx = xd(d)
          return (
            <g key={m.month}>
              <line className="month-line" x1={mx} x2={mx} y1={PAD.t} y2={H - PAD.b} />
              <text className="axis" x={mx + 3} y={H - 9}>
                {monthLabel(m.month)}
              </text>
            </g>
          )
        })}
        {goalVisible && (
          <>
            <line className="goal-line" x1={PAD.l} x2={W - PAD.r} y1={y(goal)} y2={y(goal)} />
            <text className="goal-label" x={W - PAD.r} y={y(goal) - 5} textAnchor="end">
              목표 {goal}kg
            </text>
          </>
        )}

        {/* 추세 아래 영역 */}
        {trend.length > 1 && (
          <path d={`${pathD(trend.map((r) => [xd(r.date), y(r.trend)]))}L${xd(trend.at(-1).date)},${H - PAD.b}L${xd(trend[0].date)},${H - PAD.b}Z`} fill={`url(#a${uid})`} />
        )}
        {weighed.map((r) => (
          <circle key={r.date} className={r.trend != null && r.weight > r.trend ? 'dot hi' : 'dot lo'} cx={xd(r.date)} cy={y(r.weight)} r="1.6" opacity="0.55" />
        ))}
        {trend.length > 1 && <path className="trend-line" d={pathD(trend.map((r) => [xd(r.date), y(r.trend)]))} filter={`url(#g${uid})`} />}

        {maxR && (
          <text className="extreme" x={xd(maxR.date)} y={y(maxR.weight) - 7} textAnchor="middle">
            최고 {maxR.weight}
          </text>
        )}
        {minR && minR !== maxR && (
          <text className="extreme" x={Math.min(xd(minR.date), W - PAD.r - 30)} y={y(minR.weight) + 14} textAnchor="middle">
            최저 {minR.weight}
          </text>
        )}
        {h && <line className="hover-line" x1={xd(h.date)} x2={xd(h.date)} y1={PAD.t} y2={H - PAD.b} />}
      </svg>
    </div>
  )
}

/** 월별 추세 체중 변화 막대 */
function MonthlyChangeChart({ months, losing }) {
  const [ref, W] = useWidth()
  const H = 200
  const vals = months.map((m) => m.change ?? 0)
  const maxAbs = Math.max(0.5, ...vals.map(Math.abs)) * 1.25
  const y = linear(-maxAbs, maxAbs, H - PAD.b, PAD.t)
  const slot = (W - PAD.l - PAD.r) / months.length
  const bw = Math.min(34, slot * 0.6)
  const totalChange = vals.reduce((s, v) => s + v, 0)

  return (
    <div ref={ref} className="chart">
      <div className="chart__head">
        <h2>월별 체중 변화</h2>
        <span className="muted small mono">누적 {fmtSigned(totalChange, 1)} kg</span>
      </div>
      <svg width={W} height={H} role="img" aria-label="월별 체중 변화">
        {niceTicks(-maxAbs, maxAbs, 4).map((t) => (
          <g key={t}>
            <line className={t === 0 ? 'zero-line' : 'grid'} x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} />
            <text className="axis" x={PAD.l - 6} y={y(t)} dy="0.32em" textAnchor="end">
              {t === 0 ? '0' : fmtSigned(t, 1)}
            </text>
          </g>
        ))}
        {months.map((m, i) => {
          const cx = PAD.l + slot * (i + 0.5)
          const v = m.change ?? 0
          const good = losing ? v <= 0 : v >= 0
          return (
            <g key={m.month}>
              <rect className={good ? 'bar deficit' : 'bar surplus'} x={cx - bw / 2} y={Math.min(y(0), y(v))} width={bw} height={Math.max(1, Math.abs(y(v) - y(0)))} />
              <text className="bar-label" x={cx} y={v <= 0 ? y(v) + 12 : y(v) - 4} textAnchor="middle">
                {m.change == null ? '' : fmtSigned(v, 1)}
              </text>
              <text className="axis" x={cx} y={H - 8} textAnchor="middle">
                {monthLabel(m.month)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/** 월 평균 섭취 vs 소모: 두 선 사이 간격 = 에너지 밸런스 */
function MonthlyEnergyChart({ months }) {
  const [ref, W] = useWidth()
  const H = 220
  const data = months.filter((m) => m.avgIntake != null && m.avgExpend != null)
  if (data.length < 2) {
    return (
      <div ref={ref}>
        <h2>월 평균 섭취 vs 소모</h2>
        <p className="muted small">두 달 기록 후 표시</p>
      </div>
    )
  }
  const all = data.flatMap((m) => [m.avgIntake, m.avgExpend])
  const yMin = Math.min(...all) - 150
  const yMax = Math.max(...all) + 150
  const slot = (W - PAD.l - PAD.r) / data.length
  const xc = (i) => PAD.l + slot * (i + 0.5)
  const y = linear(yMin, yMax, H - PAD.b, PAD.t)
  const intakeP = data.map((m, i) => [xc(i), y(m.avgIntake)])
  const expendP = data.map((m, i) => [xc(i), y(m.avgExpend)])

  return (
    <div ref={ref} className="chart">
      <div className="chart__head">
        <h2>월 평균 섭취 vs 소모</h2>
        <span className="legend" style={{ margin: 0 }}>
          <span className="lg lg-intake">섭취</span>
          <span className="lg lg-expend">소모</span>
        </span>
      </div>
      <svg width={W} height={H} role="img" aria-label="월 평균 섭취와 소모">
        {niceTicks(yMin, yMax, 4).map((t) => (
          <g key={t}>
            <line className="grid" x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} />
            <text className="axis" x={PAD.l - 6} y={y(t)} dy="0.32em" textAnchor="end">
              {fmtInt(t)}
            </text>
          </g>
        ))}
        {/* 두 선 사이: 소모가 더 크면(적자) 녹색 */}
        {data.map((m, i) => (
          <line key={m.month} className={m.avgIntake <= m.avgExpend ? 'gap-line good' : 'gap-line bad'} x1={xc(i)} x2={xc(i)} y1={y(m.avgIntake)} y2={y(m.avgExpend)} />
        ))}
        <path className="expend-line" d={pathD(expendP)} />
        <path className="intake-line" d={pathD(intakeP)} />
        {data.map((m, i) => (
          <g key={m.month}>
            <circle className="intake-dot" cx={xc(i)} cy={y(m.avgIntake)} r="3" />
            <circle className="expend-dot" cx={xc(i)} cy={y(m.avgExpend)} r="3" />
            <text className="axis" x={xc(i)} y={H - 8} textAnchor="middle">
              {monthLabel(m.month)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
