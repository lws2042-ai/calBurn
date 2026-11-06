// 칼로리 디펜스: 떨어지는 음식(kcal) vs 운동 화살(순소모 kcal).
// 물리 규칙: 화살 데미지 = 내 체중으로 계산한 운동 순소모 kcal,
//            재장전 = 실제 운동 시간 × 60ms  →  DPS = 그 운동의 분당 소모 kcal (강도가 곧 화력)

import { exerciseKcal } from './exercise.js'

/** 대표 1회 제공량 기준 대략값 (kcal) */
export const FOODS = [
  { emoji: '🍗', name: '치킨 다리', kcal: 290, w: 3 },
  { emoji: '🍕', name: '피자 1조각', kcal: 280, w: 3 },
  { emoji: '🍩', name: '도넛', kcal: 250, w: 3 },
  { emoji: '🥤', name: '콜라 1캔', kcal: 140, w: 4 },
  { emoji: '🍦', name: '아이스크림', kcal: 200, w: 3 },
  { emoji: '🍙', name: '삼각김밥', kcal: 200, w: 3 },
  { emoji: '🍫', name: '초콜릿 바', kcal: 230, w: 3 },
  { emoji: '🍺', name: '맥주 500ml', kcal: 210, w: 2 },
  { emoji: '🍟', name: '감자튀김(M)', kcal: 330, w: 2 },
  { emoji: '🍰', name: '케이크 1조각', kcal: 350, w: 2 },
  { emoji: '🍔', name: '햄버거', kcal: 520, w: 1 },
  { emoji: '🍜', name: '라면 1봉', kcal: 500, w: 1 },
]

export const ARROW_DEFS = [
  { id: 'walk1', label: '걷기 1km', ex: { type: 'walk', distanceKm: 1 }, minutes: 12 },
  { id: 'run1', label: '러닝 1km', ex: { type: 'run', distanceKm: 1 }, minutes: 6 },
  { id: 'run5', label: '러닝 5km', ex: { type: 'run', distanceKm: 5 }, minutes: 30 },
  { id: 'swim30', label: '수영 30분', ex: { type: 'swim', minutes: 30, intensity: 'moderate' }, minutes: 30 },
  { id: 'cycle30', label: '자전거 30분', ex: { type: 'cycle', minutes: 30, intensity: 'moderate' }, minutes: 30 },
  { id: 'hike60', label: '등산 1시간 ↑300m', ex: { type: 'hike', minutes: 60, elevationM: 300 }, minutes: 60 },
]

export const MS_PER_EXERCISE_MINUTE = 60

export function buildArrows(weightKg, profile) {
  return ARROW_DEFS.map((d) => {
    const kcal = exerciseKcal(d.ex, weightKg, profile)
    return { ...d, kcal, cooldownMs: d.minutes * MS_PER_EXERCISE_MINUTE, perMin: kcal / d.minutes }
  })
}

/** 이 kcal을 태우려면 러닝 몇 km? */
export const runKmFor = (kcal, weightKg) => kcal / (0.95 * weightKg)

/** 건강 음식: 쏘면 안 된다. 바닥에 닿으면(먹으면) 보너스 */
export const HEALTHY = [
  { emoji: '🥦', name: '브로콜리', kcal: 30 },
  { emoji: '🍎', name: '사과', kcal: 95 },
  { emoji: '🥗', name: '샐러드', kcal: 120 },
  { emoji: '🥚', name: '삶은 달걀', kcal: 75 },
  { emoji: '🍠', name: '고구마', kcal: 130 },
]

/** 아이템: 쏴서 획득 */
export const POWERUPS = [
  { emoji: '💧', name: '물 한 잔', power: 'slow', desc: '6초 슬로우', w: 3 },
  { emoji: '🛡️', name: '단백질 쉴드', power: 'shield', desc: '1회 방어', w: 3 },
  { emoji: '💓', name: '회복', power: 'life', desc: '생명 +1', w: 1 },
]

/** 보스: 3웨이브마다 */
export const BOSSES = [
  { emoji: '🍗', name: '치킨 한 마리', kcal: 1900 },
  { emoji: '🎂', name: '홀케이크', kcal: 2400 },
  { emoji: '🍕', name: '라지 피자', kcal: 2200 },
  { emoji: '🍱', name: '야식 세트', kcal: 2600 },
]

/** 웨이브 테마: 해당 음식의 출현 확률을 높인다 */
export const WAVE_THEMES = [
  { name: '워밍업', boost: [] },
  { name: '편의점 습격', boost: ['🥤', '🍙', '🍫', '🍦'] },
  { name: '야식 타임 🌙', boost: ['🍗', '🍜', '🍺', '🍟'] },
  { name: '회식 자리', boost: ['🍺', '🍗', '🍕', '🍟'] },
  { name: '디저트 카페', boost: ['🍰', '🍩', '🍦', '🍫'] },
  { name: '패스트푸드', boost: ['🍔', '🍟', '🥤', '🍕'] },
]
export const themeOf = (wave) => {
  const n = WAVE_THEMES.length
  return WAVE_THEMES[(((Math.floor(wave) - 1) % n) + n) % n] ?? WAVE_THEMES[0]
}

export function pickFood(rand = Math.random, boost = []) {
  const weight = (f) => f.w * (boost.includes(f.emoji) ? 4 : 1)
  const total = FOODS.reduce((s, f) => s + weight(f), 0)
  let r = rand() * total
  for (const f of FOODS) {
    r -= weight(f)
    if (r <= 0) return f
  }
  return FOODS[0]
}

export function pickWeighted(list, rand = Math.random) {
  const total = list.reduce((s, x) => s + (x.w ?? 1), 0)
  let r = rand() * total
  for (const x of list) {
    r -= x.w ?? 1
    if (r <= 0) return x
  }
  return list[0]
}

/** 콤보 → 점수 배수 (5콤보마다 +0.5, 최대 ×3) */
export const comboMultiplier = (combo) => Math.min(3, 1 + Math.floor(combo / 5) * 0.5)

export const FEVER_COMBO = 10

/** 결과 등급 */
export function rankOf(score) {
  if (score >= 9000) return { grade: 'SS', title: '애프터버너' }
  if (score >= 5000) return { grade: 'S', title: '지방 파괴자' }
  if (score >= 2500) return { grade: 'A', title: '버너' }
  if (score >= 1000) return { grade: 'B', title: '러너' }
  return { grade: 'C', title: '입문자' }
}

/** 게임 점수 → 보너스 XP (판당 최대 20) */
export const gameXp = (score) => Math.min(20, Math.floor(score / 150))
