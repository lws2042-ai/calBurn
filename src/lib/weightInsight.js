// 체중 데이터 해석: "숫자가 왜 변했는가"를 물리적으로 설명한다.
// 체중계 변화 = 지방 변화(칼로리 밸런스가 상한) + 수분·글리코겐·장 내용물 (나머지 전부)

import { KCAL_PER_KG } from './constants.js'
import { addDays } from './dates.js'
import { mean } from './stats.js'

const NOISE_WINDOW = 30
const MIN_NOISE_POINTS = 5
const DEFAULT_SIGMA = 0.5 // 데이터가 적을 때 일반적인 일간 변동 (kg)
const MIN_SIGMA = 0.25

/** 개인별 일상 변동폭 σ: 측정값 − 추세 의 RMS (최근 30일) */
export function noiseSigma(series) {
  const res = series
    .slice(-NOISE_WINDOW)
    .filter((r) => r.weight != null && r.trend != null)
    .map((r) => r.weight - r.trend)
  if (res.length < MIN_NOISE_POINTS) return { sigma: DEFAULT_SIGMA, estimated: false }
  const rms = Math.sqrt(mean(res.map((v) => v * v)))
  return { sigma: Math.max(MIN_SIGMA, rms), estimated: true }
}

/**
 * 오늘 체중의 해석.
 * 핵심: 하루 사이 지방이 변할 수 있는 최대치 = 어제 칼로리 밸런스 / 7700.
 * 그보다 큰 변화는 전부 수분 등 비(非)지방 요인이다.
 */
export function interpretToday(series, sigma) {
  const today = series.at(-1)
  if (today.weight == null) return null
  const prev = [...series.slice(0, -1)].reverse().find((r) => r.weight != null)
  const yesterday = series.at(-2)
  const dev = today.weight - today.trend
  const week = series.at(-8)

  const out = {
    weight: today.weight,
    trend: today.trend,
    dev,
    sigma,
    zone: Math.abs(dev) <= 1.5 * sigma ? 'normal' : dev > 0 ? 'high' : 'low',
    change: prev ? today.weight - prev.weight : null,
    changeDays: prev ? series.length - 1 - series.indexOf(prev) : null,
    trend7: week?.trend != null ? today.trend - week.trend : null,
    fat: null,
    water: null,
  }
  // 바로 전날 측정이 있고 전날 섭취가 기록돼 있을 때만 분해
  if (prev && prev === yesterday && yesterday.balance != null) {
    out.fat = yesterday.balance / KCAL_PER_KG
    out.water = out.change - out.fat
  }
  return out
}

/**
 * 에너지 장부 체중: 기록된 kcal만으로 계산한 "있어야 할" 체중.
 * 시작점 = 첫 추세값. 섭취 미기록일은 기록일 평균 밸런스로 보간.
 * 실제 추세와 벌어지면 → 기록 누락/오차 신호.
 */
export function ledgerLine(series) {
  const startIdx = series.findIndex((r) => r.trend != null)
  if (startIdx < 0) return []
  const logged = series.filter((r) => r.balance != null).map((r) => r.balance)
  if (logged.length < 2) return []
  const avg = mean(logged)
  const out = []
  let w = series[startIdx].trend
  for (let i = startIdx; i < series.length; i++) {
    out.push({ date: series[i].date, w, imputed: i > startIdx && series[i - 1].balance == null })
    const b = series[i].balance ?? avg
    w += b / KCAL_PER_KG
  }
  return out
}

/** 최근 n주 주간 추세 변화 (오래된 주 → 최근 주) */
export function weeklyChanges(series, weeks = 8) {
  const byDate = new Map(series.map((r) => [r.date, r]))
  const today = series.at(-1).date
  const out = []
  for (let k = 0; k < weeks; k++) {
    const end = byDate.get(addDays(today, -7 * k))
    const start = byDate.get(addDays(today, -7 * (k + 1)))
    if (!end || !start || end.trend == null || start.trend == null) break
    out.unshift({ end: end.date, delta: end.trend - start.trend })
  }
  return out
}

/** 추세선이 정수 kg 경계를 처음 통과한 지점들 (마일스톤) */
export function milestones(series, startWeight, goal) {
  const losing = goal < startWeight
  const out = []
  let prev = null
  for (const r of series) {
    if (r.trend == null) continue
    if (prev != null) {
      const a = losing ? Math.floor(prev) : Math.ceil(prev)
      const b = losing ? Math.floor(r.trend) : Math.ceil(r.trend)
      if (losing ? b < a : b > a) {
        const kg = a // 통과한 경계값
        if (!out.some((m) => m.kg === kg)) out.push({ date: r.date, kg })
      }
    }
    prev = r.trend
  }
  return out
}
