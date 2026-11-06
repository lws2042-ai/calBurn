import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { classifyFood, emojiFor, isAggregate } from './foodClass.js'
import { dietCondition } from './defense.js'

describe('음식 분류', () => {
  it('이름 키워드', () => {
    assert.equal(classifyFood({ name: '치킨 반마리', kcal: 1050 }), 'harmful')
    assert.equal(classifyFood({ name: '닭가슴살 샐러드', kcal: 250 }), 'healthy')
    assert.equal(classifyFood({ name: '김치찌개', kcal: 240 }), 'neutral')
  })
  it('영양 데이터: 고단백·저밀도 → 건강', () => {
    assert.equal(classifyFood({ name: '수육', kcal: 200, amount: 150, unit: 'g', proteinG: 22 }), 'healthy')
  })
  it('국물 요리는 저밀도여도 건강으로 치지 않음', () => {
    assert.equal(classifyFood({ name: '잔치국수', kcal: 480, amount: 550, unit: 'g', proteinG: 14 }), 'neutral')
    assert.equal(classifyFood({ name: '김치찌개', kcal: 420, amount: 500, unit: 'g', proteinG: 22 }), 'neutral')
    assert.equal(emojiFor('닭가슴살 샐러드'), '🥗')
  })
  it('영양 데이터: 고밀도(>320kcal/100g) → 해로움', () => {
    assert.equal(classifyFood({ name: '쿠키류', kcal: 480, amount: 100, unit: 'g' }), 'harmful')
  })
  it('영양 데이터: 나트륨 과다 → 해로움', () => {
    assert.equal(classifyFood({ name: '어떤 국물요리', kcal: 400, amount: 500, unit: 'g', sodiumMg: 2200 }), 'harmful')
  })
  it('간편 기록과 합계는 개별 음식이 아님', () => {
    assert.equal(isAggregate({ name: '하루 식사 합계', kcal: 2000 }), true)
    assert.equal(classifyFood({ name: '간편: 많이', kcal: 2500 }), 'harmful')
    assert.equal(emojiFor('후라이드 치킨'), '🍗')
  })
})

describe('식단 컨디션 → 게임 효과', () => {
  const day = (foods) => ({ foods })
  it('건강 식단이면 버프', () => {
    const entries = {}
    for (let i = 1; i <= 6; i++) entries[`2026-11-0${i}`] = day([{ name: '닭가슴살 샐러드', kcal: 300 }, { name: '고구마', kcal: 200 }])
    const c = dietCondition(entries, '2026-11-06')
    assert.equal(c.tier.id, 'clean')
    assert.ok(c.effects.dmgMult > 1 && c.effects.lifeDelta === 1)
  })
  it('정크 식단이면 패널티', () => {
    const entries = {}
    for (let i = 1; i <= 6; i++) entries[`2026-11-0${i}`] = day([{ name: '치킨', kcal: 1000 }, { name: '맥주', kcal: 400 }])
    const c = dietCondition(entries, '2026-11-06')
    assert.equal(c.tier.id, 'junk')
    assert.ok(c.effects.lifeDelta === -1 && c.effects.cdMult > 1)
    assert.ok(c.pool.some((f) => f.name === '치킨' && f.kind === 'junk'))
  })
  it('기록이 없으면 보통', () => {
    assert.equal(dietCondition({}, '2026-11-06').tier.id, 'none')
  })
})

describe('운동량 → 공격력', () => {
  it('7일 운동 kcal 구간별 보너스, 식단 효과와 곱해짐', async () => {
    const { trainingCondition, combineEffects, dietCondition } = await import('./defense.js')
    const entries = {}
    for (let i = 1; i <= 6; i++) entries[`2026-11-0${i}`] = { foods: [], exercises: [{ type: 'run', distanceKm: 8 }] }
    const t = trainingCondition(entries, '2026-11-06', 80, {}) // 0.95×80×8×6 = 3648 kcal
    assert.ok(t.kcal > 3000 && t.kcal < 5000)
    assert.equal(t.tier.dmgMult, 1.25)
    const fx = combineEffects(dietCondition({}, '2026-11-06'), t)
    assert.equal(fx.dmgMult, 1.25)
    assert.equal(fx.cdMult, 0.9)
  })
  it('운동이 없으면 보너스 없음', async () => {
    const { trainingCondition } = await import('./defense.js')
    assert.equal(trainingCondition({}, '2026-11-06', 80, {}).tier.dmgMult, 1)
  })
})
