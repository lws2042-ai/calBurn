import { useState } from 'react'
import { shortDate } from '../lib/dates'
import { fmtInt } from '../lib/format'
import { REWARD_PRESETS, REWARD_TYPES } from '../lib/realRewards'

/** 대시보드 한 줄 요약 */
export function RealRewardStrip({ rr, onOpen }) {
  const next = rr.rewards.filter((r) => !r.claimedAt).sort((a, b) => b.progress - a.progress)[0]
  return (
    <button className="rr-strip" onClick={onOpen}>
      <span>
        💰 이번 주 <b className="mono">₩{fmtInt(rr.sv.thisWeek?.saved ?? 0)}</b> 절약
      </span>
      {next && (
        <span>
          {next.emoji} {next.title}까지 <b className="mono">{Math.round(next.progress * 100)}%</b>
        </span>
      )}
      {rr.health.lossKg > 0 && (
        <span>
          🦵 무릎 걸음당 <b className="mono">−{fmtInt(rr.health.kneePerStep)}kg</b>
        </span>
      )}
      <span className="rr-strip__more">현실 보상 보기 →</span>
    </button>
  )
}

export default function RealRewards({ rr, dispatch, today }) {
  return (
    <section className="panel real-rewards" id="real-rewards">
      <h2>💎 현실 보상</h2>
      <RewardContracts rewards={rr.rewards} dispatch={dispatch} today={today} />
      <PiggyBank sv={rr.sv} baseline={rr.baseline} dispatch={dispatch} />
      <HealthReport h={rr.health} />
    </section>
  )
}

