import { useEffect, useState } from 'react'
import { searchFood } from '../api/foodClient'
import { kcalForAmount, nutrientsForAmount } from '../lib/nutrition'
import DecisionImpact from './DecisionImpact'

const DEBOUNCE_MS = 300

/**
 * 음식 검색 → 선택 → 섭취량 입력 → (먹기 전 비용 확인) → onAdd({ name, amount, unit, kcal, carbsG, proteinG, sodiumMg })
 * impactCtx: decisionContext() 결과. 있으면 먹기 전 피드백을 보여준다.
 */
export default function FoodSearch({ onAdd, impactCtx }) {
  const [query, setQuery] = useState('')
  const [state, setState] = useState({ q: '', items: [], total: 0, error: null })
  const [selected, setSelected] = useState(null)
  const [amount, setAmount] = useState('')

  const trimmed = query.trim()

  useEffect(() => {
    if (!trimmed) return
    const ctrl = new AbortController()
    const t = setTimeout(() => {
      searchFood(trimmed, { signal: ctrl.signal })
        .then((r) => setState({ q: trimmed, items: r.items, total: r.total, error: null }))
        .catch((e) => {
          if (e.name !== 'AbortError') setState({ q: trimmed, items: [], total: 0, error: e.message })
        })
    }, DEBOUNCE_MS)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [trimmed])

  const loading = trimmed && state.q !== trimmed
  const showResults = trimmed && !loading

  function pick(food) {
    setSelected(food)
    setAmount(String(food.servingAmount ?? food.basis.amount))
  }

  function add() {
    const n = Number(amount)
    if (!selected || !(n > 0)) return
    onAdd({
      name: selected.name,
      amount: n,
      unit: selected.basis.unit,
      ...nutrientsForAmount(selected, n), // kcal · 탄수화물 · 단백질 · 나트륨
    })
    setSelected(null)
    setAmount('')
    setQuery('')
  }

  if (selected) {
    const n = Number(amount)
    const preview = Math.round(kcalForAmount(selected, n))
    const portion = n > 0 ? nutrientsForAmount(selected, n) : { kcal: 0 }
    const serving = selected.servingAmount ?? selected.basis.amount
    return (
      <div className="food-pick">
        <div className="food-pick__name">{selected.name}</div>
        <div className="muted">
          {selected.basis.amount}
          {selected.basis.unit}당 {selected.kcal} kcal
          {selected.servingAmount && ` · 1회 ${selected.servingAmount}${selected.basis.unit}`}
        </div>
        <div className="row">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            autoFocus
            aria-label="섭취량"
          />
          <span className="unit">{selected.basis.unit}</span>
          <strong className="kcal">= {preview} kcal</strong>
        </div>
        {portion.sodiumMg != null && (
          <div className="muted small mono">
            나트륨 {portion.sodiumMg.toLocaleString()}mg{portion.carbsG != null && ` · 탄수화물 ${portion.carbsG}g`}
          </div>
        )}
        <DecisionImpact food={portion} ctx={impactCtx} />
        <div className="row">
          <button className="btn btn--primary" onClick={add} disabled={!(Number(amount) > 0)}>
            먹고 기록
          </button>
          <button className="btn" onClick={() => setAmount(String(Math.round(serving / 2)))}>
            ½ 반만
          </button>
          <button className="btn" onClick={() => setSelected(null)}>
            취소
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="food-search">
      <input
        type="search"
        placeholder="음식 검색 (예: 김치찌개, 닭가슴살)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="음식 검색"
      />
      {loading && <div className="muted">검색 중…</div>}
      {showResults && state.error && <div className="error">⚠ {state.error}</div>}
      {showResults && !state.error && state.items.length === 0 && <div className="muted">결과 없음</div>}
      {showResults && state.items.length > 0 && (
        <>
          <div className="muted small">
            {state.total.toLocaleString()}건 중 상위 {state.items.length}건
          </div>
          <ul className="food-list">
            {state.items.map((f) => (
              <li key={f.id}>
                <button onClick={() => pick(f)} disabled={f.kcal == null}>
                  <span className="food-list__name">
                    {f.name}
                    {f.maker && <span className="muted"> · {f.maker}</span>}
                  </span>
                  <span className="food-list__kcal">
                    {f.kcal ?? '-'} kcal
                    <span className="muted">
                      /{f.basis.amount}
                      {f.basis.unit}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
