import { useMemo } from 'react'
import { addDays } from '../lib/dates'
import { fmtInt, fmtSigned } from '../lib/format'
import { forecastFromDay } from '../lib/water'
import { interpretToday, noiseSigma } from '../lib/weightInsight'

/** "오늘 체중계 숫자를 어떻게 받아들여야 하나" — 물리 기반 해석 카드 */
export default function WeightInsight({ analysis, entries, onLog }) {
  const series = analysis.series
  const info = useMemo(() => interpretToday(series, noiseSigma(series).sigma), [series])
  const yesterday = addDays(analysis.today, -1)
  const fc = useMemo(() => (entries ? forecastFromDay(entries, yesterday) : null), [entries, yesterday])
  const forecast = fc?.water ? fc : null

  if (!info) {
    return (
      <section className="panel insight">
        <h2>오늘 체중 해석</h2>
        {forecast && (
          <div className={`water ${Math.abs(forecast.water.total) >= 0.3 ? (forecast.water.total > 0 ? 'water--up' : 'water--down') : ''}`}>
            <div className="water__head">
              <span>💧 오늘 아침 체중 예보</span>
              <b className="mono">
                {fmtSigned(forecast.water.low, 1)} ~ {fmtSigned(forecast.water.high, 1)} kg
              </b>
            </div>
            <p className="muted small">
              어제 나트륨 {fmtInt(forecast.nutrients.sodiumMg)}mg (평소 {fmtInt(forecast.baseline.sodiumMg)})
              {forecast.nutrients.carbsG != null && ` · 탄수화물 ${fmtInt(forecast.nutrients.carbsG)}g`} 기준 수분 변화입니다.
              {forecast.water.total >= 0.3 && ' 체중이 올라 나와도 놀라지 마세요 — 지방이 아닙니다.'}
            </p>
          </div>
        )}
        <p className="muted">오늘 체중을 기록하면 변화가 지방인지 수분인지 분해해 드립니다.</p>
        <button className="btn btn--primary small-btn" onClick={onLog}>
          체중 기록하기
        </button>
      </section>
    )
  }

  const { change, changeDays, dev, sigma, zone, fat, water, trend7 } = info
  const headline =
    zone === 'normal'
      ? '정상 변동 범위 — 흔들리지 마세요'
      : zone === 'high'
        ? '평소보다 높게 측정됨 — 지방 증가가 아닙니다'
        : '평소보다 낮게 측정됨 — 과도한 기대는 금물'

  const reason =
    zone === 'high'
      ? '짠 음식·늦은 식사·수면 부족 때문일 수 있어요.'
      : zone === 'low'
        ? '탈수·공복 등 일시적 요인이에요.'
        : `정상 범위(±${(1.5 * sigma).toFixed(2)}kg) 안이에요.`

  return (
    <section className={`panel insight zone-${zone}`}>
      <h2>오늘 체중 해석</h2>
      <div className="insight__head">{headline}</div>

      <div className="insight__grid mono">
        <div>
          <small>{changeDays === 1 ? '어제 대비' : changeDays ? `${changeDays}일 전 대비` : '직전 대비'}</small>
          <b>{change == null ? '—' : `${fmtSigned(change, 2)} kg`}</b>
        </div>
        <div>
          <small>추세 대비</small>
          <b>{fmtSigned(dev, 2)} kg</b>
        </div>
        <div>
          <small>추세 7일 변화</small>
          <b className={trend7 == null ? '' : (analysis.goal < analysis.startWeight ? trend7 < 0 : trend7 > 0) ? 'c-good' : 'c-bad'}>
            {trend7 == null ? '—' : `${fmtSigned(trend7, 2)} kg`}
          </b>
        </div>
      </div>

      {fat != null && (
        <div className="decomp">
          <div className="decomp__title muted small">어제→오늘 {fmtSigned(change, 2)}kg 분해</div>
          <div className="decomp__bar" aria-hidden="true">
            <DecompPart value={fat} total={Math.abs(fat) + Math.abs(water)} cls="decomp__part--fat" />
            <DecompPart value={water} total={Math.abs(fat) + Math.abs(water)} cls="decomp__part--water" />
          </div>
          <div className="decomp__legend small">
            <span>
              <i className="sw sw--fat" /> 지방 <b className="mono">{fmtSigned(fat * 1000)}g</b>
            </span>
            <span>
              <i className="sw sw--water" /> 수분 등 <b className="mono">{fmtSigned(water * 1000)}g</b>
            </span>
          </div>
        </div>
      )}

      {/* 어제 식단(나트륨·탄수화물)으로 예측했던 수분과 실제 비교 */}
      {forecast && water != null && (
        <div className="water small">
          <div className="water__head">
            <span>💧 수분 예측 vs 실제</span>
          </div>
          <div className="water__rows">
            <div>
              <span>
                예측 <span className="muted">(어제 나트륨 {fmtInt(forecast.nutrients.sodiumMg)}mg{forecast.nutrients.carbsG != null && ` · 탄수 ${fmtInt(forecast.nutrients.carbsG)}g`})</span>
              </span>
              <span className="water__val mono">
                {fmtSigned(forecast.water.low, 1)} ~ {fmtSigned(forecast.water.high, 1)}kg
              </span>
            </div>
            <div>
              <span>실제 수분 등</span>
              <span className="water__val mono">{fmtSigned(water, 2)}kg</span>
            </div>
          </div>
          <p className="muted">
            {water >= forecast.water.low - 0.15 && water <= forecast.water.high + 0.15
              ? '예측대로입니다. 식단 때문이지 지방이 아닙니다.'
              : '예측과 차이가 있어요. 수면·배변·운동 회복 등 다른 요인도 있습니다.'}
          </p>
        </div>
      )}

      <p className="muted small insight__reason">{reason}</p>
    </section>
  )
}

/** 분해 막대 한 칸: 색만 칠하고 숫자는 아래 범례에 둔다 (좁아도 찌그러지지 않게) */
function DecompPart({ value, total, cls }) {
  const pct = total > 0 ? Math.max(4, (Math.abs(value) / total) * 100) : 50
  return <div className={`decomp__part ${cls}`} style={{ width: `${pct}%` }} />
}
