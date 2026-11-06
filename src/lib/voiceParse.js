// 음성(또는 문장) 입력 해석: "몸무게 76.3, 점심에 김치찌개랑 공기밥 먹고 러닝 5키로 뛰었어"
// → { weightKg, foods: [{ query, qty }], exercises: [{ type, distanceKm?, minutes? }], kcal }

// ── 한글 숫자 ─────────────────────────────────
const SINO = { 영: 0, 공: 0, 일: 1, 이: 2, 삼: 3, 사: 4, 오: 5, 육: 6, 륙: 6, 칠: 7, 팔: 8, 구: 9 }
const UNIT = { 십: 10, 백: 100, 천: 1000 }
const NATIVE = { 한: 1, 하나: 1, 두: 2, 둘: 2, 세: 3, 셋: 3, 네: 4, 넷: 4, 다섯: 5, 여섯: 6, 일곱: 7, 여덟: 8, 아홉: 9, 열: 10 }

/** "칠십육점삼" → 76.3, "백이" → 102, "76.3" → 76.3, 해석 불가면 null */
export function parseKoreanNumber(s) {
  if (s == null) return null
  const t = String(s).replace(/\s/g, '')
  if (/^\d+(\.\d+)?$/.test(t)) return Number(t)
  if (/^\d+점\d+$/.test(t)) return Number(t.replace('점', '.'))
  if (!/^[영공일이삼사오육륙칠팔구십백천점]+$/.test(t)) return null
  const [ip, dp] = t.split('점')
  let total = 0
  let cur = 0
  for (const ch of ip) {
    if (ch in SINO) cur = SINO[ch]
    else if (ch in UNIT) {
      total += (cur || 1) * UNIT[ch]
      cur = 0
    }
  }
  total += cur
  if (dp) {
    const digits = [...dp].map((c) => SINO[c]).filter((v) => v != null).join('')
    if (digits) total = Number(`${total}.${digits}`)
  }
  return total
}

// 한글 숫자는 띄어 말해도 이어 붙인다 ("칠십육 점 삼")
const NUM = '(\\d+(?:\\.\\d+)?|[영공일이삼사오육륙칠팔구십백천점]+(?:\\s+[영공일이삼사오육륙칠팔구십백천점]+)*)'

// ── 체중 ─────────────────────────────────────
function takeWeight(text) {
  const re = new RegExp(`(?:몸무게|체중|무게)\\s*(?:은|는|이|가)?\\s*${NUM}\\s*(?:킬로그램|킬로|키로|kg|㎏)?`, 'i')
  const m = text.match(re)
  if (!m) return { weightKg: null, rest: text }
  const v = parseKoreanNumber(m[1])
  return { weightKg: v >= 30 && v <= 300 ? Math.round(v * 10) / 10 : null, rest: text.replace(m[0], ' ') }
}

// ── 운동 ─────────────────────────────────────
const EX = [
  { type: 'run', kw: '러닝|달리기|달렸|뛰었|뛰기|조깅|런닝' },
  { type: 'walk', kw: '걷기|걸었|산책|워킹' },
  { type: 'swim', kw: '수영' },
  { type: 'hike', kw: '등산|산행' },
  { type: 'cycle', kw: '자전거|라이딩|사이클' },
]
function takeExercises(text) {
  const out = []
  let rest = text
  for (const { type, kw } of EX) {
    // "러닝 5키로", "5km 러닝", "수영 40분", "등산 2시간"
    const after = new RegExp(`(?:${kw})[^\\d영공일이삼사오육륙칠팔구십백천]{0,6}${NUM}\\s*(키로|킬로미터|킬로|km|분|시간)`, 'i')
    const before = new RegExp(`${NUM}\\s*(키로|킬로미터|킬로|km|분|시간)\\s*(?:을|를|동안)?\\s*(?:${kw})`, 'i')
    const m = rest.match(after) || rest.match(before)
    if (!m) continue
    const v = parseKoreanNumber(m[1])
    if (!(v > 0)) continue
    const unit = m[2].toLowerCase()
    const ex = { type }
    if (unit === '분') ex.minutes = v
    else if (unit === '시간') ex.minutes = v * 60
    else ex.distanceKm = v
    if (type === 'swim' || type === 'cycle') ex.intensity = 'moderate'
    if (type === 'hike' && !ex.minutes) ex.minutes = Math.round(ex.distanceKm * 20) // 거리만 말하면 대략 시간
    out.push(ex)
    rest = rest.replace(m[0], ' ')
  }
  return { exercises: out, rest }
}

// ── 직접 kcal ────────────────────────────────
function takeKcal(text) {
  const m = text.match(new RegExp(`${NUM}\\s*(?:칼로리|킬로칼로리|kcal)`, 'i'))
  if (!m) return { kcal: null, rest: text }
  const v = parseKoreanNumber(m[1])
  return { kcal: v > 0 && v < 10000 ? Math.round(v) : null, rest: text.replace(m[0], ' ') }
}

