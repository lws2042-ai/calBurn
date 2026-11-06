import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { healthGains, priceOf, rewardProgress, savings } from './realRewards.js'

describe('건강 저금통', () => {
  it('음식 가격 매칭', () => {
    assert.equal(priceOf({ name: '후라이드 치킨 반마리' }), 21000)
    assert.equal(priceOf({ name: '닭가슴살 샐러드' }), 0)
  })
  it('해로운 음식 지출이 기준보다 적으면 그만큼 절약', () => {
    const entries = {}
    // 2026-11-02(월) ~ 11-08(일): 치킨 1번(21,000) + 건강식
    for (let i = 2; i <= 8; i++) {
      const d = `2026-11-0${i}`
      entries[d] = { foods: [{ name: '닭가슴살 샐러드', kcal: 300 }, { name: '고구마', kcal: 200 }] }
    }
    entries['2026-11-06'].foods.push({ name: '후라이드 치킨', kcal: 1000 })
    const s = savings(entries, '2026-11-09', 40000, 2)
    const w = s.weeks.find((x) => x.week === '2026-11-02')
    assert.equal(w.spent, 21000)
    assert.equal(w.saved, 19000)
  })
  it('하루 합계만 있는 주는 측정하지 않음', () => {
    const entries = { '2026-11-03': { foods: [{ name: '하루 식사 합계', kcal: 2000 }] } }
    assert.equal(savings(entries, '2026-11-09', 40000, 2).weeks.length, 0)
  })
})

describe('건강 효과', () => {
  it('10kg 감량 → 무릎 걸음당 −40kg, 혈압 약 −10, 10% 구간 도달(100kg 시작)', () => {
    const h = healthGains(100, 90)
    assert.equal(h.kneePerStep, 40)
    assert.equal(h.bpMmHg, 10)
    assert.deepEqual(h.thresholds.map((t) => t.reached), [true, true, true])
  })
  it('체중이 늘면 효과 0', () => {
    assert.equal(healthGains(80, 82).lossKg, 0)
  })
})

describe('보상 계약서', () => {
  it('진행률 계산', () => {
    assert.equal(rewardProgress({ type: 'kg', target: 4 }, { lossKg: 2 }).progress, 0.5)
    assert.equal(rewardProgress({ type: 'money', target: 50000 }, { saved: 60000 }).progress, 1)
    assert.equal(rewardProgress({ type: 'days', target: 30 }, { loggedDays: 15 }).progress, 0.5)
  })
})
