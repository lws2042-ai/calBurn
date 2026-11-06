// 테마 목록 (실제 색 값은 index.css / themes.css 의 CSS 변수)
export const THEMES = [
  { id: 'neon', name: '네온 그린', bg: '#050b08', panel: '#0f1d16', accent: '#3cf08e', text: '#dff5e8' },
  { id: 'ocean', name: '오션 블루', bg: '#050a12', panel: '#0e1b2e', accent: '#38bdf8', text: '#e0eefc' },
  { id: 'violet', name: '바이올렛', bg: '#0a0712', panel: '#19122d', accent: '#a78bfa', text: '#ece6ff' },
  { id: 'sunset', name: '선셋 오렌지', bg: '#120a05', panel: '#26170c', accent: '#fb923c', text: '#fdeee2' },
  { id: 'mono', name: '모노크롬', bg: '#08090a', panel: '#16181b', accent: '#e8ecef', text: '#eceef0' },
  { id: 'light', name: '라이트', bg: '#f2f6f3', panel: '#ffffff', accent: '#0f9d58', text: '#11221a' },
]

export const DEFAULT_THEME = 'ocean'

/** 사용자가 직접 고른 테마만 존중하고, 아니면 기본(오션) */
export const themeFromSettings = (settings) => (settings?.themeChosen && settings.theme ? settings.theme : DEFAULT_THEME)

export function applyTheme(id) {
  const t = THEMES.find((x) => x.id === id) ?? THEMES.find((x) => x.id === DEFAULT_THEME)
  document.documentElement.dataset.theme = t.id
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t.bg)
}

/** 캔버스·SVG 속성처럼 CSS 변수를 직접 못 쓰는 곳을 위한 현재 색 */
export function readThemeColors() {
  const cs = getComputedStyle(document.documentElement)
  const v = (n) => cs.getPropertyValue(n).trim()
  return {
    accent: v('--accent'),
    accentRgb: v('--accent-rgb'),
    bad: v('--bad'),
    text: v('--text'),
    muted: v('--muted'),
    line: v('--line'),
    bg: v('--bg'),
  }
}
