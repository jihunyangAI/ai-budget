// Better Auth 공통 설정. Next 앱(src/lib/auth.ts)과 설정 스크립트(scripts/auth-setup.mjs)가 함께 쓴다.
// 스크립트에서 Node가 직접 불러오므로 경로 별칭(@/)이나 TS 전용 문법(enum 등)을 쓰지 않는다.
import { Pool } from "pg";
import type { BetterAuthOptions } from "better-auth";
import { username } from "better-auth/plugins";

/** 아이디 허용 문자: 영문, 숫자, 점, 밑줄, 하이픈 (ai-test-id 같은 형식 허용) */
export const USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/;
export const MIN_PASSWORD_LENGTH = 8;

/**
 * 로그인 요청을 받을 호스트 목록. 기본값은 이 PC(localhost)와 같은 Wi-Fi의 기기(192.168.*).
 * 배포 시에는 BETTER_AUTH_ALLOWED_HOSTS="myapp.com,*.vercel.app"처럼 지정한다.
 */
const ALLOWED_HOSTS = process.env.BETTER_AUTH_ALLOWED_HOSTS?.split(",")
  .map((h) => h.trim())
  .filter(Boolean) ?? ["localhost:*", "127.0.0.1:*", "192.168.*"];

let pool: Pool | null = null;
function getPool() {
  // Neon 인증서까지 검증하도록 verify-full을 명시 (pg의 sslmode=require 의미 변경 경고 대응)
  const connectionString = process.env.DATABASE_URL?.replace("sslmode=require", "sslmode=verify-full");
  pool ??= new Pool({ connectionString, max: 5 });
  return pool;
}

export function createAuthOptions({ allowSignUp = false }: { allowSignUp?: boolean } = {}) {
  return {
    baseURL: { allowedHosts: ALLOWED_HOSTS },
    database: getPool(),
    emailAndPassword: {
      enabled: true,
      // 공개 회원가입은 막는다. 계정은 npm run auth:setup으로만 만든다.
      disableSignUp: !allowSignUp,
      minPasswordLength: MIN_PASSWORD_LENGTH,
    },
    plugins: [
      username({
        minUsernameLength: 3,
        maxUsernameLength: 30,
        usernameValidator: (value: string) => USERNAME_PATTERN.test(value),
      }),
    ],
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7일
      updateAge: 60 * 60 * 24, // 하루에 한 번 만료 연장
    },
  } satisfies BetterAuthOptions;
}
