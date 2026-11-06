import {
  BOTTOM_STYLES,
  CLOTH_COLORS,
  EYE_STYLES,
  FACE_SHAPES,
  HAIR_COLORS,
  HAIR_STYLES,
  resolveLook,
  SKIN_TONES,
  TOP_STYLES,
} from '../lib/avatarLook'
import Avatar from './Avatar'

const FACE_CROP = '50 8 60 60'

/** 아바타 꾸미기: 얼굴·헤어·옷. 바꾸는 즉시 저장된다. */
export default function AvatarCustomizer({ profile, weightKg, onChange }) {
  const look = resolveLook(profile.avatar, profile.sex)
  const set = (patch) => onChange({ ...look, ...patch })
  const base = { sex: profile.sex, heightCm: profile.heightCm }

  return (
    <div className="customizer">
      <div className="customizer__preview">
        <div className="customizer__face">
          <Avatar {...base} weightKg={weightKg} variant="current" look={look} size={170} crop={FACE_CROP} />
        </div>
        <div className="customizer__bodies">
          <figure>
            <Avatar {...base} weightKg={weightKg} variant="current" look={look} size={190} />
            <figcaption className="muted small">지금</figcaption>
          </figure>
          <figure>
            <Avatar {...base} weightKg={profile.goalWeightKg} variant="goal" look={look} size={190} />
            <figcaption className="small c-good">목표</figcaption>
          </figure>
        </div>
      </div>

      <div className="customizer__opts">
        <Group label="헤어스타일">
          <div className="thumbs">
            {Object.entries(HAIR_STYLES).map(([k, label]) => (
              <button key={k} className={look.hairStyle === k ? 'thumb on' : 'thumb'} onClick={() => set({ hairStyle: k })} title={label}>
                <Avatar {...base} weightKg={weightKg} variant="current" look={{ ...look, hairStyle: k }} size={58} crop={FACE_CROP} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </Group>

        <Group label="머리색">
          <Swatches items={Object.entries(HAIR_COLORS).map(([k, v]) => [k, v.base, v.label])} value={look.hairColor} onPick={(k) => set({ hairColor: k })} />
        </Group>

        <Group label="피부톤">
          <Swatches items={Object.entries(SKIN_TONES).map(([k, v]) => [k, v.base, v.label])} value={look.skin} onPick={(k) => set({ skin: k })} />
        </Group>

        <div className="grid-2">
          <Group label="얼굴형">
            <Chips items={FACE_SHAPES} value={look.face} onPick={(k) => set({ face: k })} />
          </Group>
          <Group label="눈매">
            <Chips items={EYE_STYLES} value={look.eyes} onPick={(k) => set({ eyes: k })} />
          </Group>
        </div>

        <Group label="안경">
          <Chips items={{ off: '없음', on: '착용' }} value={look.glasses ? 'on' : 'off'} onPick={(k) => set({ glasses: k === 'on' })} />
        </Group>

        <Group label="윗옷">
          <Chips items={TOP_STYLES} value={look.top.style} onPick={(k) => set({ top: { ...look.top, style: k } })} />
          <Swatches items={CLOTH_COLORS.map((c) => [c.hex, c.hex, c.label])} value={look.top.color} onPick={(k) => set({ top: { ...look.top, color: k } })} />
        </Group>

        <Group label="하의">
          <Chips items={BOTTOM_STYLES} value={look.bottom.style} onPick={(k) => set({ bottom: { ...look.bottom, style: k } })} />
          <Swatches items={CLOTH_COLORS.map((c) => [c.hex, c.hex, c.label])} value={look.bottom.color} onPick={(k) => set({ bottom: { ...look.bottom, color: k } })} />
        </Group>

        <button className="btn btn--ghost small-btn" onClick={() => onChange(null)}>
          기본값으로
        </button>
      </div>
    </div>
  )
}

function Group({ label, children }) {
  return (
    <div className="opt-group">
      <div className="opt-group__label">{label}</div>
      {children}
    </div>
  )
}

function Chips({ items, value, onPick }) {
  return (
    <div className="chips">
      {Object.entries(items).map(([k, label]) => (
        <button key={k} type="button" className={value === k ? 'chip on' : 'chip'} onClick={() => onPick(k)}>
          {label}
        </button>
      ))}
    </div>
  )
}

function Swatches({ items, value, onPick }) {
  return (
    <div className="swatches">
      {items.map(([k, color, label]) => (
        <button key={k} type="button" className={value === k ? 'swatch on' : 'swatch'} style={{ background: color }} onClick={() => onPick(k)} title={label} aria-label={label} />
      ))}
    </div>
  )
}
