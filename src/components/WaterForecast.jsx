import { addDays, shortDate } from '../lib/dates'
import { fmtInt, fmtSigned } from '../lib/format'
import { forecastFromDay } from '../lib/water'

/** 이 날 먹은 나트륨·탄수화물 → 다음 날 아침 수분 예측 */
export default function WaterForecast({ entries, date }) {
  const { nutrients, baseline, water } = forecastFromDay(entries, date)
  if (!nutrients) return null
  const next = shortDate(addDays(date, 1))

  if (!water) {
    return (
      <div className="water water--muted small">
        💧 나트륨 정보가 있는 음식이 적어 {next} 아침 수분 예측을 할 수 없습니다. 음식 검색으로 기록하면 계산됩니다.
      </div>
    )
  }

  const big = Math.abs(water.total) >= 0.3
  const up = water.total > 0
  return (
    <div className={`water ${big ? (up ? 'water--up' : 'water--down') : ''}`}>
      <div className="water__head">
        <span>💧 {next} 아침 체중 예보</span>
        <b className="mono">
          {fmtSigned(water.low, 1)} ~ {fmtSigned(water.high, 1)} kg
        </b>
      </div>
      <div className="water__rows small">
        <div>
          나트륨 {fmtInt(nutrients.sodiumMg)}mg <span className="muted">(평소 {fmtInt(baseline.sodiumMg)})</span>
          <span className="water__val mono">{fmtSigned(water.naKg, 2)}kg</span>
        </div>
        {nutrients.carbsG != null && (
          <div>
            탄수화물 {fmtInt(nutrients.carbsG)}g <span className="muted">(평소 {fmtInt(baseline.carbsG)})</span>
            <span className="water__val mono">{fmtSigned(water.carbKg, 2)}kg</span>
          </div>
        )}
      </div>
      <p className="muted small">
        {big
          ? up
            ? '짠 음식·탄수화물로 몸이 물을 붙잡습니다. 내일 체중이 올라도 지방이 아닙니다. 보통 2~3일 안에 빠집니다.'
            : '평소보다 짜지 않거나 탄수화물이 적어 수분이 빠집니다. 내일 체중이 많이 내려가도 지방이 그만큼 빠진 것은 아닙니다.'
          : '평소와 비슷해 수분 변화는 크지 않을 전망입니다.'}
        {!baseline.personal && ' (평소 값은 기록이 쌓일 때까지 한국인 평균 사용)'}
      </p>
    </div>
  )
}
