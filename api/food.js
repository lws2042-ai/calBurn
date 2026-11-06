import process from 'node:process'

// Vercel 서버리스 함수: /api/food → 공공데이터포털 식품영양성분DB
// 개발 중에는 vite.config.js 프록시가 같은 역할을 한다. 인증키는 서버 환경변수에만 있다.

const API = 'https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo03/getFoodNtrCpntDbInq03'
const ALLOWED = ['FOOD_NM_KR', 'pageNo', 'numOfRows'] // 이 파라미터만 통과 (오남용 방지)

export default async function handler(req, res) {
  const key = process.env.DATA_GO_KR_KEY
  if (!key) {
    return res.status(500).json({ header: { resultCode: '99', resultMsg: '서버에 DATA_GO_KR_KEY가 설정되지 않았습니다.' } })
  }

  const incoming = new URL(req.url, 'http://localhost').searchParams
  const params = new URLSearchParams()
  for (const k of ALLOWED) {
    const v = incoming.get(k)
    if (v) params.set(k, v.slice(0, 50))
  }
  params.set('numOfRows', String(Math.min(50, Math.max(1, Number(params.get('numOfRows')) || 20))))
  params.set('serviceKey', key)
  params.set('type', 'json')

  try {
    const r = await fetch(`${API}?${params}`)
    const body = await r.text()
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    // 같은 검색어는 하루 동안 CDN에서 응답 → 공공데이터 일일 트래픽 절약
    if (r.ok) res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800')
    return res.status(r.status).send(body)
  } catch {
    return res.status(502).json({ header: { resultCode: '98', resultMsg: '식품 API 연결에 실패했습니다.' } })
  }
}
