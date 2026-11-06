import { useEffect, useReducer } from 'react'
import { todayISO } from '../lib/dates'
import { buildDemoState } from '../lib/demo'

const STORAGE_KEY = 'calburn:v1'
const LEGACY_INTAKE_PREFIX = 'calburn:intake:'

export const emptyState = { version: 1, profile: null, entries: {} }
const emptyEntry = () => ({ weightKg: null, foods: [], exercises: [] })
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()))

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const state = raw ? { ...emptyState, ...JSON.parse(raw) } : structuredClone(emptyState)
    const params = new URLSearchParams(window.location.search)
    // ?seed : 기존 기록을 지우고 1월~오늘 샘플 데이터로 채운다 (주소창에서 명시적으로 요청할 때만)
    if (params.has('seed')) return buildDemoState(todayISO())
    // ?demo : 프로필이 없을 때만 샘플 데이터로 시작
    if (!state.profile && params.has('demo')) return buildDemoState(todayISO())
    return migrateLegacyIntake(state)
  } catch {
    return structuredClone(emptyState)
  }
}

/** 이전 임시 화면(calburn:intake:YYYY-MM-DD)의 음식 기록을 흡수 */
function migrateLegacyIntake(state) {
  const keys = Object.keys(localStorage).filter((k) => k.startsWith(LEGACY_INTAKE_PREFIX))
  if (!keys.length) return state
  const entries = { ...state.entries }
  for (const k of keys) {
    const date = k.slice(LEGACY_INTAKE_PREFIX.length)
    const foods = JSON.parse(localStorage.getItem(k) || '[]')
    if (foods.length) {
      const e = entries[date] ?? emptyEntry()
      entries[date] = { ...e, foods: [...e.foods, ...foods] }
    }
    localStorage.removeItem(k)
  }
  return { ...state, entries }
}

function updateEntry(state, date, fn) {
  const e = state.entries[date] ?? emptyEntry()
  return { ...state, entries: { ...state.entries, [date]: fn(e) } }
}

function reducer(state, action) {
  switch (action.type) {
    case 'setProfile':
      return { ...state, profile: action.profile }
    case 'setWeight':
      return updateEntry(state, action.date, (e) => ({ ...e, weightKg: action.weightKg }))
    case 'addFood':
      return updateEntry(state, action.date, (e) => ({ ...e, foods: [...e.foods, { ...action.food, id: uid() }] }))
    case 'removeFood':
      return updateEntry(state, action.date, (e) => ({ ...e, foods: e.foods.filter((f) => f.id !== action.id) }))
    case 'addExercise':
      return updateEntry(state, action.date, (e) => ({
        ...e,
        exercises: [...e.exercises, { ...action.exercise, id: uid() }],
      }))
    case 'removeExercise':
      return updateEntry(state, action.date, (e) => ({
        ...e,
        exercises: e.exercises.filter((x) => x.id !== action.id),
      }))
    case 'gameResult': {
      const g = state.game ?? { best: 0, plays: 0, xp: 0 }
      const isBest = action.result.score > g.best
      return {
        ...state,
        game: {
          plays: g.plays + 1,
          xp: g.xp + action.result.xp,
          best: isBest ? action.result.score : g.best,
          bestDate: isBest ? action.date : g.bestDate,
        },
      }
    }
    case 'setLook':
      return { ...state, profile: { ...state.profile, avatar: action.look ?? undefined } }
    case 'addPlan':
      return { ...state, plans: { ...state.plans, [action.date]: action.plan } }
    case 'removePlan': {
      const plans = { ...state.plans }
      const removed = plans[action.date]
      delete plans[action.date]
      // 쿠폰을 쓴 일정을 지우면 쿠폰도 돌려준다
      const couponsUsed = { ...state.couponsUsed }
      for (const id of removed?.couponIds ?? []) delete couponsUsed[id]
      return { ...state, plans, couponsUsed }
    }
    case 'useCoupon': {
      const prev = state.plans?.[action.date]
      const plan = prev
        ? { ...prev, label: `${prev.label} + 쿠폰`, extraKcal: prev.extraKcal + action.coupon.kcal, couponKcal: (prev.couponKcal ?? 0) + action.coupon.kcal, couponIds: [...(prev.couponIds ?? []), action.coupon.id] }
        : { label: '🎟 쿠폰', extraKcal: action.coupon.kcal, couponKcal: action.coupon.kcal, couponIds: [action.coupon.id] }
      return {
        ...state,
        plans: { ...state.plans, [action.date]: plan },
        couponsUsed: { ...state.couponsUsed, [action.coupon.id]: action.date },
      }
    }
    case 'setDeficit':
      return { ...state, settings: { ...state.settings, dailyDeficit: action.deficit } }
    case 'setTheme':
      return { ...state, settings: { ...state.settings, theme: action.theme, themeChosen: true } }
    case 'replace':
      return action.state
    default:
      return state
  }
}

export function validateImport(obj) {
  if (!obj || typeof obj !== 'object' || typeof obj.entries !== 'object') {
    throw new Error('CalBurn 백업 파일 형식이 아닙니다.')
  }
  return { ...emptyState, ...obj }
}

export function useCalBurn() {
  const [state, dispatch] = useReducer(reducer, null, load)

  // ?seed 는 한 번만 적용: 새로고침해도 다시 덮어쓰지 않게 주소에서 지운다
  useEffect(() => {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('seed')) return
    url.searchParams.delete('seed')
    window.history.replaceState(null, '', url.pathname + url.search + url.hash)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* 저장 불가 환경에서도 화면은 동작 */
    }
  }, [state])

  return [state, dispatch]
}
