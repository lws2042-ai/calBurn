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
        <p className="muted small">기록이 4주 이상 쌓이면 시작됩니다. 2주 전까지의 데이터로 알아낸 내 소모량으로, 그 뒤 2주의 기록이 체중을 얼마나 정확히 예측하는지 검증합니다.</p>
      ) : h.reason === 'few-logs' ? (
        <p className="muted small">최근 14일 중 {h.logged}일만 기록했어요. 10일 이상 기록해야 검증할 수 있습니다.</p>
      ) : (
        <>
          <div className="honesty__bars mono small">
            <span>
              기록으로 예측한 변화 <b>{h.predictedKg >= 0 ? '+' : '−'}{Math.abs(h.predictedKg).toFixed(2)}kg</b>
            </span>
            <span>
              체중계가 말한 실제 변화 <b>{h.actualKg >= 0 ? '+' : '−'}{Math.abs(h.actualKg).toFixed(2)}kg</b>
            </span>
            <span className="muted">하루 평균 오차 {fmtInt(h.errKcalPerDay)} kcal</span>
          </div>
          <p className="small">
            {h.honestNow
              ? `✅ 기록이 체중을 정확히 예측합니다. 오늘 XP ×${h.mult} 보너스 적용 중! (누적 보너스 +${fmtInt(h.bonusXp)} XP)`
              : '기록과 체중이 어긋납니다. 간식·음료·소스를 빠짐없이, 평소처럼 일관되게 적으면 정확도가 올라갑니다.'}
          </p>
        </>
      )}
      <p className="muted small">체중계는 속일 수 없어서, 이 보너스는 꾸준하고 일관되게 기록할 때만 받을 수 있습니다.</p>
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
          <span className="muted small">내 식단·운동이 난이도에 반영됩니다</span>
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
