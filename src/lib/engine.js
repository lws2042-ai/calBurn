// 계산 엔진: 원본 상태(state) → 화면에 필요한 모든 지표.
// 파생값은 저장하지 않고 항상 여기서 다시 계산한다 (단일 진실 원천).

import { ageAt, bmr } from './bmr.js'
import {
  FULL_TRUST_DAYS,
  KCAL_PER_KG,
  MIN_OBS_INTAKE_DAYS,
  MIN_OBS_SPAN_DAYS,
  MIN_OBS_WEIGH_INS,
  MIN_RATE_SPAN_DAYS,
  MIN_RATE_WEIGH_INS,
  MIN_SAFE_INTAKE,
  OBS_CLAMP,
  SAFE_LOSS_PCT_PER_WEEK,
  WINDOW_DAYS,
} from './constants.js'
import { addDays, diffDays } from './dates.js'
const fmtKg = (v) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2)
import { equilibriumWeight, simulateToGoal, trendEta } from './projection.js'
import { buildSeries } from './series.js'
import { clamp, linearRegression, mean, sum } from './stats.js'

export function analyze(state, today) {
  const { profile } = state
  const series = buildSeries(state, today)

  // ── 현재 체중 (추세) ──────────────────────────────
  const current = series.at(-1).trend ?? profile.startWeightKg
  const firstWeighed = series.find((r) => r.weight != null)
  const startWeight = firstWeighed?.weight ?? profile.startWeightKg
  const goal = profile.goalWeightKg

  // ── 이론 모델: Mifflin-St Jeor × 활동계수 ─────────
  const age = ageAt(profile.birthYear, today)
  const bmrAt = (w) => bmr({ sex: profile.sex, weightKg: w, heightCm: profile.heightCm, age })
  const bmrNow = bmrAt(current)
  const formulaBase = bmrNow * profile.activityFactor

  // ── 관측 창: 에너지는 [today−14, today−1], 체중은 [today−14, today] ──
  // (아침 체중은 전날까지 먹은 결과를 반영하므로 체중 창이 하루 더 길다)
  const winStart = addDays(today, -WINDOW_DAYS)
  const energyRows = series.filter((r) => r.date >= winStart && r.date < today)
  const N = energyRows.length
  const intakeVals = energyRows.filter((r) => r.intake != null).map((r) => r.intake)
  const meanIntake = mean(intakeVals)
  const meanExercise = N ? sum(energyRows.map((r) => r.exercise)) / N : 0

  const weighPts = series
    .filter((r) => r.date >= winStart && r.weight != null)
    .map((r) => ({ x: diffDays(winStart, r.date), y: r.weight }))
  const span = weighPts.length ? weighPts.at(-1).x - weighPts[0].x : 0
  // 원본 체중의 선형회귀: EWMA 추세와 달리 지연(lag)이 없다
  const reg =
    weighPts.length >= MIN_RATE_WEIGH_INS && span >= MIN_RATE_SPAN_DAYS ? linearRegression(weighPts) : null
  const slope = reg?.slope ?? null // kg/일

  // ── 적응형 TDEE: 실측 체중 변화로 실제 소모량 역산 ──
  //   Σ(섭취 − 소모) = Δ체중 × 7700  →  소모 = 평균섭취 − 기울기 × 7700
  const loggedDays = series.filter((r) => r.intake != null && r.date < today).length
  let observed = null
  if (
    slope != null &&
    weighPts.length >= MIN_OBS_WEIGH_INS &&
    span >= MIN_OBS_SPAN_DAYS &&
    intakeVals.length >= MIN_OBS_INTAKE_DAYS
  ) {
    const tdee = meanIntake - slope * KCAL_PER_KG
    const baseRaw = tdee - meanExercise // 운동 분리 → 기저소모
    observed = { tdee, base: baseRaw, deviation: baseRaw / formulaBase - 1 }
  }
  const confidence = observed ? Math.min(1, loggedDays / FULL_TRUST_DAYS) : 0
  const base = observed
    ? (1 - confidence) * formulaBase +
      confidence * clamp(observed.base, formulaBase * OBS_CLAMP[0], formulaBase * OBS_CLAMP[1])
    : formulaBase

  // 체중이 변하면 BMR 비율만큼 기저소모도 변한다
  const baseAt = (w) => (base * bmrAt(w)) / bmrNow
  const baseSlope = (base * 10) / bmrNow // d(baseAt)/dw, BMR의 체중계수 10

  // ── 일별 에너지 수지 ──────────────────────────────
  const daily = series.map((r) => {
    const expend = baseAt(r.trend ?? current) + r.exercise
    return { ...r, expend, balance: r.intake != null ? r.intake - expend : null }
  })
  const todayRow = daily.at(-1)
  const last7 = daily.slice(-7).filter((r) => r.balance != null)
  const week = { balance: sum(last7.map((r) => r.balance)), days: last7.length }
  const cumulative = sum(daily.filter((r) => r.balance != null).map((r) => r.balance))

  // ── 감량 속도 ────────────────────────────────────
  const rate = slope != null ? { kgPerWeek: slope * 7, pctPerWeek: ((slope * 7) / current) * 100 } : null

  // ── 목표 도달 예측 (두 방법) ──────────────────────
  const plan = intakeVals.length >= 3 ? { intake: meanIntake, exercise: meanExercise } : null
  const equilibrium = plan ? equilibriumWeight({ current, base, baseSlope, ...plan }) : null
  const model = plan ? simulateToGoal({ start: current, goal, ...plan, baseAt, equilibrium }) : null
  const trend = trendEta({ current, goal, slope })

  return {
    today,
    series: daily,
    todayRow,
    current,
    startWeight,
    goal,
    remainingKg: current - goal,
    progress: startWeight !== goal ? clamp((startWeight - current) / (startWeight - goal), 0, 1) : 1,
    bmr: bmrNow,
    formulaBase,
    base,
    observed,
    confidence,
    loggedDays,
    meanIntake,
    meanExercise,
    week,
    cumulative,
    rate,
    plan,
    equilibrium,
    model,
    trend,
    warnings: buildWarnings({ profile, current, goal, rate, meanIntake, intakeVals, bmrNow, observed, loggedDays, equilibrium, model }),
  }
}

