import { useState } from 'react'
import { DEFAULT_DEFICIT, DEFICIT_OPTIONS, EVENT_PRESETS, weeklyBudget } from '../lib/budget'
import { addDays, shortDate, weekday } from '../lib/dates'
import { fmtInt, fmtSigned } from '../lib/format'
import { availableCoupons, COUPON_MAX_DEFICIT, COUPON_TARGET_SHARE, earnedCoupons } from '../lib/coupons'
import { intakeOf } from '../lib/series'

/** 이번 주 칼로리 예산 + 회식·외식 등록 → 남은 날 자동 재분배 */
export default function WeeklyBudget({ state, analysis, dispatch }) {
  const [adding, setAdding] = useState(false)
  const deficit = state.settings?.dailyDeficit ?? DEFAULT_DEFICIT
  const plans = state.plans ?? {}
  const b = weeklyBudget({
    today: analysis.today,
    maintenance: analysis.base + analysis.meanExercise,
    deficit,
    intakeOf: (d) => intakeOf(state.entries[d]),
    plans,
    sex: state.profile.sex,
  })
  const futureEvents = b.days.filter((d) => !d.past && d.plan && d.plan.extraKcal > (d.plan.couponKcal ?? 0))
  // 칼로리 쿠폰
  const coupons = earnedCoupons(analysis.series, { today: analysis.today, deficit, sex: state.profile.sex })
  const avail = availableCoupons(coupons, state.couponsUsed, analysis.today)
  const weekRows = analysis.series.filter((r) => r.date >= b.start && r.date <= analysis.today && r.balance != null)
  const weekMean = weekRows.length ? weekRows.reduce((t, r) => t + r.balance, 0) / weekRows.length : null
  const need = -deficit * COUPON_TARGET_SHARE
  const perDayCut = futureEvents.length ? b.eventExtra / Math.max(1, b.days.filter((d) => !d.past && !d.plan).length) : 0

  return (
    <section className="panel budget">
      <div className="row between" style={{ marginTop: 0 }}>
        <h2 style={{ margin: 0 }}>이번 주 칼로리 예산</h2>
        <div className="seg seg--sm" title="하루 목표 적자">
          {DEFICIT_OPTIONS.map((v) => (
            <button key={v} className={deficit === v ? 'on' : ''} onClick={() => dispatch({ type: 'setDeficit', deficit: v })}>
              −{v}
            </button>
          ))}
        </div>
      </div>
      <div className="budget__sum mono small">
        <span>
          주 예산 <b>{fmtInt(b.weekBudget)}</b>
        </span>
        <span>
          사용 <b>{fmtInt(b.spent)}</b>
        </span>
        <span>
          남음 <b className={b.remaining < 0 ? 'c-bad' : 'c-good'}>{fmtInt(b.remaining)}</b> kcal · {b.daysLeft}일
        </span>
      </div>

      <div className="budget__days">
        {b.days.map((d) => {
          const over = d.intake != null && d.intake > d.budget
          return (
            <div key={d.date} className={`bday ${d.isToday ? 'today' : ''} ${d.past ? 'past' : ''} ${d.plan ? 'event' : ''}`}>
              <div className="bday__dow">
                {weekday(d.date)} <span className="muted">{shortDate(d.date)}</span>
              </div>
              <div className="bday__budget mono">{fmtInt(d.budget)}</div>
              {d.intake != null ? (
                <div className={`bday__intake mono ${over ? 'c-bad' : 'c-good'}`}>
                  {fmtInt(d.intake)} {over ? '▲' : '✓'}
                </div>
              ) : (
                <div className="bday__intake muted">—</div>
              )}
              {d.plan && (
                <button
                  className="bday__event"
                  title="눌러서 삭제"
                  onClick={() => dispatch({ type: 'removePlan', date: d.date })}
                  disabled={d.past}
                >
                  {d.plan.extraKcal === d.plan.couponKcal ? '🎟' : '🍻'} {d.plan.label} +{fmtInt(d.plan.extraKcal)}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {b.today && (
        <p className="small budget__note">
          오늘 예산 <b className="mono">{fmtInt(b.today.budget)}</b> kcal
          {b.today.intake != null && (
            <>
              {' '}
              · 남은 <b className={`mono ${b.today.left < 0 ? 'c-bad' : 'c-good'}`}>{fmtSigned(b.today.left)}</b>
            </>
          )}
          {futureEvents.length > 0 && (
            <span className="muted">
              {' '}
              — 등록한 {futureEvents.map((d) => `${weekday(d.date)} ${d.plan.label}`).join(', ')} 때문에 다른 날이 하루 약 {fmtInt(perDayCut)}kcal씩 나눠 부담합니다. 회식 날은 실패가 아니라 계획입니다.
            </span>
          )}
        </p>
      )}
      {b.floorHit && <p className="small c-bad">⚠ 남은 날 예산이 안전 최저선({fmtInt(b.floor)} kcal)보다 낮아집니다. 이번 주는 목표 적자를 줄이고 다음 주에 이어가세요.</p>}

      <CouponBar avail={avail} total={coupons.length} weekMean={weekMean} need={need} logged={weekRows.length} today={analysis.today} end={b.end} plans={plans}
        onUse={(coupon, date) => dispatch({ type: 'useCoupon', coupon, date })} />

      {adding ? (
        <PlanForm today={analysis.today} end={b.end} plans={plans} onAdd={(date, plan) => {
            dispatch({ type: 'addPlan', date, plan })
            setAdding(false)
          }} onCancel={() => setAdding(false)} />
      ) : (
        <button className="btn small-btn" onClick={() => setAdding(true)}>
          + 회식·외식 미리 등록
        </button>
      )}
    </section>
  )
}

function PlanForm({ today, end, plans, onAdd, onCancel }) {
  const dates = []
  for (let d = today; d <= addDays(end, 7); d = addDays(d, 1)) dates.push(d)
  const [date, setDate] = useState(dates.find((d) => !plans[d]) ?? today)
  const [preset, setPreset] = useState(EVENT_PRESETS[0])
  const [extra, setExtra] = useState(EVENT_PRESETS[0].extraKcal)

  return (
    <div className="plan-form">
      <div className="chips">
        {EVENT_PRESETS.map((p) => (
          <button
            key={p.label}
            className={preset.label === p.label ? 'chip on' : 'chip'}
            onClick={() => {
              setPreset(p)
              setExtra(p.extraKcal)
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="row">
        <select value={date} onChange={(e) => setDate(e.target.value)} aria-label="날짜">
          {dates.map((d) => (
            <option key={d} value={d}>
              {shortDate(d)} ({weekday(d)}){plans[d] ? ` · ${plans[d].label}` : ''}
            </option>
          ))}
        </select>
        <select value={extra} onChange={(e) => setExtra(Number(e.target.value))} aria-label="예상 초과 kcal">
          {[500, 700, 900, 1000, 1200, 1500, 2000].map((v) => (
            <option key={v} value={v}>
              평소보다 +{fmtInt(v)} kcal
            </option>
          ))}
        </select>
      </div>
      <div className="row">
        <button className="btn btn--primary small-btn" onClick={() => onAdd(date, { label: preset.label, extraKcal: extra })}>
          등록
        </button>
        <button className="btn small-btn" onClick={onCancel}>
          취소
        </button>
      </div>
    </div>
  )
}

/** 칼로리 쿠폰: 보유·사용 + 이번 주 획득 진행도 */
function CouponBar({ avail, total, weekMean, need, logged, today, end, plans, onUse }) {
  const [using, setUsing] = useState(false)
  const dates = []
  for (let d = today; d <= end; d = addDays(d, 1)) dates.push(d)
  const [date, setDate] = useState(dates.at(-1))
  const onTrack = weekMean != null && weekMean <= need && weekMean >= -COUPON_MAX_DEFICIT

  return (
    <div className="coupon">
      <div className="coupon__row">
        <span className="coupon__count">
          🎟 칼로리 쿠폰 <b className="mono">{avail.length}</b>장
          {total > 0 && <span className="muted small"> (지금까지 {total}장 획득)</span>}
        </span>
        {avail.length > 0 && !using && (
          <button className="btn btn--primary small-btn" onClick={() => setUsing(true)}>
            쿠폰 쓰기 (+{fmtInt(avail[0].kcal)} kcal)
          </button>
        )}
      </div>
      {avail.length > 0 && <div className="muted small">가장 빨리 만료: {shortDate(avail[0].expires)}까지 · 쓴 날은 예산이 늘고 다른 날은 깎이지 않아요</div>}
      {using && (
        <div className="row">
          <select value={date} onChange={(e) => setDate(e.target.value)} aria-label="쿠폰 쓸 날">
            {dates.map((d) => (
              <option key={d} value={d}>
                {shortDate(d)} ({weekday(d)}){plans[d] ? ` · ${plans[d].label}` : ''}
              </option>
            ))}
          </select>
          <button
            className="btn btn--primary small-btn"
            onClick={() => {
              onUse(avail[0], date)
              setUsing(false)
            }}
          >
            사용
          </button>
          <button className="btn small-btn" onClick={() => setUsing(false)}>
            취소
          </button>
        </div>
      )}
      <div className="small coupon__progress">
        이번 주 쿠폰 도전: 평균 밸런스{' '}
        <b className={`mono ${onTrack ? 'c-good' : 'c-bad'}`}>{weekMean == null ? '—' : fmtSigned(weekMean)}</b> / 목표 {fmtSigned(need)} 이하
        <span className="muted"> · 기록 {logged}/5일 이상</span>
        {onTrack && logged >= 5 ? <span className="c-good"> → 이대로면 다음 주 월요일 쿠폰 획득!</span> : null}
      </div>
    </div>
  )
}