// ── 음식 ─────────────────────────────────────
const COUNTERS = '개|그릇|공기|잔|조각|인분|마리|캔|병|컵|봉지|봉|접시|줄|팩|장|알'

/** "김치찌개 1인분", "치킨 반 마리", "맥주 두 잔" → { query, qty } */
function parseFoodChunk(chunk) {
  let s = ` ${chunk} `
  let qty = 1
  // 반 마리 / 반 그릇
  if (new RegExp(`반\\s*(?:${COUNTERS})`).test(s)) {
    qty = 0.5
    s = s.replace(new RegExp(`반\\s*(?:${COUNTERS})`), ' ')
  }
  // 숫자·고유어 수량 + 단위
  const m = s.match(new RegExp(`(\\d+(?:\\.\\d+)?|${Object.keys(NATIVE).join('|')}|[일이삼사오육칠팔구십]+)\\s*(?:${COUNTERS})`))
  if (m) {
    const v = NATIVE[m[1]] ?? parseKoreanNumber(m[1])
    if (v > 0 && v < 20) qty = v
    s = s.replace(m[0], ' ')
  }
  // 단위 없이 고유어 수량만 말한 경우 ("사과 하나")
  const solo = s.match(/\s(하나|둘|셋|넷|다섯|여섯|일곱|여덟|아홉|열)\s/)
  if (solo && !m) {
    qty = NATIVE[solo[1]]
    s = s.replace(solo[0], ' ')
  }
  const query = s
    .replace(/[^가-힣a-zA-Z0-9 ]/g, ' ')
    .split(/\s+/)
    .map(cleanToken)
    .filter(Boolean)
    .join(' ')
  return query ? { query, qty } : null
}

/** 단어 단위 정리: 끼니·시간·동사 단어는 버리고, 조사는 "단어 끝"에서만 뗀다 (도넛의 '도'를 지우지 않게) */
const DROP_WORD = /^(아침|점심|저녁|야식|간식|오늘|어제|아까|방금|그리고|그다음|그래서|좀|많이|조금|또|이|그|저)$/
const VERB = /^(먹|마시|마셨|했|하고|하다|먹고|먹은|먹음)|(었어요?|었다|었음|었고|했어요?|했고|해요|해서|다|요)$/
const SINGLE_OK = new Set(['배', '떡', '밥', '귤', '감', '빵', '죽', '김', '밤', '콩', '무', '회', '전', '면'])
function cleanToken(t) {
  if (!t) return ''
  if (VERB.test(t) && !/(바나나|파스타|피자|카스테라)$/.test(t)) return ''
  const base = t.length > 2 ? t.replace(/(에는|에서|으로|이랑|에|은|는|을|를|도|만|랑)$/, '') : t.replace(/(을|를|은|는|도|에)$/, (m) => (t.length > 1 ? '' : m))
  if (DROP_WORD.test(base)) return ''
  if (base.length === 1 && !SINGLE_OK.has(base)) return ''
  return base
}

function takeFoods(text) {
  const natives = Object.keys(NATIVE).join('|')
  const chunks = text
    // 끼니 단어 앞, "수량+단위" 뒤에서 끊는다 ("우유 한 잔 점심 비빔밥" → 우유 한 잔 | 비빔밥)
    .replace(/(아침|점심|저녁|야식|간식)/g, '|$1')
    .replace(new RegExp(`((?:\\d+(?:\\.\\d+)?|${natives}|반|[일이삼사오육칠팔구십]+)\\s*(?:${COUNTERS}))`, 'g'), '$1|')
    .split(/\||,|\.|·|그리고|하고|이랑|\s랑|랑\s|및|\s+또\s+/)
    .map((c) => c.trim())
    .filter(Boolean)
  return chunks.map(parseFoodChunk).filter(Boolean)
}

/** 전체 해석 */
export function parseUtterance(raw) {
  const text = ` ${String(raw ?? '').replace(/\s+/g, ' ').trim()} `
  const w = takeWeight(text)
  const e = takeExercises(w.rest)
  const k = takeKcal(e.rest)
  // 말 전체가 숫자 하나면(예: "76.3") 체중으로 본다
  let weightKg = w.weightKg
  if (weightKg == null) {
    const only = k.rest.trim().replace(/(킬로그램|킬로|키로|kg)$/, '')
    const v = parseKoreanNumber(only)
    if (v >= 30 && v <= 300) return { weightKg: Math.round(v * 10) / 10, foods: [], exercises: e.exercises, kcal: k.kcal, text: raw }
  }
  return { weightKg, foods: takeFoods(k.rest), exercises: e.exercises, kcal: k.kcal, text: raw }
}
