// 날짜는 로컬 기준 "YYYY-MM-DD" 문자열로만 다룬다 (문자열 비교 = 시간순 비교).

const pad = (n) => String(n).padStart(2, '0')

export function toISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayISO() {
  return toISO(new Date())
}

export function parseISO(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(s, n) {
  const d = parseISO(s)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

/** b − a (일). 서머타임에도 안전하도록 반올림 */
export function diffDays(a, b) {
  return Math.round((parseISO(b) - parseISO(a)) / 86400000)
}

/** a부터 b까지 (양끝 포함) */
export function dateRange(a, b) {
  const out = []
  for (let d = a; d <= b; d = addDays(d, 1)) out.push(d)
  return out
}

export function shortDate(s) {
  const [, m, d] = s.split('-')
  return `${Number(m)}/${Number(d)}`
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
export function weekday(s) {
  return WEEKDAYS[parseISO(s).getDay()]
}
