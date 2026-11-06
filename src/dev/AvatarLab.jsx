import Avatar from '../components/Avatar'

// 개발용: ?avatarlab 체형 비교 · ?avatarlab&face 얼굴 확대 · ?avatarlab&items 해금 아이템 비교
const CASES = [
  ['M', 174, 92, 'start'],
  ['M', 174, 88, 'current'],
  ['M', 174, 70, 'goal'],
  ['F', 162, 78, 'start'],
  ['F', 162, 66, 'current'],
  ['F', 162, 52, 'goal'],
]

const ITEMS = [
  ['트레이닝복', { top: { style: 'track', color: '#1f3b63' } }],
  ['가죽 재킷', { top: { style: 'jacket', color: '#e8e4da' } }],
  ['러닝화', { shoes: 'runner' }],
  ['선글라스', { accessory: 'sunglasses' }],
  ['헤드밴드', { accessory: 'headband' }],
  ['완주 메달', { accessory: 'medal' }],
  ['등산 모자', { accessory: 'cap' }],
  ['왕관 + 골드 오라', { accessory: 'crown', aura: 'gold' }],
]

export default function AvatarLab() {
  const q = new URLSearchParams(location.search)
  if (q.has('items')) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: 16 }}>
        {ITEMS.map(([label, look]) => (
          <div key={label} style={{ textAlign: 'center', color: '#9ab' }}>
            <Avatar sex="M" heightCm={174} weightKg={78} variant="current" look={look} size={380} />
            <div>{label}</div>
          </div>
        ))}
      </div>
    )
  }
  const face = q.has('face')
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, padding: 16 }}>
      {CASES.map(([sex, h, w, v]) => (
        <div key={sex + v} style={{ textAlign: 'center', color: '#9ab' }}>
          {face ? (
            <Avatar sex={sex} heightCm={175} weightKg={w * (175 / h) ** 2} variant={v} size={420} crop="50 8 60 60" />
          ) : (
            <Avatar sex={sex} heightCm={h} weightKg={w} variant={v} size={560} />
          )}
          <div>
            {sex} {h}cm {w}kg {v}
          </div>
        </div>
      ))}
    </div>
  )
}
