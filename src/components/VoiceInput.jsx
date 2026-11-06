import { useEffect, useRef, useState } from 'react'
import { searchFood } from '../api/foodClient'
import { FOODS, HEALTHY } from '../lib/defense'
import { EXERCISE_TYPES, describeExercise, exerciseKcal } from '../lib/exercise'
import { fmtInt } from '../lib/format'
import { nutrientsForAmount } from '../lib/nutrition'
import { matchCommon } from '../lib/commonFoods'
import { parseUtterance } from '../lib/voiceParse'

const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

/** API가 안 될 때 쓰는 대표 음식 kcal (1회분) */
const LOCAL = [...FOODS, ...HEALTHY].map((f) => ({ name: f.name, kcal: f.kcal }))
function localGuess(query) {
  return LOCAL.find((f) => f.name.includes(query) || query.includes(f.name.split(' ')[0]))
}

/** 음식 하나 → 후보 목록 [{ label, food(기록용) }]. 흔한 음식 사전 → 식약처 DB 순 */
async function resolveFood({ query, qty }) {
  const cands = []
  const common = matchCommon(query)
  if (common) {
    cands.push({
      label: `${common.name} ${common.serving}${qty !== 1 ? ` ×${qty}` : ''}`,
      food: { name: `${common.name} ${common.serving}${qty !== 1 ? ` ×${qty}` : ''}`, amount: null, unit: null, kcal: Math.round(common.kcal * qty) },
    })
  }
  try {
    const { items } = await searchFood(query)
    for (const f of items.filter((x) => x.kcal != null).slice(0, common ? 2 : 3)) {
      const amount = Math.round((f.servingAmount ?? f.basis.amount) * qty)
      const n = nutrientsForAmount(f, amount)
      cands.push({ label: `${f.name} ${amount}${f.basis.unit}`, food: { name: f.name, amount, unit: f.basis.unit, ...n } })
    }
  } catch {
    /* 오프라인·API 오류 → 사전·로컬 추정만 사용 */
  }
  if (cands.length) return cands
  const g = localGuess(query)
  const kcal = g ? Math.round(g.kcal * qty) : 0
  return [{ label: g ? `${g.name} (추정)` : `${query} (kcal 입력 필요)`, food: { name: query, amount: null, unit: null, kcal } }]
}

