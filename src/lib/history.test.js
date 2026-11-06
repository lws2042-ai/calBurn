import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { addDays } from './dates.js'
import { monthlySummary } from './history.js'

describe('월별 요약', () => {
  it('월 경계로 나누고 추세 변화를 이어서 계산', () => {
    const series = []
    for (let i = 0; i < 59; i++) {
      const date = addDays('2026-01-01', i) // 1월 31일 + 2월 28일
      series.push({ date, weight: 90 - i * 0.1, trend: 90 - i * 0.1, intake: 2000, exercise: 100, balance: -500 })
    }
    const m = monthlySummary(series)
    assert.equal(m.length, 2)
    assert.equal(m[0].month, '2026-01')
    assert.equal(m[0].days, 31)
    assert.ok(Math.abs(m[0].change - -3.0) < 1e-9) // 90 → 87.0
    assert.ok(Math.abs(m[1].change - -2.8) < 1e-9) // 87.0 → 84.2
    assert.equal(m[1].avgIntake, 2000)
    assert.equal(m[1].totalBalance, -500 * 28)
  })
})
