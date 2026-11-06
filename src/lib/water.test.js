import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { baselineFor, dayNutrients, DEFAULT_BASELINE, predictWater } from './water.js'

const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `expected ${b}±${tol}, got ${a}`)

describe('수분 예측 (나트륨·탄수화물)', () => {
  it('평소와 같으면 변화 0', () => {
    const w = predictWater({ sodiumMg: 3200, carbsG: 280, coverage: 1 }, { sodiumMg: 3200, carbsG: 280 })
    near(w.total, 0, 1e-9)
  })
  it('나트륨 +3.22g → 물 1L × 60% = +0.6kg', () => {
    const w = predictWater({ sodiumMg: 3200 + 3220, carbsG: 280, coverage: 1 }, { sodiumMg: 3200, carbsG: 280 })
    near(w.naKg, 0.6, 1e-9)
    near(w.total, 0.6, 1e-9)
  })
  it('탄수화물 +200g → 글리코겐 100g + 물 300g = +0.4kg', () => {
    const w = predictWater({ sodiumMg: 3200, carbsG: 480, coverage: 1 }, { sodiumMg: 3200, carbsG: 280 })
    near(w.carbKg, 0.4, 1e-9)
  })
  it('저탄수 → 음수(체중 감소처럼 보임)', () => {
    const w = predictWater({ sodiumMg: 3200, carbsG: 80, coverage: 1 }, { sodiumMg: 3200, carbsG: 280 })
    assert.ok(w.total < 0)
  })
  it('나트륨 정보가 부족한 날(직접 kcal 입력 위주)은 예측하지 않음', () => {
    assert.equal(predictWater({ sodiumMg: 500, carbsG: 50, coverage: 0.3 }, DEFAULT_BASELINE), null)
  })
  it('하루 합계·충분도 계산', () => {
    const n = dayNutrients({
      foods: [
        { kcal: 600, sodiumMg: 2000, carbsG: 80 },
        { kcal: 400 }, // 직접 입력: 영양정보 없음
      ],
    })
    assert.equal(n.sodiumMg, 2000)
    assert.equal(n.carbsG, 80)
    near(n.coverage, 0.6, 1e-9)
  })
  it('기준선: 3일 이상 데이터가 있으면 개인 평균', () => {
    const entries = {}
    for (const [d, na] of [['2026-11-01', 2000], ['2026-11-02', 4000], ['2026-11-03', 3000]]) {
      entries[d] = { foods: [{ kcal: 2000, sodiumMg: na, carbsG: 250 }] }
    }
    const b = baselineFor(entries, '2026-11-04')
    assert.equal(b.personal, true)
    assert.equal(b.sodiumMg, 3000)
    assert.equal(b.carbsG, 250)
  })
})
