"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

/** 로그인 후 돌아갈 경로. 외부 주소로의 이동을 막기 위해 같은 사이트 경로만 허용 */
function safeNextPath() {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("아이디와 비밀번호를 입력해주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await authClient.signIn.username({ username: username.trim(), password });
    if (error) {
      setError(
        error.status === 429
          ? "로그인 시도가 너무 많아요. 잠시 후 다시 시도해주세요."
          : "아이디 또는 비밀번호가 올바르지 않습니다.",
      );
      setLoading(false);
      return;
    }
    router.replace(safeNextPath());
    router.refresh();
  };

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">AI가계부</h1>
          <p className="mt-1 text-sm text-gray-500">로그인하고 지출을 기록하세요</p>
        </div>
        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          noValidate
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700">아이디</span>
            <input
              className={inputClass}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700">비밀번호</span>
            <input
              type="password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-lg bg-blue-600 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}
