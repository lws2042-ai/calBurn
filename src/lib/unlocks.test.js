import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isLocked, sanitizeLook, unlockedSet, unlockForAchievement } from './unlocks.js'

describe('아바타 아이템 해금', () => {
  it('업적 달성 → 해당 아이템 해금', () => {
    const u = unlockedSet({ streak7: '2026-01-07', fat1: '2026-01-27' })
    assert.ok(u.has('track') && u.has('sunglasses'))
    assert.ok(!u.has('jacket'))
  })
  it('목표 달성은 왕관과 골드 오라 두 개', () => {
    assert.deepEqual(unlockForAchievement('goal').map((x) => x.id), ['crown', 'aura'])
  })
  it('기본 아이템은 잠기지 않음', () => {
    assert.equal(isLocked('top', 'shirt', new Set()), false)
    assert.equal(isLocked('top', 'jacket', new Set()), true)
  })
  it('잠긴 아이템을 착용 중이면 기본값으로 되돌림', () => {
    const look = { top: { style: 'jacket', color: '#000' }, bottom: { style: 'jeans' }, accessory: 'crown', shoes: 'runner', aura: 'gold' }
    const s = sanitizeLook(look, unlockedSet({ trend1: '2026-01-19' }))
    assert.equal(s.top.style, 'shirt')
    assert.equal(s.accessory, 'none')
    assert.equal(s.shoes, 'runner') // 해금됨 → 유지
    assert.equal(s.aura, 'none')
  })
})
