import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * 1차(낙관적) 확인: 세션 쿠키가 없으면 페이지는 /login으로, API는 401로 막는다.
 * 쿠키의 유효성(만료·위조)은 각 API 라우트에서 auth.api.getSession으로 다시 검증한다.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/login") return NextResponse.next();

  if (getSessionCookie(request)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const url = new URL("/login", request.url);
  if (pathname !== "/") url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  // 인증 API, Next 내부 파일, 정적 파일은 제외
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
