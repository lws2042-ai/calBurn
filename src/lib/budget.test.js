import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { weekStart, weeklyBudget } from './budget.js'

describe('주간 예산', () => {
  it('주 시작은 월요일', () => {
    assert.equal(weekStart('2026-11-06'), '2026-11-02') // 금 → 월
    assert.equal(weekStart('2026-11-08'), '2026-11-02') // 일 → 월
    assert.equal(weekStart('2026-11-02'), '2026-11-02')
  })

  it('이벤트가 없으면 매일 같은 목표', () => {
    const b = weeklyBudget({ today: '2026-11-02', maintenance: 2500, deficit: 500, intakeOf: () => null })
    assert.equal(b.weekBudget, 14000)
    assert.ok(b.days.every((d) => Math.abs(d.budget - 2000) < 1e-9))
  })

  it('금요일 회식(+1200)을 남은 평일이 나눠서 흡수', () => {
    const b = weeklyBudget({
      today: '2026-11-02',
      maintenance: 2500,
      deficit: 500,
      intakeOf: () => null,
      plans: { '2026-11-06': { label: '회식', extraKcal: 1200 } },
    })
    const fri = b.days.find((d) => d.date === '2026-11-06')
    assert.equal(fri.budget, 3200)
    // 나머지 6일이 1200을 나눠 부담 → 하루 200 감소
    assert.ok(Math.abs(b.normalBudget - 1800) < 1e-9)
    // 주 총량은 그대로
    const total = b.days.reduce((s, d) => s + d.budget, 0)
    assert.ok(Math.abs(total - 14000) < 1e-9)
  })

  it('지난 날 과식은 남은 날 예산을 줄인다', () => {
    const b = weeklyBudget({ today: '2026-11-04', maintenance: 2500, deficit: 500, intakeOf: (d) => (d < '2026-11-04' ? 2600 : null) })
    // 월·화 각 600 초과 = 1200 → 남은 5일이 240씩 부담
    assert.equal(b.pastOver, 1200)
    assert.ok(Math.abs(b.normalBudget - 1760) < 1e-9)
  })

  it('안전 최저선 아래로는 내리지 않고 표시', () => {
    const b = weeklyBudget({ today: '2026-11-07', maintenance: 2000, deficit: 750, intakeOf: (d) => (d < '2026-11-07' ? 2600 : null), sex: 'M' })
    assert.equal(b.floorHit, true)
    assert.equal(b.normalBudget, 1500)
  })
})
