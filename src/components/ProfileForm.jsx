import { useState } from 'react'
import { bmi, bmiClass, healthyWeightRange } from '../lib/bmi'
import { ACTIVITY_LEVELS } from '../lib/constants'
import Avatar from './Avatar'

const thisYear = new Date().getFullYear()

const RULES = {
  birthYear: [thisYear - 100, thisYear - 10, '출생연도'],
  heightCm: [100, 250, '키'],
  startWeightKg: [30, 300, '현재 체중'],
  goalWeightKg: [30, 300, '목표 체중'],
  watchCorrection: [0.3, 1.2, '워치 보정계수'],
}

/**
 * 최초 설정과 설정 화면에서 공용.
 * onSubmit(profile) — profile.startWeightKg는 최초 설정 시 오늘 체중으로도 기록된다.
 */
export default function ProfileForm({ initial, onSubmit, submitLabel = '저장', isOnboarding = false }) {
  const [f, setF] = useState(() => ({
    sex: initial?.sex ?? 'M',
    birthYear: initial?.birthYear ?? '',
    heightCm: initial?.heightCm ?? '',
    startWeightKg: initial?.startWeightKg ?? '',
    goalWeightKg: initial?.goalWeightKg ?? '',
    activityFactor: initial?.activityFactor ?? 1.2,
    watchCorrection: initial?.watchCorrection ?? 0.8,
  }))
  const [error, setError] = useState(null)
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))

  function submit(e) {
    e.preventDefault()
    const out = { ...f }
    for (const [k, [lo, hi, label]] of Object.entries(RULES)) {
      const v = Number(f[k])
      if (!Number.isFinite(v) || v < lo || v > hi) return setError(`${label}: ${lo}~${hi} 범위로 입력하세요.`)
      out[k] = v
    }
    out.activityFactor = Number(f.activityFactor)
    // 안전장치: 저체중(BMI 18.5 미만)이 되는 목표는 설정할 수 없다
    const goalBmi = bmi(out.goalWeightKg, out.heightCm)
    if (goalBmi < 18.5) {
      const minKg = Math.ceil(18.5 * (out.heightCm / 100) ** 2 * 10) / 10
      return setError(`목표 체중이 너무 낮습니다 (BMI ${goalBmi.toFixed(1)}, 저체중). 키 ${out.heightCm}cm라면 최소 ${minKg} kg 이상으로 설정하세요.`)
    }
    setError(null)
    onSubmit(out)
  }

  return (
    <form className="form" onSubmit={submit}>
      <div className="field">
        <label>성별</label>
        <div className="seg">
          {[
            ['M', '남성'],
            ['F', '여성'],
          ].map(([v, l]) => (
            <button type="button" key={v} className={f.sex === v ? 'on' : ''} onClick={() => setF((p) => ({ ...p, sex: v }))}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label htmlFor="by">출생연도</label>
          <input id="by" type="number" inputMode="numeric" placeholder="1990" value={f.birthYear} onChange={set('birthYear')} />
        </div>
        <div className="field">
          <label htmlFor="h">키 (cm)</label>
          <input id="h" type="number" inputMode="decimal" placeholder="175" value={f.heightCm} onChange={set('heightCm')} />
        </div>
        <div className="field">
          <label htmlFor="sw">{isOnboarding ? '현재 체중 (kg)' : '시작 체중 (kg)'}</label>
          <input id="sw" type="number" step="0.1" inputMode="decimal" placeholder="82.4" value={f.startWeightKg} onChange={set('startWeightKg')} />
        </div>
        <div className="field">
          <label htmlFor="gw">목표 체중 (kg)</label>
          <input id="gw" type="number" step="0.1" inputMode="decimal" placeholder="72" value={f.goalWeightKg} onChange={set('goalWeightKg')} />
        </div>
      </div>

      <AvatarPreview look={initial?.avatar} sex={f.sex} heightCm={Number(f.heightCm)} weightKg={Number(f.startWeightKg)} goalKg={Number(f.goalWeightKg)} />

      <div className="field">
        <label>일상 활동 수준 <span className="muted">(운동 제외 — 운동은 따로 기록)</span></label>
        <div className="choice-list">
          {ACTIVITY_LEVELS.map((a) => (
            <button
              type="button"
              key={a.value}
              className={Number(f.activityFactor) === a.value ? 'choice on' : 'choice'}
              onClick={() => setF((p) => ({ ...p, activityFactor: a.value }))}
            >
              <strong>{a.label}</strong>
              <span className="muted">{a.desc}</span>
              <span className="mono">×{a.value}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="wc">
          워치 kcal 보정계수 <span className="muted">(직접 입력한 운동 kcal에 곱함. 워치는 보통 과대추정)</span>
        </label>
        <input id="wc" type="number" step="0.05" inputMode="decimal" value={f.watchCorrection} onChange={set('watchCorrection')} />
      </div>

      {error && <div className="error">⚠ {error}</div>}
      <button className="btn btn--primary btn--block" type="submit">
        {submitLabel}
      </button>
    </form>
  )
}

/** 키·몸무게 입력 즉시 아바타 생성 */
function AvatarPreview({ look, sex, heightCm, weightKg, goalKg }) {
  const okH = heightCm >= 100 && heightCm <= 250
  const okW = weightKg >= 30 && weightKg <= 300
  const okG = goalKg >= 30 && goalKg <= 300
  if (!okH || !okW) {
    return <div className="avatar-preview avatar-preview--empty muted small">키와 체중을 입력하면 나만의 아바타가 생성됩니다</div>
  }
  const healthy = healthyWeightRange(heightCm)
  const item = (label, w, variant) => {
    const b = bmi(w, heightCm)
    const c = bmiClass(b)
    return (
      <figure className={`fig fig--${variant}`}>
        <div className="fig__stage">
          <Avatar sex={sex} heightCm={heightCm} weightKg={w} variant={variant} look={look} size={200} />
        </div>
        <figcaption>
          <div className="fig__label">{label}</div>
          <div className={`bmi-chip tone-${c.tone}`}>
            BMI {b.toFixed(1)} · {c.label}
          </div>
        </figcaption>
      </figure>
    )
  }
  return (
    <div className="avatar-preview">
      <div className="figs">
        {item('지금', weightKg, 'start')}
        {okG && (
          <>
            <div className="fig-arrow" aria-hidden="true">→</div>
            {item('목표 달성', goalKg, 'goal')}
          </>
        )}
      </div>
      <div className="muted small center">
        키 {heightCm}cm의 정상 BMI 체중: {healthy.min.toFixed(1)} – {healthy.max.toFixed(1)} kg
      </div>
    </div>
  )
}
