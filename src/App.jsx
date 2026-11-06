import { useEffect, useMemo, useState } from 'react'
import Challenge from './components/Challenge'
import Dashboard from './components/Dashboard'
import History from './components/History'
import LogDay from './components/LogDay'
import ProfileForm from './components/ProfileForm'
import Settings from './components/Settings'
import { addDays, todayISO } from './lib/dates'
import { analyze } from './lib/engine'
import { ACHIEVEMENTS, gamify } from './lib/game'
import { buildDemoState } from './lib/demo'
import { applyTheme, themeFromSettings } from './lib/themes'
import { realRewardContext } from './lib/realRewards'
import { unlockedSet, unlockForAchievement } from './lib/unlocks'
import { useCalBurn } from './store/useCalBurn'

const TABS = [
  ['dashboard', '대시보드'],
  ['log', '기록'],
  ['challenge', '🎮 도전'],
  ['history', '히스토리'],
  ['settings', '설정'],
]
const SEEN_KEY = 'calburn:seenAchievements'

function App() {
  const [state, dispatch] = useCalBurn()
  const today = todayISO()
  const theme = themeFromSettings(state.settings)
  useEffect(() => applyTheme(theme), [theme])

  if (!state.profile) return <Onboarding today={today} dispatch={dispatch} />
  return <Main state={state} dispatch={dispatch} today={today} />
}

function loadSeen(fallback) {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function Main({ state, dispatch, today }) {
  const [tab, setTab] = useState(() => {
    const h = window.location.hash.slice(1)
    return TABS.some(([k]) => k === h) ? h : 'dashboard'
  })
  const [date, setDate] = useState(today)
  const analysis = useMemo(() => analyze(state, today), [state, today])
  const game = useMemo(() => gamify(state, analysis), [state, analysis])
  const unlocked = useMemo(() => unlockedSet(game.achievements.got), [game])
  const rr = useMemo(() => realRewardContext(state, analysis), [state, analysis])
  const openRealRewards = () => {
    setTab('challenge')
    setTimeout(() => document.getElementById('real-rewards')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  // 새로 달성한 업적 알림 (처음 실행 시 이미 달성한 것은 알리지 않음)
  const got = game.achievements.got
  const [seen, setSeen] = useState(() => loadSeen(Object.keys(got)))
  // 최근 이틀 안에 달성한 것만 알림 (샘플 데이터·백업 복원 시 과거 업적이 쏟아지지 않게)
  const recent = addDays(today, -1)
  const fresh = ACHIEVEMENTS.find((a) => got[a.id] && got[a.id] >= recent && !seen.includes(a.id))

  function markSeen(id) {
    const next = [...seen, id]
    setSeen(next)
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (!fresh) return
    const t = setTimeout(() => markSeen(fresh.id), 4500)
    return () => clearTimeout(t)
  })

  const openLog = (d = today) => {
    setDate(d)
    setTab('log')
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true" />
          Cal<span className="glow-text">Burn</span>
          <span className="brand__lv mono">LV {game.level}</span>
        </div>
        <nav className="tabs" role="tablist">
          {TABS.map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'tab on' : 'tab'} onClick={() => setTab(k)}>
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="content">
        {tab === 'dashboard' && (
          <Dashboard analysis={analysis} game={game} profile={state.profile} entries={state.entries} state={state} dispatch={dispatch} unlocked={unlocked} rr={rr} onRealRewards={openRealRewards} onLog={() => openLog(today)} onChallenge={() => setTab('challenge')} onCustomize={() => setTab('settings')} />
        )}
        {tab === 'log' && (
          <LogDay state={state} dispatch={dispatch} analysis={analysis} date={date} setDate={setDate} today={today} />
        )}
        {tab === 'challenge' && <Challenge game={game} state={state} analysis={analysis} dispatch={dispatch} rr={rr} />}
        {tab === 'history' && <History analysis={analysis} onOpen={openLog} />}
        {tab === 'settings' && <Settings state={state} dispatch={dispatch} analysis={analysis} today={today} unlocked={unlocked} />}
      </main>

      {fresh && (
        <button className="ach-toast" onClick={() => markSeen(fresh.id)}>
          <span className="ach-toast__icon">{fresh.icon}</span>
          <span>
            <small>업적 달성</small>
            <b>{fresh.title}</b>
            <span className="muted small">{fresh.desc}</span>
            {unlockForAchievement(fresh.id).length > 0 && (
              <span className="reward">🎁 아바타 아이템 해금: {unlockForAchievement(fresh.id).map((u) => `${u.icon} ${u.label}`).join(', ')}</span>
            )}
          </span>
        </button>
      )}
    </div>
  )
}

function Onboarding({ today, dispatch }) {
  return (
    <div className="app">
      <main className="content onboarding">
        <div className="brand brand--lg">
          <span className="brand__mark" aria-hidden="true" />
          Cal<span className="glow-text">Burn</span>
        </div>
        <p className="lead">
          섭취 − 소모 = 체중 변화.
          <br />
          <span className="muted">숫자로 보면 무너지지 않습니다. 기본 정보 6가지만 입력하세요.</span>
        </p>
        <section className="panel">
          <ProfileForm
            isOnboarding
            submitLabel="시작하기"
            onSubmit={(p) => {
              dispatch({ type: 'setProfile', profile: { ...p, startDate: today } })
              dispatch({ type: 'setWeight', date: today, weightKg: p.startWeightKg })
            }}
          />
        </section>
        <button className="btn btn--ghost btn--block demo-btn" onClick={() => dispatch({ type: 'replace', state: buildDemoState(today) })}>
          데모 데이터로 먼저 둘러보기 →
        </button>
      </main>
    </div>
  )
}

export default App
