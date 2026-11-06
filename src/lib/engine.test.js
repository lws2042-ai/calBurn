import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { bmr } from './bmr.js'
import { KCAL_PER_KG } from './constants.js'
import { addDays } from './dates.js'
import { analyze } from './engine.js'
import { exerciseKcal } from './exercise.js'
import { simulateToGoal, trendEta } from './projection.js'
import { buildSeries, intakeOf } from './series.js'
import { linearRegression } from './stats.js'

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} expected ${b}±${tol}, got ${a}`)

const profile = {
  sex: 'M',
  birthYear: 1996,
  heightCm: 175,
  startWeightKg: 80,
  goalWeightKg: 75,
  activityFactor: 1.375,
  startDate: '2026-10-01',
  watchCorrection: 0.8,
}

describe('BMR (Mifflin-St Jeor)', () => {
  it('남성 80kg 175cm 30세 = 1748.75', () => {
    assert.equal(bmr({ sex: 'M', weightKg: 80, heightCm: 175, age: 30 }), 1748.75)
  })
  it('여성은 남성보다 166 kcal 낮다', () => {
    const m = bmr({ sex: 'M', weightKg: 60, heightCm: 165, age: 25 })
    const f = bmr({ sex: 'F', weightKg: 60, heightCm: 165, age: 25 })
    assert.equal(m - f, 166)
  })
})

describe('운동 순소모', () => {
  it('러닝 5km, 70kg → 0.95×70×5 = 332.5', () => {
    near(exerciseKcal({ type: 'run', distanceKm: 5 }, 70), 332.5, 0.01)
  })
  it('등산 60분 + 600m 상승, 70kg → 보행 175 + 위치에너지 ≈ 394', () => {
    near(exerciseKcal({ type: 'hike', minutes: 60, elevationM: 600 }, 70), 175 + 393.9, 1)
  })
  it('수영 보통 60분, 70kg → (8.3−1)×70 = 511', () => {
    near(exerciseKcal({ type: 'swim', minutes: 60, intensity: 'moderate' }, 70), 511, 0.01)
  })
  it('직접 입력은 워치 보정계수 적용', () => {
    assert.equal(exerciseKcal({ type: 'manual', kcal: 500 }, 70, { watchCorrection: 0.8 }), 400)
  })
})

describe('시계열', () => {
  it('음식 기록 없음 = null (0이 아님)', () => {
    assert.equal(intakeOf({ foods: [] }), null)
    assert.equal(intakeOf({ foods: [{ kcal: 0 }] }), 0)
  })
  it('체중이 일정하면 추세도 일정, 미측정일은 추세 유지', () => {
    const s = buildSeries(
      { profile, entries: { '2026-10-01': { weightKg: 80 }, '2026-10-05': { weightKg: 80 } } },
      '2026-10-07',
    )
    assert.equal(s.length, 7)
    assert.ok(s.every((r) => r.trend === 80))
    assert.equal(s[2].weight, null)
  })
  it('선형 감량 시 추세에 지연(lag)이 없다 — Holt 평활', () => {
    const entries = {}
    for (let i = 0; i < 40; i++) entries[addDays('2026-10-01', i)] = { weightKg: 90 - 0.1 * i }
    const s = buildSeries({ profile, entries }, addDays('2026-10-01', 39))
    // 단순 지수평균이면 ~0.9kg 높게 나온다
    near(s.at(-1).trend, 90 - 3.9, 0.15, '추세 = 실제')
  })
  it('미측정일은 기울기로 이어간다', () => {
    const entries = {}
    for (let i = 0; i < 30; i++) entries[addDays('2026-10-01', i)] = { weightKg: 90 - 0.1 * i }
    const s = buildSeries({ profile, entries }, addDays('2026-10-01', 32))
    assert.ok(s.at(-1).trend < s.at(-4).trend, '미측정 3일간 추세 계속 하락')
  })
})

describe('선형회귀', () => {
  it('y = 2x + 1', () => {
    const r = linearRegression([0, 1, 2, 3].map((x) => ({ x, y: 2 * x + 1 })))
    near(r.slope, 2, 1e-12)
    near(r.intercept, 1, 1e-12)
  })
})

/** 실제 소모 trueTdee인 가상 인물이 intake를 days일 먹었을 때의 기록 생성 */
function synthesize({ days, intake, trueTdee, startW = 80, start = '2026-10-01' }) {
  const entries = {}
  let w = startW
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i)
    entries[date] = { weightKg: Math.round(w * 100) / 100, foods: [{ kcal: intake }], exercises: [] }
    w += (intake - trueTdee) / KCAL_PER_KG
  }
  return { profile: { ...profile, startDate: start, startWeightKg: startW }, entries }
}

describe('적응형 TDEE (핵심)', () => {
  it('체중 변화만으로 실제 소모량 2500을 역산한다', () => {
    const state = synthesize({ days: 29, intake: 2000, trueTdee: 2500 })
    const today = addDays('2026-10-01', 28)
    const a = analyze(state, today)
    assert.ok(a.observed, '실측값 계산됨')
    near(a.observed.tdee, 2500, 15, '실측 TDEE')
    assert.equal(a.confidence, 1)
    near(a.base, 2500, 15, '보정 후 기저소모')
    // 주간 속도: −500×7/7700 = −0.4545 kg/주
    near(a.rate.kgPerWeek, (-500 * 7) / KCAL_PER_KG, 0.01, '주간 속도')
  })

  it('데이터 부족(3일)이면 공식값을 그대로 쓴다', () => {
    const state = synthesize({ days: 3, intake: 2000, trueTdee: 2500 })
    const a = analyze(state, '2026-10-03')
    assert.equal(a.observed, null)
    assert.equal(a.base, a.formulaBase)
    assert.ok(a.warnings.some((w) => w.text.includes('데이터 수집 중')))
  })

  it('오늘 밸런스 = 섭취 − (기저 + 운동)', () => {
    const state = synthesize({ days: 1, intake: 2000, trueTdee: 2500 })
    state.entries['2026-10-01'].exercises = [{ type: 'run', distanceKm: 5 }]
    const a = analyze(state, '2026-10-01')
    near(a.todayRow.balance, 2000 - (a.formulaBase + 0.95 * 80 * 5), 1e-6)
  })
})

describe('목표 도달 예측', () => {
  const flat = () => 2500
  it('BMR 고정 시 단순 나눗셈과 일치: 5kg × 7700 / 500 = 77일', () => {
    const r = simulateToGoal({ start: 80, goal: 75, intake: 2000, exercise: 0, baseAt: flat })
    assert.equal(r.status, 'ok')
    near(r.days, 77, 1)
  })
  it('평형체중이 목표보다 높으면 plateau', () => {
    const r = simulateToGoal({ start: 80, goal: 75, intake: 2400, exercise: 0, baseAt: (w) => 2500 + 25 * (w - 80), equilibrium: 76 })
    assert.equal(r.status, 'plateau')
  })
  it('흑자면 감량 목표에 대해 wrong', () => {
    const r = simulateToGoal({ start: 80, goal: 75, intake: 2700, exercise: 0, baseAt: flat })
    assert.equal(r.status, 'wrong')
  })
  it('실측 추세 ETA', () => {
    assert.deepEqual(trendEta({ current: 80, goal: 75, slope: -0.1 }), { status: 'ok', days: 50 })
    assert.deepEqual(trendEta({ current: 80, goal: 75, slope: 0.1 }), { status: 'wrong' })
  })
  it('엔진: 적자 지속 시 대사 감소를 반영해 단순 계산보다 오래 걸린다', () => {
    const state = synthesize({ days: 29, intake: 2000, trueTdee: 2500 })
    const a = analyze(state, addDays('2026-10-01', 28))
    assert.ok(['ok', 'plateau'].includes(a.model.status))
    if (a.model.status === 'ok') {
      const naive = ((a.current - 75) * KCAL_PER_KG) / (a.base - 2000)
      assert.ok(a.model.days >= naive, `${a.model.days} >= ${naive}`)
    }
  })
})