// ── ① 나에게 주는 보상 계약서 ─────────────────────
function RewardContracts({ rewards, dispatch, today }) {
  const [adding, setAdding] = useState(false)
  return (
    <div className="rr-block">
      <div className="row between" style={{ marginTop: 0 }}>
        <h3>🎁 나에게 주는 보상</h3>
        {!adding && (
          <button className="btn small-btn" onClick={() => setAdding(true)}>
            + 보상 약속하기
          </button>
        )}
      </div>
      <p className="muted small">목표 달성 시 나에게 줄 선물</p>
      {adding && (
        <RewardForm
          onAdd={(reward) => {
            dispatch({ type: 'addReward', reward, date: today })
            setAdding(false)
          }}
          onCancel={() => setAdding(false)}
        />
      )}
      {rewards.length === 0 && !adding && <p className="muted small">아직 약속한 보상이 없어요.</p>}
      <div className="contracts">
        {rewards.map((r) => {
          const done = r.progress >= 1
          return (
            <div key={r.id} className={`contract ${done ? 'done' : ''} ${r.claimedAt ? 'claimed' : ''}`}>
              <div className="contract__emoji">{r.emoji}</div>
              <div className="contract__body">
                <div className="row between" style={{ marginTop: 0 }}>
                  <b>{r.title}</b>
                  <button className="icon-btn" onClick={() => dispatch({ type: 'removeReward', id: r.id })} aria-label="삭제">
                    ✕
                  </button>
                </div>
                <div className="muted small">
                  {REWARD_TYPES[r.type]?.label} 조건 · <span className="mono">{r.now}</span>
                </div>
                <div className="bar-track contract__bar">
                  <div className="bar-fill" style={{ width: `${r.progress * 100}%` }} />
                </div>
                {r.claimedAt ? (
                  <div className="small c-good">✓ {shortDate(r.claimedAt)}에 선물 받음</div>
                ) : done ? (
                  <div className="row" style={{ marginTop: 6 }}>
                    <span className="small contract__cheer">🎉 달성! 선물하세요</span>
                    <button className="btn btn--primary small-btn" onClick={() => dispatch({ type: 'claimReward', id: r.id, date: today })}>
                      받았어요 ✓
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const EMOJIS = ['👟', '👕', '🧘', '📚', '🎧', '⌚', '🎒', '✈️', '🎬', '💆']

function RewardForm({ onAdd, onCancel }) {
  const [f, setF] = useState({ emoji: '👟', title: '', type: 'kg', target: 3 })
  const set = (patch) => setF((p) => ({ ...p, ...patch }))
  const valid = f.title.trim() && (f.type === 'goal' || Number(f.target) > 0)
  return (
    <div className="reward-form">
      <div className="chips">
        {REWARD_PRESETS.map((p) => (
          <button key={p.title} className="chip" onClick={() => setF({ ...p })}>
            {p.emoji} {p.title}
          </button>
        ))}
      </div>
      <div className="row">
        <select value={f.emoji} onChange={(e) => set({ emoji: e.target.value })} aria-label="아이콘">
          {EMOJIS.map((e) => (
            <option key={e}>{e}</option>
          ))}
        </select>
        <input value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="보상 이름 (예: 새 러닝화)" aria-label="보상 이름" />
      </div>
      <div className="row">
        <select value={f.type} onChange={(e) => set({ type: e.target.value })} aria-label="조건">
          {Object.entries(REWARD_TYPES).map(([k, t]) => (
            <option key={k} value={k}>
              {t.label} — {t.hint}
            </option>
          ))}
        </select>
        {f.type !== 'goal' && (
          <>
            <input type="number" min="1" step="any" value={f.target} onChange={(e) => set({ target: e.target.value })} aria-label="목표값" />
            <span className="unit">{REWARD_TYPES[f.type].unit}</span>
          </>
        )}
      </div>
      <div className="row">
        <button className="btn btn--primary small-btn" disabled={!valid} onClick={() => onAdd({ ...f, title: f.title.trim(), target: Number(f.target) || 0 })}>
          약속하기
        </button>
        <button className="btn small-btn" onClick={onCancel}>
          취소
        </button>
      </div>
    </div>
  )
}

// ── ② 건강 저금통 ────────────────────────────────
function PiggyBank({ sv, baseline, dispatch }) {
  const [edit, setEdit] = useState(false)
  const [val, setVal] = useState(baseline)
  const maxSpent = Math.max(baseline, ...sv.weeks.map((w) => w.spent), 1)
  return (
    <div className="rr-block">
      <h3>💰 건강 저금통</h3>
      <div className="piggy__nums">
        <div>
          <small>이번 주 절약</small>
          <b className="mono">₩{fmtInt(sv.thisWeek?.saved ?? 0)}</b>
        </div>
        <div>
          <small>이번 달</small>
          <b className="mono">₩{fmtInt(sv.thisMonth)}</b>
        </div>
        <div>
          <small>누적</small>
          <b className="mono">₩{fmtInt(sv.total)}</b>
        </div>
      </div>
      {sv.weeks.length > 0 ? (
        <div className="piggy__weeks">
          {sv.weeks.map((w) => (
            <div key={w.week} className="pw" title={`${shortDate(w.week)} 주 · 지출 ₩${fmtInt(w.spent)} / 기준 ₩${fmtInt(w.budget)}`}>
              <div className="pw__bar">
                <span className={w.spent > w.budget ? 'over' : ''} style={{ height: `${(w.spent / maxSpent) * 100}%` }} />
                <i style={{ bottom: `${(w.budget / maxSpent) * 100}%` }} />
              </div>
              <div className="mono">{shortDate(w.week)}</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted small">메뉴 단위 기록부터 계산돼요</p>
      )}
      <div className="small muted">
        막대 = 야식·술 지출 · 선 = 평소{' '}
        {edit ? (
          <span className="row" style={{ display: 'inline-flex', margin: 0 }}>
            ₩<input type="number" min="0" step="5000" value={val} onChange={(e) => setVal(e.target.value)} style={{ width: 110 }} aria-label="평소 주당 지출" />
            <button
              className="btn small-btn"
              onClick={() => {
                dispatch({ type: 'setJunkBaseline', value: Math.max(0, Number(val) || 0) })
                setEdit(false)
              }}
            >
              저장
            </button>
          </span>
        ) : (
          <button className="link-btn" onClick={() => setEdit(true)}>
            (주 ₩{fmtInt(baseline)} · 수정)
          </button>
        )}
      </div>
      <p className="small piggy__tip">💡 아낀 돈은 적금으로!</p>
    </div>
  )
}

// ── ③ 몸이 좋아진 정도 ───────────────────────────
function HealthReport({ h }) {
  return (
    <div className="rr-block">
      <h3>🫀 몸이 실제로 좋아진 정도</h3>
      {h.lossKg <= 0 ? (
        <p className="muted small">감량이 시작되면 표시돼요</p>
      ) : (
        <>
          <div className="health__grid">
            <div>
              <small>🦵 무릎이 덜 받는 하중</small>
              <b>
                걸음당 <span className="mono">−{fmtInt(h.kneePerStep)}kg</span>
              </b>
              <span className="muted">하루 8천 보면 −{fmtInt(h.kneeTonsPerDay)}톤</span>
            </div>
            <div>
              <small>🩺 수축기 혈압 (추정)</small>
              <b>
                약 <span className="mono">−{h.bpMmHg.toFixed(0)} mmHg</span>
              </b>
              <span className="muted">1kg당 약 −1</span>
            </div>
            <div>
              <small>⚖️ 시작 대비 감량</small>
              <b className="mono">
                −{h.lossKg.toFixed(1)}kg ({h.pct.toFixed(1)}%)
              </b>
            </div>
          </div>
          <div className="health__track">
            <div className="health__fill" style={{ width: `${Math.min(100, (h.pct / 10) * 100)}%` }} />
            {h.thresholds.map((t) => (
              <i key={t.pct} className={t.reached ? 'on' : ''} style={{ left: `${(t.pct / 10) * 100}%` }} />
            ))}
          </div>
          <ul className="health__list">
            {h.thresholds.map((t) => (
              <li key={t.pct} className={t.reached ? 'on' : ''}>
                <b>
                  {t.reached ? '✅' : '⬜'} {t.pct}% · {t.label}
                </b>{' '}
                <span className="muted">{t.desc}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="muted small">
        * 연구 평균치 (진단 아님)
      </p>
    </div>
  )
}
