import { impactOf } from '../lib/decision'
import { fmtInt, fmtSigned } from '../lib/format'

/** 먹기 전에 보여주는 "이 선택의 비용" 카드 */
export default function DecisionImpact({ food, ctx }) {
  if (!ctx || !(food.kcal > 0)) return null
  const r = impactOf(food, ctx)
  return (
    <div className={`impact ${r.flipsToSurplus ? 'impact--warn' : ''}`}>
      <div className="impact__title">먹기 전 비용</div>
      <div className="impact__grid">
        <div>
          <small>태우려면</small>
          <b className="mono">러닝 {r.runKm.toFixed(1)}km</b>
          <span className="muted">걷기 {r.walkKm.toFixed(1)}km</span>
        </div>
        <div>
          <small>지방 상당</small>
          <b className="mono">{fmtInt(r.fatG)}g</b>
          <span className="muted">{fmtInt(r.kcal)} kcal</span>
        </div>
        <div>
          <small>목표 도달</small>
          {r.delayDays != null ? (
            <>
              <b className="mono">+{r.delayDays.toFixed(1)}일</b>
              {r.etaBefore != null && (
                <span className="muted mono">
                  D-{r.etaBefore} → D-{Math.round(r.etaAfter)}
                </span>
              )}
            </>
          ) : (
            <>
              <b className="mono">—</b>
              <span className="muted">섭취 3일 기록 후 계산</span>
            </>
          )}
        </div>
        {r.waterKg != null && r.waterKg >= 0.05 && (
          <div>
            <small>내일 아침 체중</small>
            <b className="mono">+{r.waterKg.toFixed(2)}kg</b>
            <span className="muted">수분 (지방 아님)</span>
          </div>
        )}
      </div>
      <div className="impact__balance mono">
        오늘 밸런스 {r.balanceBefore == null ? '—' : fmtSigned(r.balanceBefore)} → <b className={r.balanceAfter > 0 ? 'c-bad' : 'c-good'}>{fmtSigned(r.balanceAfter)}</b> kcal
        {r.flipsToSurplus && <span className="impact__flag">흑자 전환</span>}
      </div>
    </div>
  )
}
