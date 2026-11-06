import { diffDays } from '../lib/dates'
import { fmtSigned } from '../lib/format'
import { lastActiveBefore } from '../lib/game'

/** 며칠 쉬었다 돌아오면 혼내지 않고 환영한다 (실패하지 않는 설계) */
export default function ComebackBanner({ analysis, onLog }) {
  const { series, today, todayRow, current } = analysis
  const last = lastActiveBefore(series, today)
  if (!last) return null
  const away = diffDays(last.date, today)
  const loggedToday = todayRow.weight != null || todayRow.intake != null
  if (away < 3 || loggedToday) return null

  const moved = last.trend != null ? current - last.trend : null
  return (
    <section className="panel comeback">
      <div className="comeback__title">👋 다시 오셨네요! {away}일 만이에요</div>
      <p className="small">
        쉬는 날은 실패가 아닙니다. 기록은 그대로 남아 있고, 추세도 이어서 계산됩니다.
        {moved != null && (
          <>
            {' '}
            마지막 기록 이후 추세 예상 변화 <b className="mono">{fmtSigned(moved, 1)}kg</b>.
          </>
        )}{' '}
        오늘 체중 한 번만 재 주세요. 정확한 추세로 바로 돌아옵니다.
      </p>
      <button className="btn btn--primary small-btn" onClick={onLog}>
        오늘 체중 기록
      </button>
    </section>
  )
}
