import Avatar from '../components/Avatar'

// 개발용: ?avatarlab 으로 아바타 변형을 크게 비교 (?avatarlab&face 는 얼굴 확대)
const CASES = [
  ['M', 174, 92, 'start'],
  ['M', 174, 88, 'current'],
  ['M', 174, 70, 'goal'],
  ['F', 162, 78, 'start'],
  ['F', 162, 66, 'current'],
  ['F', 162, 52, 'goal'],
]

export default function AvatarLab() {
  const face = new URLSearchParams(location.search).has('face')
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
