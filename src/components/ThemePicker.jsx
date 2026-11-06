import { THEMES } from '../lib/themes'

export default function ThemePicker({ value, onPick }) {
  return (
    <div className="themes">
      {THEMES.map((t) => (
        <button key={t.id} className={value === t.id ? 'theme-card on' : 'theme-card'} onClick={() => onPick(t.id)}>
          <div className="theme-card__swatch" style={{ background: `linear-gradient(135deg, ${t.bg}, ${t.panel})` }}>
            <span className="acc" style={{ background: t.accent, boxShadow: `0 0 10px ${t.accent}` }} />
            <span style={{ background: t.text }} />
            <span style={{ background: t.panel, border: `1px solid ${t.accent}55` }} />
          </div>
          <div className="theme-card__name">
            {t.name}
            {value === t.id && <span className="c-good">✓</span>}
          </div>
        </button>
      ))}
    </div>
  )
}
