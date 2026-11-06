// 샘플 데이터: 올해 1월 1일 ~ 오늘. 단계별 시나리오로 굴곡 있게, 그러나 서서히 변하는 체중.
//
// 몸은 물리적으로 시뮬레이션한다:
//  · 지방은 에너지 밸런스로만 변한다. 체중이 줄면 소모량도 준다(1kg당 22kcal).
//  · 체중계 숫자 = 지방 질량 + 수분(전날 나트륨·탄수화물, 무작위 변동).
//  · 요요 기간엔 기록을 덜 하고, 적게 적는다(과소 기록) → 에너지 장부선이 이를 잡아낸다.
import { addDays, diffDays } from './dates.js'

function rng(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

/**
 * 다이어트 단계: [시작 MM-DD, 이름, 하루 평균 밸런스(kcal), 운동 빈도(0~1), 기록 성실도, 기록 정직도]
 * 밸런스 음수 = 적자(감량)
 */
// 큰 요요 없이 서서히 감소: 단계마다 적자 폭만 조금씩 달라진다 (명절은 짧은 반등)
const PHASES = [
  ['01-01', '새해 결심', -600, 0.9, 1, 0.98],
  ['02-01', '적응기', -480, 0.85, 1, 0.97],
  ['02-16', '설 연휴', +300, 0.4, 1, 0.95],
  ['02-20', '재정비', -520, 0.85, 1, 0.97],
  ['04-20', '완만한 구간', -330, 0.75, 1, 0.97],
  ['05-20', '여름 대비', -560, 0.95, 1, 0.98],
  ['07-05', '휴가철', -220, 0.5, 1, 0.95],
  ['08-18', '다시 집중', -500, 0.85, 1, 0.97],
  ['09-24', '추석 연휴', +300, 0.4, 1, 0.95],
  ['09-28', '가을 스퍼트', -560, 0.95, 1, 0.98],
  ['11-01', '꾸준히', -480, 0.85, 1, 0.97],
]

/** 하루 이벤트: [MM-DD, 추가 kcal, 추가 나트륨mg] */
const EVENTS = [
  ['01-01', 900, 1800],
  ['02-16', 1400, 2800],
  ['02-17', 1500, 3000],
  ['02-18', 1100, 2200],
  ['05-05', 700, 1200],
  ['07-31', 900, 1800],
  ['08-01', 900, 1800],
  ['09-24', 1300, 2800],
  ['09-25', 1500, 3000],
  ['09-26', 1100, 2200],
  ['10-31', 600, 1200],
]

/** 메뉴: [이름, kcal, 1회 g, 단백질 g] */
const CLEAN_MENU = [
  ['닭가슴살 샐러드', 320, 300, 32],
  ['고구마', 190, 150, 2],
  ['현미밥', 300, 210, 6],
  ['두부조림', 220, 200, 18],
  ['사과', 95, 180, 0],
  ['그릭요거트', 150, 150, 15],
  ['삶은 달걀 2개', 150, 100, 13],
  ['연어 덮밥', 560, 380, 30],
  ['바나나', 105, 120, 1],
]
const NORMAL_MENU = [
  ['김치찌개', 420, 500, 22],
  ['비빔밥', 620, 450, 20],
  ['된장찌개 백반', 650, 600, 25],
  ['제육볶음 정식', 780, 500, 30],
  ['잔치국수', 480, 550, 14],
]
const JUNK_MENU = [
  ['후라이드 치킨 반마리', 1050, 400, 60],
  ['맥주 500ml', 210, 500, 0],
  ['라면', 500, 550, 10],
  ['페퍼로니 피자 2조각', 600, 220, 24],
  ['떡볶이', 480, 350, 9],
  ['아이스크림', 260, 120, 4],
  ['감자튀김', 330, 110, 4],
  ['삼겹살 2인분', 1300, 400, 50],
]

/** 하루 섭취를 메뉴 단위로 나눈다. 과식한 날은 정크 위주, 평일은 건강식 위주 */
function splitIntoMeals(total, sodiumMg, carbsG, indulgent, rand, dayIdx) {
  const foods = []
  let left = total
  let k = 0
  while (left > 80 && k < 8) {
    const r = rand()
    const menu = indulgent ? (r < 0.6 ? JUNK_MENU : r < 0.85 ? NORMAL_MENU : CLEAN_MENU) : r < 0.55 ? CLEAN_MENU : r < 0.9 ? NORMAL_MENU : JUNK_MENU
    const [name, kcal, g, protein] = menu[Math.floor(rand() * menu.length)]
    const scale = Math.min(1, left / kcal)
    const kc = Math.round(kcal * scale)
    foods.push({ id: `f${dayIdx}-${k}`, name, amount: Math.round(g * scale), unit: 'g', kcal: kc, proteinG: Math.round(protein * scale) })
    left -= kc
    k++
  }
  // 하루 나트륨·탄수화물은 kcal 비율로 나눠 담는다 (수분 예보가 계속 동작하도록)
  const sum = foods.reduce((s, f) => s + f.kcal, 0) || 1
  for (const f of foods) {
    f.sodiumMg = Math.round((sodiumMg * f.kcal) / sum)
    f.carbsG = Math.round((carbsG * f.kcal) / sum)
  }
  return foods
}

export function buildDemoState(today, startDate = `${today.slice(0, 4)}-01-01`) {
  const rand = rng(7)
  const gauss = () => (rand() + rand() + rand() + rand() - 2) * 0.9
  const year = today.slice(0, 4)
  const days = diffDays(startDate, today) + 1
  const START_W = 93
  const profile = {
    sex: 'M',
    birthYear: 1990,
    heightCm: 174,
    startWeightKg: START_W,
    goalWeightKg: 74,
    activityFactor: 1.375,
    startDate,
    watchCorrection: 0.8,
  }
  const BASE_TDEE = 2380 // 시작 시점 실제 기저 소모
  const entries = {}
  let fat = START_W
  let water = 0
  let prevNa = 3200
  let prevCarb = 260

  for (let i = 0; i < days; i++) {
    const date = addDays(startDate, i)
    const md = date.slice(5)
    const dow = new Date(`${date}T12:00:00`).getDay()
    const weekend = dow === 0 || dow === 6
    const [, , delta, exFreq, logRate, honesty] = PHASES.filter(([s]) => md >= s).at(-1)
    const ev = EVENTS.find(([d]) => d === md)

    // 운동 (단계별 빈도)
    const exercises = []
    const go = () => rand() < exFreq
    if ((i % 7 === 1 || i % 7 === 4) && go()) exercises.push({ id: `r${i}`, type: 'run', distanceKm: 4 + Math.round(rand() * 4) })
    if (i % 7 === 3 && go()) exercises.push({ id: `s${i}`, type: 'swim', minutes: 40, intensity: 'moderate' })
    if (i % 14 === 6 && go()) exercises.push({ id: `h${i}`, type: 'hike', minutes: 150, elevationM: 400 + Math.round(rand() * 400) })
    const exKcal = exercises.reduce(
      (s, x) => s + (x.type === 'run' ? 0.95 * fat * x.distanceKm : x.type === 'hike' ? 2.5 * fat * 2.5 + fat * x.elevationM * 0.0094 : 7.3 * fat * (40 / 60)),
      0,
    )

    // 섭취 = 유지 칼로리 + 단계 밸런스 + 주말 편차 + 이벤트 + 무작위
    const maintenance = BASE_TDEE - (START_W - fat) * 22 + exKcal
    const intake = Math.round(maintenance + delta + (weekend ? 260 : -105) + (ev?.[1] ?? 0) + gauss() * 160)
    const sodiumMg = Math.round((weekend ? 4200 : 3000) + (delta > 0 ? 600 : 0) + (ev?.[2] ?? 0) + gauss() * 450)
    const carbsG = Math.round(intake * 0.115 + gauss() * 20)

    water = water * 0.4 + gauss() * 0.14 + (((prevNa - 3200) / 1000 / 3.22) * 0.6 + (prevCarb - 250) * 0.002) * 0.6
    const logged = rand() < logRate
    entries[date] = {
      weightKg: Math.round((fat + water) * 10) / 10, // 매일 측정
      foods: logged
        ? i >= days - 14
          ? // 최근 2주는 실제 메뉴 단위로 (게임에 "내 음식"으로 등장)
            splitIntoMeals(Math.round(intake * honesty), sodiumMg, carbsG, weekend || !!ev, rand, i)
          : [{ id: `f${i}`, name: '하루 식사 합계', amount: null, unit: null, kcal: Math.round(intake * honesty), sodiumMg: Math.round(sodiumMg * honesty), carbsG: Math.round(carbsG * honesty) }]
        : [],
      exercises,
    }
    fat += (intake - maintenance) / 7700
    prevNa = sodiumMg
    prevCarb = carbsG
  }
  // 예시: 내일 회식을 미리 등록 → 이번 주 남은 날 예산이 자동 재분배된다
  const plans = { [addDays(today, 1)]: { label: '회식', extraKcal: 1200 } }
  return { version: 1, profile, entries, plans, game: { best: 2240, plays: 7, xp: 80 }, demo: year }
}

export const DEMO_PHASES = PHASES
