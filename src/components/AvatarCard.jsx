import { useState } from 'react'
import { bmi, bmiClass, healthyWeightRange } from '../lib/bmi'
import { addDays } from '../lib/dates'
import { sanitizeLook } from '../lib/unlocks'
import Avatar from './Avatar'

/** 시작 → 현재 → 목표 변신 카드 + 미래 미리보기 슬라이더 */
export default function AvatarCard({ analysis, profile, onCustomize, unlocked = new Set() }) {
  const look = sanitizeLook(profile.avatar, unlocked)
  const { startWeight, current, goal, model, today } = analysis
  const [preview, setPreview] = useState(null) // 0~1: 현재→목표 보간
  const h = profile.heightCm
  const healthy = healthyWeightRange(h)

  const previewWeight = preview == null ? current : current + (goal - current) * preview
  const previewDays = preview != null && model?.status === 'ok' ? Math.round(model.days * preview) : null
  // 모델 경로가 있으면 실제 시뮬레이션의 해당 시점 체중을 사용
  const pathPoint = previewDays != null ? model.path.find((p) => p.day === previewDays) : null
  const midWeight = pathPoint?.w ?? previewWeight

  const Fig = ({ label, w, variant, sub }) => {
    const b = bmi(w, h)
    const c = bmiClass(b)
    return (
      <figure className={`fig fig--${variant}`}>
        <div className="fig__stage">
          <Avatar sex={profile.sex} heightCm={h} weightKg={w} variant={variant} look={look} size={variant === 'current' ? 230 : 210} />
        </div>
        <figcaption>
          <div className="fig__label">{label}</div>
          <div className="mono fig__w">{w.toFixed(1)} kg</div>
          <div className={`bmi-chip tone-${c.tone}`}>
            BMI {b.toFixed(1)} · {c.label}
          </div>
          {sub && <div className="muted small">{sub}</div>}
        </figcaption>
      </figure>
    )
  }

  const goalDate = model?.status === 'ok' ? addDays(today, model.days) : null

  return (
    <section className="panel avatar-card">
      <div className="row between">
        <h2>나의 변신</h2>
        <span className="row" style={{ margin: 0 }}>
          <span className="muted small">
            정상 BMI 체중 {healthy.min.toFixed(1)}–{healthy.max.toFixed(1)} kg
          </span>
          {onCustomize && (
            <button className="btn small-btn" onClick={onCustomize}>
              ✎ 꾸미기
            </button>
          )}
        </span>
      </div>

      <div className="figs">
        {Fig({ label: '시작', w: startWeight, variant: 'start' })}
        <div className="fig-arrow" aria-hidden="true">
          →
        </div>
        {Fig({
          label: preview == null ? '지금' : previewDays != null ? `D+${previewDays}` : `${Math.round(preview * 100)}% 지점`,
          w: midWeight,
          variant: 'current',
          sub: previewDays != null ? addDays(today, previewDays) : null,
        })}
        <div className="fig-arrow" aria-hidden="true">
          →
        </div>
        {Fig({ label: '목표', w: goal, variant: 'goal', sub: goalDate ? `${goalDate} 예상` : null })}
      </div>

      <div className="preview">
        <label className="muted small" htmlFor="pv">
          미래 미리보기
        </label>
        <input
          id="pv"
          type="range"
          min="0"
          max="100"
          value={Math.round((preview ?? 0) * 100)}
          onChange={(e) => setPreview(Number(e.target.value) / 100)}
        />
        {preview != null && (
          <button className="btn btn--ghost small-btn" onClick={() => setPreview(null)}>
            지금으로
          </button>
        )}
      </div>

      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${analysis.progress * 100}%` }} />
      </div>
      <div className="row between small muted">
        <span className="mono">{startWeight.toFixed(1)} kg</span>
        <span>진행률 {Math.round(analysis.progress * 100)}%</span>
        <span className="mono">{goal} kg</span>
      </div>
      <p className="muted small">* 시작·목표 체형은 강조 표현</p>
    </section>
  )
}
