// 아바타 아이템 해금: 업적(=행동의 결과)을 달성하면 아바타가 "그런 사람"의 모습이 된다.
// 정체성 보상 — 포인트보다 오래 동기를 유지한다.

/** slot: top(윗옷 스타일) · shoes · accessory · aura */
export const UNLOCKS = [
  { id: 'track', slot: 'top', value: 'track', icon: '🎽', label: '트레이닝복', achievement: 'streak7' },
  { id: 'runner', slot: 'shoes', value: 'runner', icon: '👟', label: '러닝화', achievement: 'trend1' },
  { id: 'sunglasses', slot: 'accessory', value: 'sunglasses', icon: '🕶️', label: '선글라스', achievement: 'fat1' },
  { id: 'headband', slot: 'accessory', value: 'headband', icon: '🎀', label: '헤드밴드', achievement: 'half' },
  { id: 'medal', slot: 'accessory', value: 'medal', icon: '🏅', label: '완주 메달', achievement: 'marathon' },
  { id: 'cap', slot: 'accessory', value: 'cap', icon: '🧢', label: '등산 모자', achievement: 'everest' },
  { id: 'jacket', slot: 'top', value: 'jacket', icon: '🧥', label: '가죽 재킷', achievement: 'streak30' },
  { id: 'crown', slot: 'accessory', value: 'crown', icon: '👑', label: '왕관', achievement: 'goal' },
  { id: 'aura', slot: 'aura', value: 'gold', icon: '✨', label: '골드 오라', achievement: 'goal' },
]

export const unlockForAchievement = (achId) => UNLOCKS.filter((u) => u.achievement === achId)

/** 업적 달성 기록(got: {achId: date}) → 해금된 아이템 id 집합 */
export function unlockedSet(got = {}) {
  return new Set(UNLOCKS.filter((u) => got[u.achievement]).map((u) => u.id))
}

/** 잠긴 값인지 (기본 아이템은 항상 열림) */
export function isLocked(slot, value, unlocked) {
  const item = UNLOCKS.find((u) => u.slot === slot && u.value === value)
  return item ? !unlocked.has(item.id) : false
}

/** 저장된 외형에서 잠긴 아이템은 기본값으로 되돌린다 (데이터가 바뀌어 업적이 사라진 경우 등) */
export function sanitizeLook(look, unlocked) {
  if (!look) return look
  const out = { ...look, top: { ...look.top }, bottom: { ...look.bottom } }
  if (out.top?.style && isLocked('top', out.top.style, unlocked)) out.top.style = 'shirt'
  if (out.shoes && isLocked('shoes', out.shoes, unlocked)) out.shoes = 'basic'
  if (out.accessory && isLocked('accessory', out.accessory, unlocked)) out.accessory = 'none'
  if (out.aura && isLocked('aura', out.aura, unlocked)) out.aura = 'none'
  return out
}
