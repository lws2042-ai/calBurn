import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { impactOf } from './decision.js'

const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `expected ${b}±${tol}, got ${a}`)
const ctx = { weightKg: 80, intake: 1200, expend: 2400, losing: true, dailyDeficit: 500, etaDays: 100 }

describe('먹기 전 의사결정 피드백', () => {
  it('운동·지방 환산', () => {
    const r = impactOf({ kcal: 760 }, ctx)
    near(r.runKm, 10, 1e-9) // 760 / (0.95×80)
    near(r.fatG, 98.7, 0.1)
  })
  it('목표일 지연 = kcal ÷ 하루 평균 적자', () => {
    const r = impactOf({ kcal: 1000 }, ctx)
    near(r.delayDays, 2, 1e-9)
    near(r.etaAfter, 102, 1e-9)
  })
  it('오늘 적자 → 흑자 전환 감지', () => {
    const r = impactOf({ kcal: 1500 }, ctx)
    assert.equal(r.balanceBefore, -1200)
    assert.equal(r.balanceAfter, 300)
    assert.equal(r.flipsToSurplus, true)
  })
  it('적자가 없으면 지연 일수를 계산하지 않음', () => {
    assert.equal(impactOf({ kcal: 500 }, { ...ctx, dailyDeficit: -100 }).delayDays, null)
  })
  it('나트륨 3,220mg → 내일 수분 +0.6kg', () => {
    near(impactOf({ kcal: 500, sodiumMg: 3220 }, ctx).naKg, 0.6, 1e-9)
  })
})