/** 🎤 말로 기록: 말하기 → 해석 → 확인 → 기록 */
export default function VoiceInput({ open, onClose, weightKg, profile, onCommit }) {
  const [phase, setPhase] = useState('idle') // idle | listening | resolving | confirm
  const [text, setText] = useState('')
  const [interim, setInterim] = useState('')
  const [error, setError] = useState(null)
  const [draft, setDraft] = useState(null)
  const recRef = useRef(null)

  const secure = typeof window !== 'undefined' && window.isSecureContext

  useEffect(() => {
    if (!open) {
      recRef.current?.abort?.()
    }
  }, [open])

  if (!open) return null

  function listen() {
    if (!SR) return setError('이 브라우저는 음성 인식을 지원하지 않아요. 아래에 입력해 주세요.')
    if (!secure) return setError('음성 인식은 https 주소에서만 돼요. 아래에 입력해 주세요.')
    setError(null)
    setText('')
    setInterim('')
    const rec = new SR()
    rec.lang = 'ko-KR'
    rec.interimResults = true
    rec.continuous = false
    let finalText = ''
    rec.onresult = (e) => {
      let tmp = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript
        else tmp += e.results[i][0].transcript
      }
      setText(finalText)
      setInterim(tmp)
    }
    rec.onerror = (e) => {
      setPhase('idle')
      setError(e.error === 'not-allowed' ? '마이크 권한을 허용해 주세요.' : e.error === 'no-speech' ? '말소리가 들리지 않았어요.' : `인식 오류: ${e.error}`)
    }
    rec.onend = () => {
      setInterim('')
      if (finalText.trim()) analyze(finalText)
      else setPhase((p) => (p === 'listening' ? 'idle' : p))
    }
    recRef.current = rec
    setPhase('listening')
    rec.start()
  }

  async function analyze(sentence) {
    const parsed = parseUtterance(sentence)
    if (parsed.weightKg == null && !parsed.foods.length && !parsed.exercises.length && parsed.kcal == null) {
      setPhase('idle')
      return setError('알아듣지 못했어요. 예) "몸무게 76.3, 점심 김치찌개"')
    }
    setPhase('resolving')
    const foods = await Promise.all(
      parsed.foods.map(async (f) => {
        const cands = await resolveFood(f)
        return { ...f, cands, pick: 0, kcal: cands[0].food.kcal, on: true }
      }),
    )
    setDraft({
      weight: parsed.weightKg != null ? { value: parsed.weightKg, on: true } : null,
      foods,
      exercises: parsed.exercises.map((x) => ({ ...x, on: true })),
      kcal: parsed.kcal != null ? { value: parsed.kcal, on: true } : null,
    })
    setPhase('confirm')
  }

  function commit() {
    const out = { weightKg: null, foods: [], exercises: [] }
    if (draft.weight?.on) out.weightKg = draft.weight.value
    for (const f of draft.foods) if (f.on && f.kcal > 0) out.foods.push({ ...f.cands[f.pick].food, kcal: Math.round(f.kcal) })
    if (draft.kcal?.on) out.foods.push({ name: '음성 입력', amount: null, unit: null, kcal: draft.kcal.value })
    for (const x of draft.exercises) if (x.on) out.exercises.push({ type: x.type, distanceKm: x.distanceKm, minutes: x.minutes, intensity: x.intensity })
    onCommit(out)
    reset()
    onClose()
  }

  function reset() {
    setPhase('idle')
    setDraft(null)
    setText('')
    setError(null)
  }

  const setFood = (i, patch) => setDraft((d) => ({ ...d, foods: d.foods.map((f, j) => (j === i ? { ...f, ...patch } : f)) }))

  return (
    <div className="voice-backdrop" onClick={onClose}>
      <div className="voice panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="말로 기록">
        <div className="row between" style={{ marginTop: 0 }}>
          <h2 style={{ margin: 0 }}>🎤 말로 기록</h2>
          <button className="icon-btn" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        {phase !== 'confirm' && (
          <>
            <button className={`voice__mic ${phase === 'listening' ? 'on' : ''}`} onClick={phase === 'listening' ? () => recRef.current?.stop() : listen} disabled={phase === 'resolving'}>
              {phase === 'listening' ? '■' : '🎤'}
            </button>
            <div className="voice__status">{phase === 'listening' ? '듣고 있어요… 말이 끝나면 자동으로 정리해요' : phase === 'resolving' ? '음식 찾는 중…' : '눌러서 말하기'}</div>
            <div className="voice__text">
              {text}
              <span className="muted">{interim}</span>
              {!text && !interim && <span className="muted">예) "몸무게 76.3, 점심에 김치찌개랑 공기밥, 러닝 5키로"</span>}
            </div>
            <form
              className="row"
              onSubmit={(e) => {
                e.preventDefault()
                if (text.trim()) analyze(text)
              }}
            >
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="또는 문장으로 입력" aria-label="문장 입력" />
              <button className="btn" type="submit" disabled={!text.trim() || phase === 'resolving'}>
                정리
              </button>
            </form>
            {error && <div className="error">⚠ {error}</div>}
          </>
        )}

        {phase === 'confirm' && draft && (
          <div className="voice__confirm">
            <div className="muted small">"{text}"</div>
            <ul className="voice__list">
              {draft.weight && (
                <li>
                  <input type="checkbox" checked={draft.weight.on} onChange={(e) => setDraft((d) => ({ ...d, weight: { ...d.weight, on: e.target.checked } }))} />
                  <span>⚖️ 체중</span>
                  <input
                    type="number"
                    step="0.1"
                    value={draft.weight.value}
                    onChange={(e) => setDraft((d) => ({ ...d, weight: { ...d.weight, value: Number(e.target.value) } }))}
                    aria-label="체중"
                  />
                  <span className="unit">kg</span>
                </li>
              )}
              {draft.foods.map((f, i) => (
                <li key={i}>
                  <input type="checkbox" checked={f.on} onChange={(e) => setFood(i, { on: e.target.checked })} />
                  <span>🍽️</span>
                  <select
                    value={f.pick}
                    onChange={(e) => {
                      const pick = Number(e.target.value)
                      setFood(i, { pick, kcal: f.cands[pick].food.kcal })
                    }}
                    aria-label="음식 선택"
                  >
                    {f.cands.map((c, j) => (
                      <option key={j} value={j}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <input type="number" value={f.kcal} onChange={(e) => setFood(i, { kcal: Number(e.target.value) })} aria-label="kcal" />
                  <span className="unit">kcal</span>
                </li>
              ))}
              {draft.kcal && (
                <li>
                  <input type="checkbox" checked={draft.kcal.on} onChange={(e) => setDraft((d) => ({ ...d, kcal: { ...d.kcal, on: e.target.checked } }))} />
                  <span>🍽️ 직접</span>
                  <b className="mono">{fmtInt(draft.kcal.value)} kcal</b>
                </li>
              )}
              {draft.exercises.map((x, i) => (
                <li key={`x${i}`}>
                  <input
                    type="checkbox"
                    checked={x.on}
                    onChange={(e) => setDraft((d) => ({ ...d, exercises: d.exercises.map((y, j) => (j === i ? { ...y, on: e.target.checked } : y)) }))}
                  />
                  <span>
                    🏃 {EXERCISE_TYPES[x.type]?.label} {describeExercise(x)}
                  </span>
                  <b className="mono">−{fmtInt(exerciseKcal(x, weightKg, profile))} kcal</b>
                </li>
              ))}
            </ul>
            <div className="row">
              <button className="btn btn--primary" onClick={commit}>
                모두 기록
              </button>
              <button className="btn" onClick={reset}>
                다시 말하기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
