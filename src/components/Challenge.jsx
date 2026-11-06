import { ACHIEVEMENTS } from '../lib/game'
import { unlockForAchievement } from '../lib/unlocks'
import { fmtInt } from '../lib/format'
import CalorieDefense from './CalorieDefense'
import RealRewards from './RealRewards'

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
            🔥 <b className="mono">{game.streak.current}</b>일 기록 <span className="muted">(2일 휴식 OK)</span>
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
        {game.honesty?.score != null && (
          <div className={`honest-pill small ${game.honesty.honestNow ? 'on' : ''}`}>
            🧾 {game.honesty.honestNow ? `정직한 장부 · XP ×${game.honesty.mult}` : '장부 정확도'}{' '}
            <b className="mono">{Math.round(game.honesty.score * 100)}%</b>
            {!game.honesty.honestNow && <span className="muted"> (70% 이상이면 XP ×{game.honesty.mult})</span>}
          </div>
        )}
        {compact && !game.streak.todayDone && game.streak.current > 0 && game.streak.graceLeft === 0 && (
          <div className="streak-warn small">이틀 쉬었어요. 오늘 기록하면 {game.streak.current}일 스트릭이 이어집니다</div>
        )}
      </div>
    </section>
  )
}

/** 정직한 장부: 2주 전 데이터로 예측한 체중 변화 vs 실제 */
function HonestyCard({ h }) {
  if (!h) return null
  return (
    <section className={`panel honesty ${h.honestNow ? 'honesty--on' : ''}`}>
      <div className="row between" style={{ marginTop: 0 }}>
        <h2 style={{ margin: 0 }}>🧾 정직한 장부</h2>
        {h.score != null && <span className="honesty__score mono">{Math.round(h.score * 100)}%</span>}
      </div>
      {h.score == null ? (
        <p className="muted small">4주 기록 후 시작돼요. 기록이 2주 뒤 체중을 맞히는지 검증해요.</p>
      ) : h.reason === 'few-logs' ? (
        <p className="muted small">최근 14일 중 {h.logged}일 기록 · 10일 이상 필요</p>
      ) : (
        <>
          <div className="honesty__bars small">
            <span>
              예측 <b className="mono">{h.predictedKg >= 0 ? '+' : '−'}{Math.abs(h.predictedKg).toFixed(2)}kg</b>
            </span>
            <span>
              실제 <b className="mono">{h.actualKg >= 0 ? '+' : '−'}{Math.abs(h.actualKg).toFixed(2)}kg</b>
            </span>
            <span className="muted">오차/일 {fmtInt(h.errKcalPerDay)} kcal</span>
          </div>
          <p className="small">
            {h.honestNow
              ? `✅ 정확해요! XP ×${h.mult} 적용 중 (누적 +${fmtInt(h.bonusXp)} XP)`
              : '간식·음료까지 빠짐없이 적으면 올라가요.'}
          </p>
        </>
      )}
      <p className="muted small">70% 이상이면 XP ×1.2</p>
    </section>
  )
}

export default function Challenge({ game, state, analysis, dispatch, rr }) {
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

      {/* 미니게임을 맨 위에: 도전 탭을 열면 바로 게임이 보이게 */}
      <section className="panel game-panel">
        <div className="row between" style={{ marginTop: 0 }}>
          <h2 style={{ margin: 0 }}>🎮 미니게임 · 칼로리 디펜스</h2>
          <span className="muted small">식단·운동이 난이도에 반영</span>
        </div>
        <CalorieDefense
          weightKg={analysis.current}
          profile={state.profile}
          best={state.game?.best ?? 0}
          entries={state.entries}
          today={analysis.today}
          onFinish={(r) => dispatch({ type: 'gameResult', result: r, date: analysis.today })}
        />
      </section>

      {rr && <RealRewards rr={rr} dispatch={dispatch} today={analysis.today} />}

      <HonestyCard h={game.honesty} />

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
        <p className="muted small">굶기(−1,000kcal↓)는 XP 없음</p>
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
              {unlockForAchievement(a.id).length > 0 && (
                <div className="ach__reward">🎁 {unlockForAchievement(a.id).map((u) => `${u.icon} ${u.label}`).join(' ')}</div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
