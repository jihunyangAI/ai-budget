# AI가계부

영수증 사진을 업로드하면 Gemini(`gemini-3.5-flash-lite`)가 항목을 읽고 카테고리별로 자동 분류하는 Next.js 가계부입니다. 데이터는 Neon Postgres에 저장됩니다.

## 시작하기

1. `.env.local`에 Gemini API 키를 넣습니다 ([발급](https://aistudio.google.com/apikey)).
   ```
   GEMINI_API_KEY=발급받은_키
   ```
2. Neon 연결 문자열을 추가하고 테이블을 만듭니다 (`npx neonctl auth`로 로그인 필요).
   ```bash
   npm run db:env       # Neon 프로젝트 ai-budget의 DATABASE_URL을 .env.local에 추가
   npm run db:migrate   # expenses 테이블 생성
   ```
3. 로그인 설정 (비밀키 생성, 인증 테이블 생성, 초기 계정 생성)
   ```bash
   npm run auth:setup   # 초기 계정: ai-test-id / ai-test-pw
   npm run db:seed      # (선택) 테스트용 가짜 지출 20건
   ```
4. 실행
   ```bash
   npm install
   npm run dev
   ```

## 구조

| 경로 | 역할 |
|------|------|
| `src/app/page.tsx` | 입력 탭: 영수증 업로드, 분석 결과, 최근 지출 목록(수정/삭제) |
| `src/app/dashboard/page.tsx` | 대시보드 탭: 월별 카테고리 도넛 차트, 카테고리별 금액 |
| `src/app/api/analyze` | POST: Gemini로 영수증 분석 후 DB 저장 |
| `src/app/api/expenses` | GET 목록 / POST 생성 |
| `src/app/api/expenses/[id]` | PUT 수정 / DELETE 삭제 |
| `src/app/api/stats` | GET `?month=YYYY-MM`: 카테고리별 합계 |
| `src/app/login` | 로그인 페이지 |
| `src/app/(main)/change-password` | 비밀번호 변경 페이지 |
| `src/app/api/auth/[...all]` | Better Auth 엔드포인트 |
| `src/proxy.ts` | 로그인 쿠키가 없으면 /login으로 이동, API는 401 |
| `src/lib/auth-config.ts` | Better Auth 설정 (아이디 로그인, 회원가입 차단) |
| `src/lib/db.ts` | Neon 쿼리 |
| `scripts/` | `neon-env.mjs`(연결 문자열), `migrate.mjs`(지출 테이블), `auth-setup.mjs`(인증 테이블·초기 계정), `seed-expenses.mjs`(가짜 데이터) |

## DB

- Neon 프로젝트: `ai-budget` (`bitter-brook-02318708`, aws-us-east-1)
- 테이블 `expenses`: `id uuid`, `store`, `date`, `total`, `items jsonb`, `created_at`

## 로그인

- Better Auth 아이디/비밀번호 로그인 (username 플러그인). 비밀번호는 해시로 DB(`account` 테이블)에 저장됩니다.
- 공개 회원가입은 막혀 있고, 계정은 `npm run auth:setup`으로만 만듭니다.
  다른 계정: `INITIAL_USERNAME=아이디 INITIAL_PASSWORD=비밀번호 npm run auth:setup`
- 인증 테이블: `user`, `session`, `account`, `verification`
