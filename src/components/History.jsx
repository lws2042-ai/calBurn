import { useState } from 'react'
import { shortDate, weekday } from '../lib/dates'
import { fmtInt, fmtSigned } from '../lib/format'
import HistoryCharts from './charts/HistoryCharts'

export default function History({ analysis, onOpen }) {
  const [view, setView] = useState('chart')
  const rows = [...analysis.series].reverse()
  return (
    <div className="stack">
      <div className="row between" style={{ marginTop: 0 }}>
        <h2 style={{ margin: 0 }}>기록 히스토리</h2>
        <div className="seg seg--sm">
          <button className={view === 'chart' ? 'on' : ''} onClick={() => setView('chart')}>
            그래프
          </button>
          <button className={view === 'table' ? 'on' : ''} onClick={() => setView('table')}>
            일별 표
          </button>
        </div>
      </div>

      {view === 'chart' ? (
        <HistoryCharts analysis={analysis} />
      ) : (
        <section className="panel">
          <p className="muted small">행을 누르면 수정</p>
          <div className="table-wrap">
            <table className="table mono">
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>체중</th>
                  <th>추세</th>
                  <th>섭취</th>
                  <th>운동</th>
                  <th>밸런스</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.date} onClick={() => onOpen(r.date)}>
                    <td>
                      {shortDate(r.date)} <span className="muted">{weekday(r.date)}</span>
                    </td>
                    <td>{r.weight?.toFixed(1) ?? <span className="muted">—</span>}</td>
                    <td className="muted">{r.trend?.toFixed(1) ?? '—'}</td>
                    <td>{r.intake != null ? fmtInt(r.intake) : <span className="muted">—</span>}</td>
                    <td>{r.exercise ? fmtInt(r.exercise) : <span className="muted">—</span>}</td>
                    <td className={r.balance == null ? 'muted' : r.balance <= 0 ? 'c-good' : 'c-bad'}>{r.balance == null ? '—' : fmtSigned(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
