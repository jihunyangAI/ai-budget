// Better Auth 초기 설정. 사용: npm run auth:setup
//  1) BETTER_AUTH_SECRET이 없으면 랜덤 생성해 .env.local에 추가 (값은 출력하지 않음)
//  2) 인증 테이블(user, session, account, verification) 생성/갱신
//  3) 초기 계정 생성 (이미 있으면 건너뜀)
import { randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { createAuthOptions } from "../src/lib/auth-config.ts";

const INITIAL_USERNAME = process.env.INITIAL_USERNAME ?? "ai-test-id";
const INITIAL_PASSWORD = process.env.INITIAL_PASSWORD ?? "ai-test-pw";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL이 없습니다. 먼저 npm run db:env를 실행하세요.");
  process.exit(1);
}

if (!process.env.BETTER_AUTH_SECRET) {
  const secret = randomBytes(32).toString("base64url");
  appendFileSync(".env.local", `\n# Better Auth session signing secret\nBETTER_AUTH_SECRET=${secret}\n`);
  process.env.BETTER_AUTH_SECRET = secret;
  console.log("BETTER_AUTH_SECRET을 생성해 .env.local에 추가했습니다.");
}

// 계정 생성을 위해 이 스크립트 안에서만 회원가입을 허용한다
const options = createAuthOptions({ allowSignUp: true });

const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(options);
if (toBeCreated.length || toBeAdded.length) {
  await runMigrations();
  console.log(`인증 테이블 준비 완료: ${[...toBeCreated, ...toBeAdded].map((t) => t.table).join(", ")}`);
} else {
  console.log("인증 테이블이 이미 최신 상태입니다.");
}

const auth = betterAuth(options);
const { rows } = await options.database.query('SELECT id FROM "user" WHERE username = $1', [
  INITIAL_USERNAME.toLowerCase(),
]);

if (rows.length > 0) {
  console.log(`초기 계정 '${INITIAL_USERNAME}'이(가) 이미 있습니다.`);
} else {
  await auth.api.signUpEmail({
    body: {
      name: INITIAL_USERNAME,
      username: INITIAL_USERNAME,
      // Better Auth는 이메일 필드가 필수라 내부용 주소를 넣는다 (로그인은 아이디로 한다)
      email: `${INITIAL_USERNAME}@ai-budget.local`,
      password: INITIAL_PASSWORD,
    },
  });
  console.log(`초기 계정 '${INITIAL_USERNAME}'을(를) 만들었습니다.`);
}

await options.database.end();