function buildWarnings({ profile, current, goal, rate, meanIntake, intakeVals, bmrNow, observed, loggedDays, model, equilibrium }) {
  const w = []
  const losing = goal < current

  if (loggedDays < MIN_OBS_INTAKE_DAYS) {
    w.push({
      level: 'info',
      text: `데이터 수집 중 (섭취 기록 ${loggedDays}/${MIN_OBS_INTAKE_DAYS}일). 지금은 공식 기반 추정이며, 기록이 쌓이면 실측 체중으로 자동 보정됩니다.`,
    })
  }

  if (rate && losing && -rate.pctPerWeek > SAFE_LOSS_PCT_PER_WEEK) {
    w.push({
      level: 'danger',
      text: `감량 속도 주 ${(-rate.pctPerWeek).toFixed(1)}% — 안전 상한(주 ${SAFE_LOSS_PCT_PER_WEEK}%) 초과. 근손실·대사 적응 위험이 커집니다. (시작 1~2주는 수분·글리코겐 손실로 과장될 수 있음)`,
    })
  }

  if (intakeVals.length >= 3) {
    const floor = MIN_SAFE_INTAKE[profile.sex] ?? 1200
    if (meanIntake < floor) {
      w.push({ level: 'danger', text: `최근 평균 섭취 ${Math.round(meanIntake)} kcal — 권장 최저선 ${floor} kcal 미만입니다.` })
    } else if (meanIntake < bmrNow) {
      w.push({ level: 'warn', text: `최근 평균 섭취 ${Math.round(meanIntake)} kcal가 기초대사량 ${Math.round(bmrNow)} kcal보다 낮습니다.` })
    }
  }

  if (observed && Math.abs(observed.deviation) > 0.2) {
    const pct = Math.round(observed.deviation * 100)
    w.push({
      level: 'info',
      text:
        pct > 0
          ? `실측 소모량이 공식보다 ${pct}% 높습니다 → 섭취 기록 누락(간식·음료·소스) 가능성이 큽니다.`
          : `실측 소모량이 공식보다 ${-pct}% 낮습니다 → 활동계수를 낮추거나 섭취량을 재확인하세요.`,
    })
  }

  // 정체기: 2주 넘게 추세가 거의 안 움직이면 원인을 설명한다 (실망해서 그만두지 않게)
  if (losing && rate && Math.abs(rate.kgPerWeek) < 0.1 && loggedDays >= 14) {
    const deficit = intakeVals.length >= 3 && observed ? observed.tdee - meanIntake : null
    let why
    if (observed && observed.deviation < -0.1) {
      why = `실측 소모량이 공식보다 ${Math.round(-observed.deviation * 100)}% 낮습니다 → 대사 적응 가능성. 1~2주 유지 칼로리로 쉬어가는 "다이어트 브레이크"나 걷기 늘리기가 도움이 됩니다.`
    } else if (deficit != null && deficit > 200) {
      why = '기록상으로는 적자인데 체중이 그대로입니다 → 간식·음료·소스 기록 누락이나 수분 저류(짠 음식, 운동 회복, 생리 주기)일 가능성이 큽니다. 지방은 빠지고 있을 수 있어요.'
    } else {
      why = '실제 적자가 거의 없습니다 → 하루 100~200 kcal만 줄이거나 주 2회 걷기를 더하면 다시 움직입니다.'
    }
    w.push({ level: 'info', text: `정체기 (2주간 주 ${fmtKg(rate.kgPerWeek)}kg): 정상적인 과정입니다. ${why}` })
  }

  if (model?.status === 'plateau' && equilibrium != null) {
    w.push({
      level: 'warn',
      text: `현재 습관을 유지하면 체중은 약 ${equilibrium.toFixed(1)} kg에서 멈춥니다 (체중이 줄수록 소모량도 줄기 때문). 목표에 가려면 섭취를 줄이거나 운동을 늘려야 합니다.`,
    })
  }

  if (model?.status === 'wrong') {
    w.push({ level: 'warn', text: `최근 평균 기준으로 에너지 ${losing ? '흑자' : '적자'} 상태입니다. 현재 패턴으로는 목표 반대 방향으로 갑니다.` })
  }

  return w
}
