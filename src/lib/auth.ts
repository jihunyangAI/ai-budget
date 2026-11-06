import { betterAuth } from "better-auth";
import { createAuthOptions } from "./auth-config";

export const auth = betterAuth(createAuthOptions());

/** 로그인한 요청이면 세션을, 아니면 null을 반환 (API 라우트에서 사용) */
export async function getRequestSession(request: Request) {
  return auth.api.getSession({ headers: request.headers });
}

export const unauthorized = () =>
  Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
