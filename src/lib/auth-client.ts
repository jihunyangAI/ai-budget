"use client";

import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";

// baseURL을 생략하면 현재 접속한 주소(origin)를 사용한다.
export const authClient = createAuthClient({
  plugins: [usernameClient()],
});
