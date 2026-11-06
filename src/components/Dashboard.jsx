import { addDays, weekday } from '../lib/dates'
import { SAFE_LOSS_PCT_PER_WEEK } from '../lib/constants'
import { fmtInt, fmtSigned, kcalToFatG } from '../lib/format'
import BalanceChart from './charts/BalanceChart'
import WeightChart from './charts/WeightChart'
import { LevelCard } from './Challenge'
import WeightInsight from './WeightInsight'
import AvatarCard from './AvatarCard'
import PeerCompare from './PeerCompare'
import ComebackBanner from './ComebackBanner'
import { RealRewardStrip } from './RealRewards'
import WeeklyBudget from './WeeklyBudget'

export default function Dashboard({ analysis: a, game, profile, entries, state, dispatch, unlocked, rr, onRealRewards, onLog, onChallenge, onCustomize }) {
  const losing = a.goal < a.current
  return (
    <div className="stack">
      <ComebackBanner analysis={a} onLog={onLog} />
      <LevelCard game={game} compact onClick={onChallenge} />
      {rr && <RealRewardStrip rr={rr} onOpen={onRealRewards} />}

      <div className="kpis">
        <BalanceKpi a={a} onLog={onLog} />
        <RateKpi a={a} losing={losing} />
        <EtaKpi a={a} />
      </div>

      <div className="stats panel">
        <Stat label="추세 체중" value={`${a.current.toFixed(1)} kg`} sub={`목표까지 ${Math.abs(a.remainingKg).toFixed(1)} kg`} />
        <Stat
          label="기저 소모량"
          value={`${fmtInt(a.base)} kcal`}
          sub={a.confidence > 0 ? `실측 보정 ${Math.round(a.confidence * 100)}%` : '공식 추정'}
        />
        <Stat
          label="7일 밸런스"
          value={`${fmtSigned(a.week.balance)} kcal`}
          sub={`≈ ${fmtSigned(kcalToFatG(a.week.balance))} g · ${a.week.days}일 기록`}
          tone={a.week.days ? (a.week.balance <= 0 ? 'good' : 'bad') : null}
        />
        <Stat
          label="누적 밸런스"
          value={`${fmtSigned(a.cumulative / 7700, 2)} kg`}
          sub={`${fmtSigned(a.cumulative)} kcal`}
          tone={a.cumulative <= 0 ? 'good' : 'bad'}
        />
      </div>

      {state && <WeeklyBudget state={state} analysis={a} dispatch={dispatch} />}

      <AvatarCard analysis={a} profile={profile} unlocked={unlocked} onCustomize={onCustomize} />

      <PeerCompare analysis={a} profile={profile} />

      <WeightInsight analysis={a} entries={entries} onLog={onLog} />

      <section className="panel">
        <WeightChart analysis={a} />
      </section>
      <section className="panel">
        <BalanceChart analysis={a} />
      </section>

      <EtaCompare a={a} />

      {a.warnings.length > 0 && (
        <section className="panel">
          <h2>신호</h2>
          <ul className="warnings">
            {a.warnings.map((w, i) => (
              <li key={i} className={`w-${w.level}`}>
                {w.text}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function Kpi({ label, value, unit, sub, tone, children }) {
  return (
    <div className={`kpi panel ${tone ? `tone-${tone}` : ''}`}>
      <div className="kpi__label">{label}</div>
      <div className="kpi__value mono">
        {value}
        {unit && <small>{unit}</small>}
      </div>
      <div className="kpi__sub">{sub}</div>
      {children}
    </div>
  )
}

function BalanceKpi({ a, onLog }) {
  const r = a.todayRow
  if (r.balance == null) {
    return (
      <Kpi label="오늘 칼로리 밸런스" value="—" sub={`예상 소모 ${fmtInt(r.expend)} kcal · 섭취 미기록`}>
        <button className="btn btn--primary small-btn" onClick={onLog}>
          지금 기록하기
        </button>
      </Kpi>
    )
  }
  return (
    <Kpi
      label="오늘 칼로리 밸런스"
      value={fmtSigned(r.balance)}
      unit="kcal"
      tone={r.balance <= 0 ? 'good' : 'bad'}
      sub={`지방 ${fmtSigned(kcalToFatG(r.balance))} g · 섭취 ${fmtInt(r.intake)} / 소모 ${fmtInt(r.expend)}`}
    />
  )
}

function RateKpi({ a, losing }) {
  if (!a.rate) return <Kpi label="주간 변화 속도" value="—" sub="체중 3회 기록 필요" />
  const pct = a.rate.pctPerWeek
  const tooFast = losing && -pct > SAFE_LOSS_PCT_PER_WEEK
  const onTrack = losing ? pct < 0 : pct > 0
  return (
    <Kpi
      label="주간 변화 속도"
      value={fmtSigned(a.rate.kgPerWeek, 2)}
      unit="kg/주"
      tone={tooFast ? 'warn' : onTrack ? 'good' : 'bad'}
      sub={`체중의 ${fmtSigned(pct, 2)}%/주 · ${tooFast ? '과속 — 근손실 위험' : onTrack ? '목표 방향' : '목표 반대 방향'}`}
    />
  )
}

function etaText(res, today) {
  if (!res) return { value: '—', sub: '데이터 부족' }
  switch (res.status) {
    case 'reached':
      return { value: '도달!', sub: '목표 체중에 도달했습니다' }
    case 'ok': {
      const d = addDays(today, res.days)
      return { value: `D-${res.days}`, sub: `${d} (${weekday(d)}) 예상` }
    }
    case 'plateau':
      return { value: '정체', sub: `${res.equilibrium.toFixed(1)} kg에서 수렴` }
    case 'wrong':
      return { value: '∞', sub: '현재 패턴은 반대 방향' }
    case 'too-long':
      return { value: '3년+', sub: '현재 속도로는 3년 이상' }
    default:
      return { value: '—', sub: '' }
  }
}

function EtaKpi({ a }) {
  const primary = a.model ?? a.trend
  const t = etaText(primary, a.today)
  const tone = primary?.status === 'ok' || primary?.status === 'reached' ? 'good' : primary ? 'bad' : null
  return (
    <Kpi
      label="목표까지"
      value={t.value}
      tone={tone}
      sub={primary ? `${t.sub} · 남은 ${Math.abs(a.remainingKg).toFixed(1)} kg` : '섭취 3일 이상 기록 필요'}
    />
  )
}

function EtaCompare({ a }) {
  const m = etaText(a.model, a.today)
  const t = etaText(a.trend, a.today)
  const both = a.model?.status === 'ok' && a.trend?.status === 'ok'
  const gap = both ? (a.trend.days - a.model.days) / a.model.days : 0
  return (
    <section className="panel">
      <h2>도달 예측 — 두 가지 방법</h2>
      <div className="eta-grid">
        <div>
          <div className="muted small">기록 기반</div>
          <div className="eta-val mono">{m.value}</div>
          <div className="muted small">{a.plan ? `평균 섭취 ${fmtInt(a.plan.intake)} · 운동 ${fmtInt(a.plan.exercise)} kcal/일` : m.sub}</div>
        </div>
        <div>
          <div className="muted small">체중 추세 기반</div>
          <div className="eta-val mono">{t.value}</div>
          <div className="muted small">{t.sub}</div>
        </div>
      </div>
      {both && Math.abs(gap) > 0.3 && (
        <p className="note">
          두 예측이 {Math.round(Math.abs(gap) * 100)}% 차이납니다.{' '}
          {gap > 0 ? '실제가 더 느림 → 기록 누락?' : '실제가 더 빠름 → 수분 손실?'}
        </p>
      )}
    </section>
  )
}

function Stat({ label, value, sub, tone }) {
  return (
    <div className={`stat ${tone ? `tone-${tone}` : ''}`}>
      <div className="muted small">{label}</div>
      <div className="stat__value mono">{value}</div>
      <div className="muted small">{sub}</div>
    </div>
  )
}
