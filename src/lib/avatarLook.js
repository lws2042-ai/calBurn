// 아바타 꾸미기 선택지와 기본값

export const SKIN_TONES = {
  light: { label: '밝은', light: '#fff0e4', base: '#fbdcc6', shade: '#efbfa2', deep: '#dca385', line: '#a3705a' },
  warm: { label: '자연', light: '#fde6d4', base: '#f6d0b3', shade: '#eab595', deep: '#d79c7c', line: '#9b6650' },
  tan: { label: '구릿빛', light: '#f0c9a4', base: '#d9a57c', shade: '#c08660', deep: '#a36c4a', line: '#7d4e35' },
  deep: { label: '짙은', light: '#b98563', base: '#9a6646', shade: '#7f4f34', deep: '#673d27', line: '#4a2a1a' },
}

export const HAIR_COLORS = {
  black: { label: '블랙', base: '#1f1b1b', dark: '#0e0c0c', light: '#55504f' },
  darkbrown: { label: '흑갈색', base: '#2f2119', dark: '#1c130e', light: '#6e4e3c' },
  brown: { label: '밤색', base: '#5a3a26', dark: '#3a2416', light: '#9a6a48' },
  ash: { label: '애쉬', base: '#6b6560', dark: '#3f3a37', light: '#aaa39c' },
  blonde: { label: '금발', base: '#c9a063', dark: '#9a7440', light: '#efd8a4' },
}

export const HAIR_STYLES = {
  short: '짧은 머리',
  volume: '볼륨 가르마',
  crop: '크롭',
  bob: '단발',
  long: '긴 생머리',
  wavy: '웨이브',
  ponytail: '포니테일',
}

export const EYE_STYLES = { almond: '아몬드형', round: '둥근 눈', sharp: '날렵한 눈' }
export const FACE_SHAPES = { oval: '계란형', round: '둥근형', slim: '갸름형' }

export const TOP_STYLES = { tshirt: '티셔츠', shirt: '셔츠', hoodie: '후드', tank: '민소매', track: '트레이닝복', jacket: '가죽 재킷' }
export const SHOE_STYLES = { basic: '기본', runner: '러닝화' }
export const ACCESSORIES = { none: '없음', sunglasses: '선글라스', headband: '헤드밴드', medal: '완주 메달', cap: '등산 모자', crown: '왕관' }
export const AURAS = { none: '없음', gold: '골드 오라' }
export const BOTTOM_STYLES = { shorts: '반바지', slacks: '슬랙스', jeans: '청바지', skirt: '스커트' }

export const CLOTH_COLORS = [
  { hex: '#2f7a52', label: '포레스트' },
  { hex: '#1f3b63', label: '네이비' },
  { hex: '#3f6fb0', label: '데님' },
  { hex: '#7a1f2b', label: '버건디' },
  { hex: '#c98a2e', label: '머스타드' },
  { hex: '#6b4fa0', label: '퍼플' },
  { hex: '#e8e4da', label: '아이보리' },
  { hex: '#8b9199', label: '그레이' },
  { hex: '#1c1c1f', label: '블랙' },
]

export function defaultLook(sex) {
  const F = sex === 'F'
  return {
    skin: 'warm',
    hairStyle: F ? 'long' : 'short',
    hairColor: 'darkbrown',
    eyes: 'almond',
    face: 'oval',
    glasses: false,
    shoes: 'basic',
    accessory: 'none',
    aura: 'none',
    top: { style: 'shirt', color: '#e8e4da' }, // 셔츠 · 아이보리
    bottom: { style: 'jeans', color: '#3f6fb0' }, // 청바지 · 데님
  }
}

/** 저장된 일부 설정 + 기본값 */
export function resolveLook(look, sex) {
  const d = defaultLook(sex)
  return { ...d, ...look, top: { ...d.top, ...look?.top }, bottom: { ...d.bottom, ...look?.bottom } }
}
