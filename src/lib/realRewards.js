// 현실 보상: 앱 밖의 삶에 남는 가치(돈·건강·스스로 약속한 선물)로 바꿔 보여준다.

import { addDays } from './dates.js'
import { weekStart } from './budget.js'
import { classifyFood, isAggregate } from './foodClass.js'

// ── ② 건강 저금통 ─────────────────────────────
/** 대표 가격 (원, 1회 기준 대략값) — 이름 키워드로 매칭, 먼저 맞는 것 우선 */
export const PRICES = [
  ['치킨', 21000], ['족발', 32000], ['보쌈', 30000], ['삼겹살', 16000], ['곱창', 18000], ['피자', 9000],
  ['햄버거', 7500], ['버거', 7500], ['감자튀김', 3000], ['떡볶이', 5000], ['짜장', 7000], ['짬뽕', 8500], ['탕수육', 16000],
  ['라면', 1500], ['컵라면', 1500], ['맥주', 4500], ['소주', 5000], ['막걸리', 4000], ['와인', 15000],
  ['케이크', 6500], ['도넛', 2500], ['마카롱', 2800], ['아이스크림', 2500], ['과자', 2000], ['초콜릿', 1800], ['쿠키', 2500],
  ['콜라', 2000], ['사이다', 2000], ['버블티', 5500], ['프라푸치노', 6500], ['핫도그', 3000], ['닭강정', 15000],
]
export const DEFAULT_BASELINE_WEEKLY = 40000 // 다이어트 전 주당 야식·배달·술 지출 (설정에서 변경)

export function priceOf(food) {
  const name = food.name ?? ''
  return PRICES.find(([k]) => name.includes(k))?.[1] ?? 0
}

/**
 * 주마다: 해로운 음식 지출 vs 평소(기준) 지출 → 아낀 돈.
 * 메뉴 단위로 기록된 주만 측정한다 (하루 합계·직접 입력만 있는 주는 판단 불가).
 */
export function savings(entries, today, baselineWeekly = DEFAULT_BASELINE_WEEKLY, weeks = 12) {
  const out = []
  const thisWeek = weekStart(today)
  for (let k = weeks - 1; k >= 0; k--) {
    const ws = addDays(thisWeek, -7 * k)
    let spent = 0
    let items = 0
    const days = k === 0 ? Math.min(7, Math.round((new Date(today) - new Date(ws)) / 864e5) + 1) : 7
    for (let i = 0; i < days; i++) {
      for (const f of entries[addDays(ws, i)]?.foods ?? []) {
        if (isAggregate(f)) continue
        items++
        if (classifyFood(f) === 'harmful') spent += priceOf(f)
      }
    }
    if (items < 5) continue // 측정 불가 주
    const budget = (baselineWeekly * days) / 7 // 이번 주는 지난 날만큼만
    out.push({ week: ws, spent, budget: Math.round(budget), saved: Math.max(0, Math.round(budget - spent)), current: k === 0 })
  }
  const month = today.slice(0, 7)
  return {
    weeks: out,
    thisWeek: out.find((w) => w.current) ?? null,
    thisMonth: out.filter((w) => w.week.slice(0, 7) === month || addDays(w.week, 6).slice(0, 7) === month).reduce((s, w) => s + w.saved, 0),
    total: out.reduce((s, w) => s + w.saved, 0),
  }
}

// ── ③ 건강 효과 (연구 평균치) ─────────────────────
// 무릎: 1kg 감량 → 걸음당 무릎 하중 약 4kg 감소 (Messier et al., 2005)
// 혈압: 1kg 감량 → 수축기 혈압 약 −1mmHg (Neter et al., 2003 메타분석)
// 당뇨: 체중 7% 감량 + 주 150분 운동 → 2형 당뇨 발생 58% 감소 (Diabetes Prevention Program, 2002)
// 대사: 5% 감량부터 간·근육 인슐린 감수성 개선 (Magkos et al., 2016)
export const KNEE_KG_PER_KG = 4
export const BP_MMHG_PER_KG = 1
export const STEPS_PER_DAY = 8000

