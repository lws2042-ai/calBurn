import { useMemo } from 'react'
import { bmi } from '../lib/bmi'
import { ageAt } from '../lib/bmr'
import { peerNorm } from '../lib/norms'

/** 또래 비교: 같은 성별·연령대 중 내 BMI 위치 (건강검진 100만 명 기준) */
export default function PeerCompare({ analysis, profile }) {
  const age = ageAt(profile.birthYear, analysis.today)
  const norm = useMemo(() => peerNorm(profile.sex, age), [profile.sex, age])
  if (!norm) return null

  const h = profile.heightCm
  const marks = [
    { key: 'start', label: '시작', bmi: bmi(analysis.startWeight, h) },
    { key: 'now', label: '지금', bmi: bmi(analysis.current, h) },
    { key: 'goal', label: '목표', bmi: bmi(analysis.goal, h) },
  ].map((m) => ({ ...m, pct: norm.pctOf(m.bmi) }))
  const now = marks[1]
  const start = marks[0]
  const lower = Math.round(now.pct) // 나보다 BMI 낮은 사람 수 (100명 중)
  const moved = Math.round(start.pct - now.pct)

  return (
    <section className="panel peer">
      <div className="row between" style={{ marginTop: 0 }}>
        <h2 style={{ margin: 0 }}>👥 또래 비교</h2>
        <span className="muted small">{norm.label}</span>
      </div>

      <div className="peer__head">
        또래 100명 중 나보다 BMI 낮은 사람 <b className="mono">{lower}</b>명
        {moved > 0 && <span className="c-good"> · 시작 대비 {moved}명 앞으로</span>}
      </div>

      <div className="peer__bar" aria-hidden="true">
        <div className="peer__zones">
          <span style={{ left: 0, width: `${norm.pctOf(23)}%` }} className="z-normal" />
          <span style={{ left: `${norm.pctOf(23)}%`, width: `${norm.pctOf(25) - norm.pctOf(23)}%` }} className="z-pre" />
          <span style={{ left: `${norm.pctOf(25)}%`, right: 0 }} className="z-obese" />
        </div>
        <i className="peer__median" style={{ left: '50%' }} />
        {marks.map((m) => (
          <div key={m.key} className={`peer__mark peer__mark--${m.key}`} style={{ left: `${Math.max(2, Math.min(98, m.pct))}%` }}>
            <span>{m.label}</span>
          </div>
        ))}
      </div>
      <div className="peer__scale mono">
        <span>마름</span>
        <span>또래 중앙 BMI {norm.median}</span>
        <span>비만</span>
      </div>

      <div className="peer__facts small">
        <span>
          내 BMI <b className="mono">{now.bmi.toFixed(1)}</b>
        </span>
        <span>
          또래 비만율 <b className="mono">{Math.round(norm.obeseRate * 100)}%</b>
        </span>
        <span>
          목표 달성 시 <b className="mono">{Math.round(marks[2].pct)}</b>번째
        </span>
      </div>
      <p className="muted small">* 건강검진 2023 · {norm.n.toLocaleString()}명 기준 (국민건강보험공단)</p>
    </section>
  )
}
