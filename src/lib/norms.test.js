import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ageCode, ageLabel, peerNorm, percentileOf } from './norms.js'

describe('또래 BMI 비교', () => {
  it('나이 → 연령대 코드', () => {
    assert.equal(ageCode(20), 5)
    assert.equal(ageCode(36), 8)
    assert.equal(ageCode(90), 18)
    assert.equal(ageLabel(8), '35~39세')
  })
  it('백분위 보간', () => {
    const q = Array.from({ length: 101 }, (_, i) => 20 + i * 0.1) // 20.0 ~ 30.0
    assert.equal(percentileOf(19, q), 0)
    assert.equal(percentileOf(31, q), 100)
    assert.ok(Math.abs(percentileOf(25, q) - 50) < 1e-6)
  })
  it('실제 표: 30대 초반 남성 중앙값 근처면 50백분위 근처', () => {
    const p = peerNorm('M', 32)
    assert.equal(p.label, '30~34세 남성')
    assert.ok(p.n > 10000)
    const mid = p.pctOf(p.median)
    assert.ok(mid > 35 && mid < 65, `got ${mid}`)
    assert.ok(p.pctOf(35) > 95)
    assert.ok(p.pctOf(18) < 5)
  })
})
