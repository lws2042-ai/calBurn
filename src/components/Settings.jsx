import { useRef, useState } from 'react'
import { fmtInt } from '../lib/format'
import { emptyState, validateImport } from '../store/useCalBurn'
import AvatarCustomizer from './AvatarCustomizer'
import ProfileForm from './ProfileForm'
import ThemePicker from './ThemePicker'
import { themeFromSettings } from '../lib/themes'
import { buildDemoState } from '../lib/demo'

export default function Settings({ state, dispatch, analysis, today, unlocked }) {
  const fileRef = useRef(null)
  const [msg, setMsg] = useState(null)

  function exportJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `calburn-backup-${today}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function importJson(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const next = validateImport(JSON.parse(await file.text()))
      if (!window.confirm(`백업(${Object.keys(next.entries).length}일 기록)으로 현재 데이터를 덮어쓸까요?`)) return
      dispatch({ type: 'replace', state: next })
      setMsg('복원했습니다.')
    } catch (err) {
      setMsg(`⚠ ${err.message}`)
    }
  }

  function loadSample() {
    const n = Object.keys(state.entries).length
    const what = n ? `현재 데이터(${n}일)를 덮어씁니다` : '채웁니다'
    if (!window.confirm(`올해 1월 1일 ~ 오늘까지의 샘플 기록으로 ${what}. 계속할까요?`)) return
    dispatch({ type: 'replace', state: buildDemoState(today) })
    setMsg('샘플 데이터를 불러왔어요.')
  }

  function reset() {
    if (!window.confirm('모든 기록과 프로필을 삭제합니다. 되돌릴 수 없습니다. 계속할까요?')) return
    dispatch({ type: 'replace', state: structuredClone(emptyState) })
  }

  return (
    <div className="stack">
      <section className="panel" id="theme">
        <h2>테마</h2>
        <ThemePicker value={themeFromSettings(state.settings)} onPick={(theme) => dispatch({ type: 'setTheme', theme })} />
      </section>

      <section className="panel" id="avatar">
        <h2>아바타 꾸미기</h2>
        <AvatarCustomizer profile={state.profile} weightKg={analysis.current} unlocked={unlocked} onChange={(look) => dispatch({ type: 'setLook', look })} />
      </section>

      <section className="panel">
        <h2>프로필</h2>
        <ProfileForm
          initial={state.profile}
          onSubmit={(p) => {
            dispatch({ type: 'setProfile', profile: { ...state.profile, ...p } })
            setMsg('프로필을 저장했습니다.')
          }}
        />
      </section>

      <section className="panel">
        <h2>계산 근거</h2>
        <dl className="defs mono">
          <dt>BMR (Mifflin-St Jeor)</dt>
          <dd>{fmtInt(analysis.bmr)} kcal</dd>
          <dt>공식 기저소모 (BMR × {state.profile.activityFactor})</dt>
          <dd>{fmtInt(analysis.formulaBase)} kcal</dd>
          <dt>실측 기저소모 (체중 역산)</dt>
          <dd>{analysis.observed ? `${fmtInt(analysis.observed.base)} kcal` : '데이터 부족'}</dd>
          <dt>적용 기저소모 (실측 신뢰 {Math.round(analysis.confidence * 100)}%)</dt>
          <dd>{fmtInt(analysis.base)} kcal</dd>
          <dt>섭취 기록일</dt>
          <dd>{analysis.loggedDays}일</dd>
        </dl>
      </section>

      <section className="panel">
        <h2>데이터</h2>
        <p className="muted small">이 브라우저에만 저장돼요. 백업해 두세요.</p>
        <div className="row">
          <button className="btn" onClick={exportJson}>
            백업 내보내기 (JSON)
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            백업 불러오기
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importJson} />
          <button className="btn" onClick={loadSample}>
            샘플 데이터 (1월~오늘)
          </button>
          <button className="btn btn--danger" onClick={reset}>
            전체 초기화
          </button>
        </div>
      </section>

      {msg && <div className="toast">{msg}</div>}
    </div>
  )
}
