import { useState } from 'react'
import { addDays, weekday } from '../lib/dates'
import { EXERCISE_TYPES, describeExercise, exerciseKcal } from '../lib/exercise'
import { fmtInt, fmtSigned, kcalToFatG } from '../lib/format'
import { decisionContext } from '../lib/decision'
import DecisionImpact from './DecisionImpact'
import ExerciseForm from './ExerciseForm'
import FoodSearch from './FoodSearch'
import WaterForecast from './WaterForecast'

export default function LogDay({ state, dispatch, analysis, date, setDate, today }) {
  const entry = state.entries[date] ?? { weightKg: null, foods: [], exercises: [] }
  const row = analysis.series.find((r) => r.date === date)
  const refWeight = row?.trend ?? analysis.current
  const prevWeight = [...analysis.series].reverse().find((r) => r.date < date && r.weight != null)?.weight
  const impactCtx = decisionContext(analysis, row)
  // 간편 기록의 "평소" = 최근 평균 섭취 (없으면 기저소모 − 300), 50 단위 반올림
  const usualIntake = Math.round((analysis.meanIntake ?? analysis.base - 300) / 50) * 50

  return (
    <div className="stack">
      <div className="date-nav panel">
        <button className="btn btn--ghost" onClick={() => setDate(addDays(date, -1))} aria-label="이전 날">
          ‹
        </button>
        <div className="date-nav__center">
          <input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
          <span className="muted">({weekday(date)})</span>
          {date !== today && (
            <button className="btn btn--ghost small-btn" onClick={() => setDate(today)}>
              오늘
            </button>
          )}
        </div>
        <button className="btn btn--ghost" onClick={() => setDate(addDays(date, 1))} disabled={date >= today} aria-label="다음 날">
          ›
        </button>
      </div>

      <DaySummary row={row} />

      <section className="panel">
        <h2>체중</h2>
        <WeightInput
          key={date}
          value={entry.weightKg}
          prevWeight={prevWeight}
          onSave={(w) => dispatch({ type: 'setWeight', date, weightKg: w })}
        />
        <WeightFeedback row={row} prevWeight={prevWeight} rate={date === today ? analysis.rate : null} />
      </section>

      <section className="panel">
        <div className="row between">
          <h2>섭취</h2>
          <span className="mono glow-text">{fmtInt(row?.intake ?? 0)} kcal</span>
        </div>
        <QuickMeal
          usual={usualIntake}
          impactCtx={impactCtx}
          onAdd={(label, kcal) => dispatch({ type: 'addFood', date, food: { name: `간편: ${label}`, amount: null, unit: null, kcal, quick: true } })}
        />
        <FoodSearch onAdd={(food) => dispatch({ type: 'addFood', date, food })} impactCtx={impactCtx} />
        <ManualKcal
          impactCtx={impactCtx}
          onAdd={(kcal) => dispatch({ type: 'addFood', date, food: { name: '직접 입력', amount: null, unit: null, kcal } })}
        />
        {entry.foods.length > 0 && (
          <ul className="log">
            {entry.foods.map((f) => (
              <li key={f.id}>
                <span>
                  {f.name}
                  {f.amount != null && (
                    <span className="muted">
                      {' '}
                      {f.amount}
                      {f.unit}
                    </span>
                  )}
                </span>
                <span className="log__right">
                  {f.sodiumMg != null && <span className="muted small mono">Na {fmtInt(f.sodiumMg)}</span>}
                  <span className="mono">{fmtInt(f.kcal)} kcal</span>
                  <button className="icon-btn" onClick={() => dispatch({ type: 'removeFood', date, id: f.id })} aria-label="삭제">
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <WaterForecast entries={state.entries} date={date} />
      </section>

      <section className="panel">
        <div className="row between">
          <h2>운동</h2>
          <span className="mono glow-text">{fmtInt(row?.exercise ?? 0)} kcal</span>
        </div>
        <ExerciseForm
          weightKg={refWeight}
          profile={state.profile}
          onAdd={(exercise) => dispatch({ type: 'addExercise', date, exercise })}
        />
        {entry.exercises.length > 0 && (
          <ul className="log">
            {entry.exercises.map((x) => (
              <li key={x.id}>
                <span>
                  {EXERCISE_TYPES[x.type]?.label} <span className="muted">{describeExercise(x)}</span>
                </span>
                <span className="log__right">
                  <span className="mono">{fmtInt(exerciseKcal(x, refWeight, state.profile))} kcal</span>
                  <button className="icon-btn" onClick={() => dispatch({ type: 'removeExercise', date, id: x.id })} aria-label="삭제">
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function DaySummary({ row }) {
  if (!row) return null
  const b = row.balance
  return (
    <section className={`panel summary ${b == null ? '' : b <= 0 ? 'is-deficit' : 'is-surplus'}`}>
      <div className="summary__eq mono">
        <span>
          <small>섭취</small>
          {row.intake == null ? '—' : fmtInt(row.intake)}
        </span>
        <span className="op">−</span>
        <span>
          <small>소모</small>
          {fmtInt(row.expend)}
        </span>
        <span className="op">=</span>
        <span className="summary__result">
          <small>밸런스</small>
          {b == null ? '미기록' : fmtSigned(b)}
        </span>
      </div>
      {b != null && (
        <div className="muted small center">
          지방 환산 <span className="mono">{fmtSigned(kcalToFatG(b))} g</span>
          {' · '}소모 = 기저 {fmtInt(row.expend - row.exercise)} + 운동 {fmtInt(row.exercise)}
        </div>
      )}
    </section>
  )
}

function WeightInput({ value, prevWeight, onSave }) {
  const [v, setV] = useState(value ?? '')
  const [err, setErr] = useState(null)
  const dirty = String(v) !== String(value ?? '')

  function save() {
    if (v === '') {
      onSave(null)
      return setErr(null)
    }
    const n = Number(v)
    if (!(n >= 30 && n <= 300)) return setErr('30~300 kg 범위로 입력하세요.')
    if (prevWeight != null && Math.abs(n - prevWeight) > 3) {
      const ok = window.confirm(`직전 기록(${prevWeight} kg)과 ${Math.abs(n - prevWeight).toFixed(1)} kg 차이납니다. 저장할까요?`)
      if (!ok) return
    }
    setErr(null)
    onSave(Math.round(n * 100) / 100)
  }

  return (
    <>
      <div className="row">
        <input
          type="number"
          step="0.1"
          inputMode="decimal"
          placeholder="예: 82.4"
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          aria-label="체중 kg"
        />
        <span className="unit">kg</span>
        <button className="btn btn--primary" onClick={save} disabled={!dirty}>
          {value == null ? '저장' : dirty ? '수정' : '저장됨 ✓'}
        </button>
      </div>
      {err && <div className="error">⚠ {err}</div>}
    </>
  )
}

/** 체중 저장 직후: 오늘 숫자보다 추세를 먼저 보여준다 */
function WeightFeedback({ row, prevWeight, rate }) {
  if (!row || row.weight == null) return null
  const change = prevWeight != null ? row.weight - prevWeight : null
  const bigSwing = change != null && Math.abs(change) >= 0.5
  return (
    <div className={`weight-fb ${bigSwing ? 'weight-fb--swing' : ''}`}>
      {rate ? (
        <div>
          <b>
            추세는 주 <span className={`mono ${rate.kgPerWeek <= 0 ? 'c-good' : 'c-bad'}`}>{fmtSigned(rate.kgPerWeek, 2)}kg</span>
          </b>
          {change != null && (
            <span className="muted">
              {' '}
              · 오늘 숫자 {fmtSigned(change, 1)}kg
            </span>
          )}
        </div>
      ) : (
        row.trend != null && (
          <div>
            추세 체중 <b className="mono">{row.trend.toFixed(2)} kg</b>
          </div>
        )
      )}
      <div className="muted small">
        {bigSwing
          ? change > 0
            ? '하루 +0.5kg 이상은 대부분 수분·염분·장 내용물입니다. 어제 짜게 드셨나요? 추세만 보세요.'
            : '하루 −0.5kg 이상은 대부분 수분입니다. 지방이 그만큼 빠진 건 아니에요. 추세만 보세요.'
          : '하루 변동(수분·염분)을 걸러낸 추세가 진짜 변화입니다.'}
      </div>
    </div>
  )
}

/** 3단계 간편 기록: 정확하지 않아도 체중 추세가 매주 보정한다 */
function QuickMeal({ usual, impactCtx, onAdd }) {
  const [hover, setHover] = useState(null)
  const levels = [
    ['적게', Math.round((usual * 0.8) / 50) * 50],
    ['평소', usual],
    ['많이', Math.round((usual * 1.25) / 50) * 50],
  ]
  return (
    <div className="quick">
      <div className="muted small">빠르게 기록 — 하루 전체 기준, 대충이어도 체중이 보정해 줍니다</div>
      <div className="quick__btns">
        {levels.map(([label, kcal]) => (
          <button
            key={label}
            className="btn quick__btn"
            onClick={() => onAdd(label, kcal)}
            onPointerEnter={() => setHover(kcal)}
            onPointerLeave={() => setHover(null)}
          >
            <b>{label}</b>
            <span className="mono muted">≈{fmtInt(kcal)}</span>
          </button>
        ))}
      </div>
      {hover != null && <DecisionImpact food={{ kcal: hover }} ctx={impactCtx} />}
    </div>
  )
}

function ManualKcal({ onAdd, impactCtx }) {
  const [v, setV] = useState('')
  function add() {
    const n = Math.round(Number(v))
    if (!(n >= 0) || v === '') return
    onAdd(n)
    setV('')
  }
  return (
    <>
    {Number(v) > 0 && <DecisionImpact food={{ kcal: Number(v) }} ctx={impactCtx} />}
    <div className="row">
      <input
        type="number"
        inputMode="numeric"
        min="0"
        placeholder="kcal 직접 입력"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && add()}
        aria-label="kcal 직접 입력"
      />
      <button className="btn" onClick={add} disabled={v === ''}>
        추가
      </button>
    </div>
    </>
  )
}