export function healthGains(startWeight, current) {
  const lossKg = Math.max(0, startWeight - current)
  const pct = startWeight > 0 ? (lossKg / startWeight) * 100 : 0
  const kneePerStep = lossKg * KNEE_KG_PER_KG
  return {
    lossKg,
    pct,
    kneePerStep,
    kneeTonsPerDay: (kneePerStep * STEPS_PER_DAY) / 1000,
    bpMmHg: Math.min(20, lossKg * BP_MMHG_PER_KG),
    thresholds: [
      { pct: 5, label: '대사 개선 구간', desc: '인슐린 감수성·간 지방 개선이 시작되는 지점', reached: pct >= 5 },
      { pct: 7, label: '당뇨 예방 구간', desc: '주 150분 운동과 함께면 당뇨 발생 위험 58% 감소', reached: pct >= 7 },
      { pct: 10, label: '건강 대전환', desc: '혈압·혈당·수면무호흡 등 여러 지표가 뚜렷이 개선', reached: pct >= 10 },
    ],
  }
}

// ── ① 보상 계약서 ─────────────────────────────
export const REWARD_TYPES = {
  kg: { label: '감량', unit: 'kg', hint: '시작 대비 추세 체중 감량' },
  money: { label: '절약', unit: '원', hint: '건강 저금통 누적 금액' },
  days: { label: '기록', unit: '일', hint: '기록한 날 수' },
  goal: { label: '목표 달성', unit: '', hint: '목표 체중 도달' },
}

export const REWARD_PRESETS = [
  { emoji: '👟', title: '새 러닝화', type: 'kg', target: 3 },
  { emoji: '🧘', title: '마사지 받기', type: 'days', target: 30 },
  { emoji: '👕', title: '운동복 한 벌', type: 'money', target: 50000 },
  { emoji: '✈️', title: '여행 가기', type: 'goal', target: 0 },
]

/** ctx: { lossKg, saved, loggedDays, goalReached } → { progress 0~1, now, label } */
export function rewardProgress(r, ctx) {
  switch (r.type) {
    case 'kg':
      return { progress: Math.min(1, ctx.lossKg / r.target), now: `${ctx.lossKg.toFixed(1)} / ${r.target}kg` }
    case 'money':
      return { progress: Math.min(1, ctx.saved / r.target), now: `₩${Math.round(ctx.saved).toLocaleString()} / ₩${r.target.toLocaleString()}` }
    case 'days':
      return { progress: Math.min(1, ctx.loggedDays / r.target), now: `${ctx.loggedDays} / ${r.target}일` }
    case 'goal':
      return { progress: ctx.goalProgress ?? (ctx.goalReached ? 1 : 0), now: ctx.goalReached ? '목표 달성!' : `목표까지 ${Math.round((ctx.goalProgress ?? 0) * 100)}%` }
    default:
      return { progress: 0, now: '' }
  }
}

/** 현실 보상 계산 묶음 (대시보드 요약과 도전 탭이 함께 사용) */
export function realRewardContext(state, analysis) {
  const baseline = state.settings?.junkBaselineWeekly ?? DEFAULT_BASELINE_WEEKLY
  const sv = savings(state.entries, analysis.today, baseline)
  const health = healthGains(analysis.startWeight, analysis.current)
  const ctx = {
    lossKg: health.lossKg,
    saved: sv.total,
    loggedDays: analysis.loggedDays + (analysis.todayRow.intake != null ? 1 : 0),
    goalReached: analysis.progress >= 1,
    goalProgress: analysis.progress,
  }
  const rewards = (state.rewards ?? []).map((r) => ({ ...r, ...rewardProgress(r, ctx) }))
  return { baseline, sv, health, rewards }
}

