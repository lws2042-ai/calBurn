import { useState } from 'react'
import { EXERCISE_TYPES, INTENSITY, exerciseKcal } from '../lib/exercise'

const FIELDS = {
  run: [['distanceKm', '거리 (km)'], ['minutes', '시간 (분, 선택)']],
  walk: [['distanceKm', '거리 (km)'], ['minutes', '시간 (분, 선택)']],
  swim: [['minutes', '시간 (분)']],
  hike: [['minutes', '시간 (분)'], ['elevationM', '상승 고도 (m)']],
  cycle: [['minutes', '시간 (분)']],
  manual: [['kcal', '워치/기기 kcal'], ['note', '종목 (선택)']],
}

const empty = { distanceKm: '', minutes: '', elevationM: '', kcal: '', note: '', intensity: 'moderate' }

/** 운동 추가. kcal은 저장하지 않고 엔진이 항상 다시 계산 (공식 수정 시 과거 기록도 정확해짐) */
export default function ExerciseForm({ weightKg, profile, onAdd }) {
  const [type, setType] = useState('run')
  const [v, setV] = useState(empty)

  const exercise = { type }
  for (const [k] of FIELDS[type]) {
    if (v[k] === '') continue
    exercise[k] = k === 'note' ? v[k] : Number(v[k])
  }
  if (INTENSITY[type]) exercise.intensity = v.intensity
  const preview = exerciseKcal(exercise, weightKg, profile)

  function add(e) {
    e.preventDefault()
    if (!(preview > 0)) return
    onAdd(exercise)
    setV(empty)
  }

  return (
    <form onSubmit={add} className="form">
      <div className="chips">
        {Object.entries(EXERCISE_TYPES).map(([k, t]) => (
          <button type="button" key={k} className={k === type ? 'chip on' : 'chip'} onClick={() => setType(k)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="muted small">{EXERCISE_TYPES[type].hint}</div>

      <div className="grid-2">
        {FIELDS[type].map(([k, label]) => (
          <div className="field" key={`${type}-${k}`}>
            <label htmlFor={`ex-${k}`}>{label}</label>
            <input
              id={`ex-${k}`}
              type={k === 'note' ? 'text' : 'number'}
              inputMode={k === 'note' ? 'text' : 'decimal'}
              step="any"
              min="0"
              value={v[k]}
              onChange={(e) => setV((p) => ({ ...p, [k]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      {INTENSITY[type] && (
        <div className="seg">
          {Object.entries(INTENSITY[type]).map(([k, it]) => (
            <button
              type="button"
              key={k}
              className={v.intensity === k ? 'on' : ''}
              onClick={() => setV((p) => ({ ...p, intensity: k }))}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}

      <div className="row between">
        <span>
          순소모 <strong className="glow-text mono">{Math.round(preview)} kcal</strong>
        </span>
        <button className="btn btn--primary" type="submit" disabled={!(preview > 0)}>
          운동 추가
        </button>
      </div>
    </form>
  )
}
