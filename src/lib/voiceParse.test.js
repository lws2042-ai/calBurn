import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseKoreanNumber, parseUtterance } from './voiceParse.js'

describe('한글 숫자', () => {
  it('변환', () => {
    assert.equal(parseKoreanNumber('칠십육점삼'), 76.3)
    assert.equal(parseKoreanNumber('백이'), 102)
    assert.equal(parseKoreanNumber('76.3'), 76.3)
    assert.equal(parseKoreanNumber('76점3'), 76.3)
    assert.equal(parseKoreanNumber('오'), 5)
    assert.equal(parseKoreanNumber('김치'), null)
  })
})

describe('음성 문장 해석', () => {
  it('체중', () => {
    assert.equal(parseUtterance('몸무게 76.3').weightKg, 76.3)
    assert.equal(parseUtterance('체중 칠십육 점 삼 킬로').weightKg, 76.3)
    assert.equal(parseUtterance('76.3킬로').weightKg, 76.3)
  })
  it('음식 여러 개와 수량', () => {
    const r = parseUtterance('점심에 김치찌개랑 공기밥 먹었어')
    assert.deepEqual(r.foods.map((f) => f.query), ['김치찌개', '공기밥'])
    const c = parseUtterance('치킨 반 마리랑 맥주 두 잔 마셨어')
    assert.deepEqual(c.foods, [
      { query: '치킨', qty: 0.5 },
      { query: '맥주', qty: 2 },
    ])
  })
  it('운동', () => {
    assert.deepEqual(parseUtterance('러닝 5키로 뛰었어').exercises, [{ type: 'run', distanceKm: 5 }])
    assert.deepEqual(parseUtterance('수영 40분 했어').exercises, [{ type: 'swim', minutes: 40, intensity: 'moderate' }])
    assert.equal(parseUtterance('등산 2시간').exercises[0].minutes, 120)
  })
  it('한 문장에 전부', () => {
    const r = parseUtterance('몸무게 76.3 아침에 사과 하나 먹고 러닝 5km 했어')
    assert.equal(r.weightKg, 76.3)
    assert.deepEqual(r.foods, [{ query: '사과', qty: 1 }])
    assert.equal(r.exercises[0].distanceKm, 5)
  })
  it('직접 kcal', () => {
    assert.equal(parseUtterance('간식 300칼로리').kcal, 300)
  })
})

describe('흔한 음식 사전', async () => {
  const { matchCommon } = await import('./commonFoods.js')
  it('짧게 말해도 정확히 매칭', () => {
    assert.equal(matchCommon('치킨').name, '후라이드 치킨')
    assert.equal(matchCommon('맥주').name, '맥주')
    assert.equal(matchCommon('공기밥').name, '쌀밥')
    assert.equal(matchCommon('비빔밥').name, '비빔밥') // "밥"이 가로채지 않음
    assert.equal(matchCommon('밥').name, '쌀밥')
    assert.equal(matchCommon('양념치킨').name, '후라이드 치킨')
    assert.equal(matchCommon('마라탕'), null)
  })
})
