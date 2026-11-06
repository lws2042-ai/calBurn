import {
  ACCESSORIES,
  AURAS,
  BOTTOM_STYLES,
  CLOTH_COLORS,
  EYE_STYLES,
  FACE_SHAPES,
  HAIR_COLORS,
  HAIR_STYLES,
  resolveLook,
  SHOE_STYLES,
  SKIN_TONES,
  TOP_STYLES,
} from '../lib/avatarLook'
import { ACHIEVEMENTS } from '../lib/game'
import { isLocked, sanitizeLook, UNLOCKS } from '../lib/unlocks'
import Avatar from './Avatar'

const achTitle = (id) => ACHIEVEMENTS.find((a) => a.id === id)?.title ?? id

const FACE_CROP = '50 8 60 60'

/** 아바타 꾸미기: 얼굴·헤어·옷. 바꾸는 즉시 저장된다. */
export default function AvatarCustomizer({ profile, weightKg, onChange, unlocked = new Set() }) {
  const look = sanitizeLook(resolveLook(profile.avatar, profile.sex), unlocked)
  const lockOf = (slot) => (k) => isLocked(slot, k, unlocked)
  const condOf = (slot) => (k) => {
    const u = UNLOCKS.find((x) => x.slot === slot && x.value === k)
    return u ? `🔒 업적 「${achTitle(u.achievement)}」 달성 시 해금` : null
  }
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
        <Group label={`🎁 해금 아이템 ${UNLOCKS.filter((u) => unlocked.has(u.id)).length}/${UNLOCKS.length}`}>
          <div className="unlock-grid">
            {UNLOCKS.map((u) => {
              const on = unlocked.has(u.id)
              return (
                <div key={u.id} className={on ? 'unlock on' : 'unlock'} title={on ? '해금됨' : `업적 「${achTitle(u.achievement)}」 달성 시 해금`}>
                  <div className="unlock__icon">{on ? u.icon : '🔒'}</div>
                  <div className="unlock__label">{u.label}</div>
                  <div className="unlock__cond">{on ? '해금됨' : achTitle(u.achievement)}</div>
                </div>
              )
            })}
          </div>
        </Group>

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
          <Chips items={TOP_STYLES} value={look.top.style} onPick={(k) => set({ top: { ...look.top, style: k } })} locked={lockOf('top')} cond={condOf('top')} />
          <Swatches items={CLOTH_COLORS.map((c) => [c.hex, c.hex, c.label])} value={look.top.color} onPick={(k) => set({ top: { ...look.top, color: k } })} />
        </Group>

        <Group label="하의">
          <Chips items={BOTTOM_STYLES} value={look.bottom.style} onPick={(k) => set({ bottom: { ...look.bottom, style: k } })} />
          <Swatches items={CLOTH_COLORS.map((c) => [c.hex, c.hex, c.label])} value={look.bottom.color} onPick={(k) => set({ bottom: { ...look.bottom, color: k } })} />
        </Group>

        <Group label="신발">
          <Chips items={SHOE_STYLES} value={look.shoes} onPick={(k) => set({ shoes: k })} locked={lockOf('shoes')} cond={condOf('shoes')} />
        </Group>

        <Group label="소품">
          <Chips items={ACCESSORIES} value={look.accessory} onPick={(k) => set({ accessory: k })} locked={lockOf('accessory')} cond={condOf('accessory')} />
        </Group>

        <Group label="오라">
          <Chips items={AURAS} value={look.aura} onPick={(k) => set({ aura: k })} locked={lockOf('aura')} cond={condOf('aura')} />
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

function Chips({ items, value, onPick, locked = () => false, cond = () => null }) {
  return (
    <div className="chips">
      {Object.entries(items).map(([k, label]) => {
        const lk = locked(k)
        return (
          <button
            key={k}
            type="button"
            className={`chip ${value === k ? 'on' : ''} ${lk ? 'locked' : ''}`}
            onClick={() => !lk && onPick(k)}
            disabled={lk}
            title={lk ? cond(k) ?? '' : undefined}
          >
            {lk ? '🔒 ' : ''}
            {label}
          </button>
        )
      })}
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
