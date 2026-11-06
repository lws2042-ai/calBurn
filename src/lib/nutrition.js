// 식약처 식품영양성분DB 응답 → 앱 내부 스키마 변환 (순수 함수)

/** "1,008.250" / "89.00" / "" / null → number | null */
export function toNumber(v) {
  if (v === null || v === undefined) return null
  const s = String(v).replace(/,/g, '').trim()
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** "100g" / "100ml" / "270.000g" → { amount, unit } | null */
export function parseQuantity(v) {
  if (!v) return null
  const m = String(v).replace(/,/g, '').match(/([\d.]+)\s*(g|ml|mL|L|kg)?/)
  if (!m) return null
  let amount = Number(m[1])
  let unit = (m[2] || 'g').toLowerCase()
  if (unit === 'kg') { amount *= 1000; unit = 'g' }
  if (unit === 'l') { amount *= 1000; unit = 'ml' }
  return Number.isFinite(amount) && amount > 0 ? { amount, unit } : null
}

/**
 * API item → FoodItem
 * 필드 매핑은 실제 응답으로 검증함 (2026-11-06):
 *   AMT_NUM1 에너지(kcal) · AMT_NUM3 단백질(g) · AMT_NUM4 지방(g) · AMT_NUM6 탄수화물(g) · AMT_NUM13 나트륨(mg)
 *   SERVING_SIZE 영양성분 기준량(보통 100g) · Z10500 식품 중량(1인분/1개)
 */
export function normalizeFood(raw) {
  const basis = parseQuantity(raw.SERVING_SIZE) ?? { amount: 100, unit: 'g' }
  const serving = parseQuantity(raw.Z10500)
  return {
    id: raw.FOOD_CD,
    name: raw.FOOD_NM_KR,
    group: raw.DB_GRP_NM,           // 음식 / 가공식품 / 원재료성식품 …
    category: raw.FOOD_CAT1_NM,
    maker: raw.MAKER_NM || raw.SELLER_MANUFAC_NM || null,
    isRepresentative: raw.DB_CLASS_NM === '품목대표',
    basis,                           // 영양값 기준량
    servingAmount: serving?.amount ?? null,
    kcal: toNumber(raw.AMT_NUM1),    // basis 당
    protein: toNumber(raw.AMT_NUM3),
    fat: toNumber(raw.AMT_NUM4),
    carbs: toNumber(raw.AMT_NUM6),
    sodium: toNumber(raw.AMT_NUM13), // mg, basis 당
  }
}

/** 섭취량(g 또는 ml)에 해당하는 kcal */
export function kcalForAmount(food, amount) {
  if (food.kcal == null || !(amount > 0)) return 0
  return (food.kcal * amount) / food.basis.amount
}

/**
 * API는 부분일치 검색이라 "콜라" → "쇼콜라"도 섞여 옴.
 * 정확일치 > 접두일치 > 품목대표 > 이름 짧은 순으로 정렬.
 */
export function rankFoods(foods, query) {
  const q = query.trim()
  const score = (f) => {
    const base = f.name.split('_')[0]
    let s = 0
    if (f.name === q || base === q) s += 1000
    else if (f.name.startsWith(q)) s += 500
    if (f.isRepresentative) s += 100
    if (f.kcal == null) s -= 300
    return s - f.name.length
  }
  return [...foods].sort((a, b) => score(b) - score(a))
}

/** 섭취량만큼의 영양소 (기준량 비례). 값이 없는 항목은 null */
export function nutrientsForAmount(food, amount) {
  const r = amount / food.basis.amount
  const at = (v, digits = 0) => (v == null ? null : Math.round(v * r * 10 ** digits) / 10 ** digits)
  return { kcal: Math.round(kcalForAmount(food, amount)), carbsG: at(food.carbs, 1), proteinG: at(food.protein, 1), sodiumMg: at(food.sodium) }
}
