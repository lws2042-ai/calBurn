import { ACHIEVEMENTS } from '../lib/game'
import { fmtInt } from '../lib/format'
import CalorieDefense from './CalorieDefense'

export function LevelCard({ game, compact = false, onClick }) {
  const pct = (game.cur / game.need) * 100
  const doneQuests = game.quests.filter((q) => q.done).length
  return (
    <section className={`panel level ${compact ? 'level--compact' : ''}`} onClick={onClick} role={onClick ? 'button' : undefined}>
      <div className="level__badge mono">
        <small>LV</small>
        {game.level}
      </div>
      <div className="level__body">
        <div className="row between level__top">
          <strong>
            {game.title} <span className="muted small mono">{fmtInt(game.xp)} XP</span>
          </strong>
          <span className={`streak ${game.streak.current ? 'on' : ''}`} title={`최고 ${game.streak.best}일 · 이틀까지는 쉬어도 유지`}>
            🔥 <b className="mono">{game.streak.current}</b>일 기록 <span className="muted">(2일 휴식 허용)</span>
          </span>
        </div>
        <div className="xpbar">
          <span style={{ width: `${pct}%` }} />
        </div>
        <div className="row between muted small level__sub">
          <span className="mono">
            다음 레벨까지 {fmtInt(game.need - game.cur)} XP · 오늘 +{game.todayXp}
          </span>
          {compact && (
            <span>
              오늘 퀘스트 <b className="mono">{doneQuests}/{game.quests.length}</b>
            </span>
          )}
        </div>
        {compact && !game.streak.todayDone && game.streak.current > 0 && game.streak.graceLeft === 0 && (
          <div className="streak-warn small">이틀 쉬었어요. 오늘 기록하면 {game.streak.current}일 스트릭이 이어집니다</div>
        )}
      </div>
    </section>
  )
}

export default function Challenge({ game, state, analysis, dispatch }) {
  const { got, progress } = game.achievements
  const hints = {
    streak7: `${progress.run}/7일`,
    streak30: `${progress.run}/30일`,
    fat1: `${fmtInt(Math.max(0, progress.deficit))}/7,700 kcal`,
    fat5: `${fmtInt(Math.max(0, progress.deficit))}/38,500 kcal`,
    marathon: `${progress.runKm.toFixed(1)}/42.2 km`,
    everest: `${fmtInt(progress.climbM)}/8,848 m`,
    seal: `${Math.round(progress.swimMin / 6) / 10}/10 시간`,
    calibrated: `${progress.loggedDays}/21일`,
    defense: `최고 ${fmtInt(state.game?.best ?? 0)}/3,000`,
    half: `${Math.round(analysis.progress * 100)}/50%`,
    goal: `${Math.round(analysis.progress * 100)}/100%`,
  }
  const unlocked = ACHIEVEMENTS.filter((a) => got[a.id]).length

  return (
    <div className="stack">
      <LevelCard game={game} />

      <section className="panel">
        <h2>오늘의 퀘스트</h2>
        <ul className="quests">
          {game.quests.map((q) => (
            <li key={q.id} className={q.done ? 'done' : ''}>
              <span className="quest__check">{q.done ? '✓' : ''}</span>
              <span>{q.label}</span>
              <span className="mono muted">+{q.xp} XP</span>
            </li>
          ))}
        </ul>
        <p className="muted small">보상은 체중이 아니라 행동에 줍니다. 1,000 kcal 넘는 적자나 최저 섭취선 아래는 XP가 없습니다.</p>
      </section>

      <section className="panel">
        <div className="row between">
          <h2>업적</h2>
          <span className="muted small mono">
            {unlocked}/{ACHIEVEMENTS.length}
          </span>
        </div>
        <div className="achievements">
          {ACHIEVEMENTS.map((a) => (
            <div key={a.id} className={got[a.id] ? 'ach on' : 'ach'}>
              <div className="ach__icon">{a.icon}</div>
              <div className="ach__title">{a.title}</div>
              <div className="ach__desc muted">{a.desc}</div>
              <div className="ach__meta mono">{got[a.id] ? got[a.id] : (hints[a.id] ?? '잠김')}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>미니게임 · 칼로리 디펜스</h2>
        <CalorieDefense
          weightKg={analysis.current}
          profile={state.profile}
          best={state.game?.best ?? 0}
          entries={state.entries}
          today={analysis.today}
          onFinish={(r) => dispatch({ type: 'gameResult', result: r, date: analysis.today })}
        />
      </section>
    </div>
  )
}
