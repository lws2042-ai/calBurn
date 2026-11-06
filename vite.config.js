import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import process from 'node:process'

const FOOD_API_PATH = '/1471000/FoodNtrCpntDbInfo03/getFoodNtrCpntDbInq03'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 세 번째 인자 '' → VITE_ 접두사 없는 변수도 읽음 (Node 측에서만 사용, 번들에 포함되지 않음)
  const env = loadEnv(mode, process.cwd(), '')
  const serviceKey = env.DATA_GO_KR_KEY

  if (!serviceKey) {
    console.warn('[calBurn] .env에 DATA_GO_KR_KEY가 없습니다. 음식 검색이 동작하지 않습니다.')
  }

  return {
    plugins: [react()],
    server: {
      host: true, // 같은 와이파이의 휴대폰에서 접속 가능
      proxy: {
        // 브라우저: /api/food?FOOD_NM_KR=김치찌개
        // → apis.data.go.kr/...getFoodNtrCpntDbInq03?FOOD_NM_KR=김치찌개&serviceKey=***&type=json
        '/api/food': {
          target: 'https://apis.data.go.kr',
          changeOrigin: true,
          rewrite: (path) => {
            const url = new URL(path, 'http://local')
            const params = url.searchParams
            params.delete('serviceKey') // 클라이언트가 보낸 키는 무시
            params.set('serviceKey', serviceKey ?? '')
            params.set('type', 'json')
            return `${FOOD_API_PATH}?${params.toString()}`
          },
        },
      },
    },
  }
})
