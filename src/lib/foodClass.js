// 기록된 음식을 건강 / 해로움 / 중립으로 분류한다.
// 1순위: 영양 데이터(에너지 밀도, 단백질 비율, 나트륨) — 숫자는 거짓말을 하지 않는다
// 2순위: 음식 이름 키워드 — 직접 입력처럼 영양 정보가 없을 때

const HEALTHY_KW = [
  '샐러드', '닭가슴살', '브로콜리', '사과', '바나나', '고구마', '두부', '달걀', '계란', '현미', '오트', '귀리',
  '요거트', '요구르트', '토마토', '채소', '나물', '생선', '연어', '고등어', '견과', '아몬드', '호두', '블루베리',
  '시금치', '양배추', '오이', '당근', '버섯', '미역', '콩', '두유', '단백질', '프로틴', '곤약', '키위', '오렌지', '딸기', '포도',
]
const HARMFUL_KW = [
  '치킨', '피자', '라면', '햄버거', '버거', '튀김', '감자튀김', '케이크', '도넛', '과자', '초콜릿', '아이스크림',
  '콜라', '사이다', '맥주', '소주', '와인', '막걸리', '족발', '보쌈', '삼겹살', '곱창', '떡볶이', '마카롱', '쿠키',
  '짜장', '짬뽕', '탕수육', '핫도그', '소시지', '컵라면', '야식', '믹스커피', '프라푸치노', '버블티', '크림빵', '와플',
  '나쵸', '팝콘', '전병', '꽈배기', '밀크쉐이크', '닭강정', '돈가스', '돈까스',
]

/** 이름 → 이모지 (게임 표시용) */
const EMOJI = [
  ['샐러드', '🥗'], ['닭가슴살', '🥗'], ['제육', '🥘'], ['볶음', '🥘'], ['백반', '🍱'], ['정식', '🍱'], ['덮밥', '🍚'],
  ['치킨', '🍗'], ['닭강정', '🍗'], ['닭', '🍗'], ['피자', '🍕'], ['라면', '🍜'], ['짬뽕', '🍜'], ['짜장', '🍜'], ['국수', '🍜'],
  ['버거', '🍔'], ['햄버거', '🍔'], ['감자튀김', '🍟'], ['튀김', '🍤'], ['케이크', '🍰'], ['도넛', '🍩'], ['쿠키', '🍪'],
  ['과자', '🍪'], ['초콜릿', '🍫'], ['아이스크림', '🍦'], ['콜라', '🥤'], ['사이다', '🥤'], ['버블티', '🧋'], ['커피', '☕'],
  ['맥주', '🍺'], ['소주', '🍶'], ['막걸리', '🍶'], ['와인', '🍷'], ['삼겹살', '🥓'], ['족발', '🍖'], ['보쌈', '🍖'], ['고기', '🍖'],
  ['떡볶이', '🌶️'], ['김밥', '🍙'], ['주먹밥', '🍙'], ['삼각김밥', '🍙'], ['밥', '🍚'], ['찌개', '🍲'], ['탕', '🍲'], ['국', '🍲'],
  ['빵', '🍞'], ['샌드위치', '🥪'], ['핫도그', '🌭'], ['샐러드', '🥗'], ['브로콜리', '🥦'], ['사과', '🍎'], ['바나나', '🍌'],
  ['고구마', '🍠'], ['달걀', '🥚'], ['계란', '🥚'], ['두부', '🧈'], ['생선', '🐟'], ['연어', '🐟'], ['고등어', '🐟'],
  ['요거트', '🥛'], ['우유', '🥛'], ['토마토', '🍅'], ['딸기', '🍓'], ['포도', '🍇'], ['오렌지', '🍊'], ['키위', '🥝'],
  ['견과', '🥜'], ['아몬드', '🥜'], ['당근', '🥕'], ['오이', '🥒'], ['버섯', '🍄'],
]

const has = (name, list) => list.some((k) => name.includes(k))
/** 국물·면 요리: 물 때문에 100g당 kcal이 낮게 나와 저밀도 규칙을 적용하지 않는다 */
const SOUPY_KW = ['찌개', '탕', '국', '국수', '면', '전골', '라면', '짬뽕', '우동']

export function emojiFor(name = '') {
  return EMOJI.find(([k]) => name.includes(k))?.[1] ?? '🍽️'
}

/** 하루 합계·간편 기록·직접 입력처럼 "음식 하나"가 아닌 기록 */
export function isAggregate(food) {
  const n = food.name ?? ''
  return food.quick || n.includes('합계') || n.startsWith('간편:') || n === '직접 입력'
}

/**
 * @returns 'healthy' | 'harmful' | 'neutral'
 */
export function classifyFood(food) {
  const name = food.name ?? ''
  const kcal = Number(food.kcal) || 0

  // 간편 기록: "많이"는 과식 신호
  if (name.startsWith('간편:')) return name.includes('많이') ? 'harmful' : 'neutral'

  // 이름이 분명하면 이름을 우선 (예: '닭가슴살 샐러드' vs '치킨')
  const kwHarm = has(name, HARMFUL_KW)
  const kwHealth = has(name, HEALTHY_KW)
  if (kwHarm && !kwHealth) return 'harmful'

  // 영양 데이터 기반
  const grams = food.unit === 'g' || food.unit === 'ml' ? Number(food.amount) : null
  const density = grams > 0 ? (kcal / grams) * 100 : null // kcal / 100g
  const proteinShare = food.proteinG != null && kcal > 0 ? (food.proteinG * 4) / kcal : null
  const naPer100kcal = food.sodiumMg != null && kcal > 0 ? (food.sodiumMg / kcal) * 100 : null

  if (density != null || proteinShare != null || naPer100kcal != null) {
    if ((density != null && density > 320) || (food.sodiumMg ?? 0) > 1800 || (naPer100kcal != null && naPer100kcal > 400)) {
      return kwHealth ? 'neutral' : 'harmful'
    }
    if ((proteinShare != null && proteinShare >= 0.3 && (density == null || density <= 220)) || (density != null && density < 90 && !has(name, SOUPY_KW))) {
      return 'healthy'
    }
  }

  if (kwHealth && !kwHarm) return 'healthy'
  if (kwHarm) return 'harmful'
  return 'neutral'
}
