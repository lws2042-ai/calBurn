import { normalizeFood, rankFoods } from '../lib/nutrition'

const cache = new Map() // query → FoodItem[]  (일일 트래픽 절약)
const PAGE_SIZE = 50

export class FoodApiError extends Error {}

/**
 * 식품명 검색. 인증키는 Vite 프록시(/api/food)가 서버 측에서 붙인다.
 * @returns {Promise<{ items: FoodItem[], total: number }>}
 */
export async function searchFood(query, { signal } = {}) {
  const q = query.trim()
  if (q.length < 1) return { items: [], total: 0 }
  if (cache.has(q)) return cache.get(q)

  const params = new URLSearchParams({ FOOD_NM_KR: q, pageNo: '1', numOfRows: String(PAGE_SIZE) })
  const res = await fetch(`/api/food?${params}`, { signal })

  let json
  try {
    json = await res.json()
  } catch {
    throw new FoodApiError(`응답 해석 실패 (HTTP ${res.status})`)
  }

  // 인증 오류 등은 OpenAPI_ServiceResponse 형태로 옴
  const authErr = json?.OpenAPI_ServiceResponse?.cmmMsgHeader
  if (authErr) throw new FoodApiError(authErr.returnAuthMsg || authErr.errMsg)
  if (json?.header?.resultCode !== '00') {
    throw new FoodApiError(json?.header?.resultMsg || `HTTP ${res.status}`)
  }

  const rawItems = Array.isArray(json.body?.items) ? json.body.items : [] // 결과 0건이면 items 없음
  const result = {
    items: rankFoods(rawItems.map(normalizeFood), q),
    total: json.body?.totalCount ?? 0,
  }
  cache.set(q, result)
  return result
}
