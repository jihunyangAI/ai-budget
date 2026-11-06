"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

const MIN_LENGTH = 8;

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export default function ChangePasswordPage() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!current || !next || !confirm) return setError("모든 칸을 입력해주세요.");
    if (next.length < MIN_LENGTH) return setError(`새 비밀번호는 ${MIN_LENGTH}자 이상이어야 합니다.`);
    if (next !== confirm) return setError("새 비밀번호가 서로 일치하지 않습니다.");
    if (next === current) return setError("새 비밀번호가 현재 비밀번호와 같습니다.");

    setLoading(true);
    const { error } = await authClient.changePassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: true, // 다른 기기의 로그인은 해제
    });
    setLoading(false);
    if (error) {
      setError(
        error.code === "INVALID_PASSWORD"
          ? "현재 비밀번호가 올바르지 않습니다."
          : (error.message ?? "비밀번호를 변경하지 못했습니다."),
      );
      return;
    }
    setDone(true);
    setCurrent("");
    setNext("");
    setConfirm("");
  };

  return (
    <section className="mx-auto w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:mt-6 sm:p-6">
      <h2 className="text-lg font-semibold text-gray-900">비밀번호 변경</h2>
      <p className="mt-1 text-sm text-gray-500">변경하면 다른 기기의 로그인은 자동으로 해제돼요.</p>

      {done ? (
        <div className="mt-5 flex flex-col gap-3">
          <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            ✓ 비밀번호를 변경했어요.
          </p>
          <Link
            href="/"
            className="rounded-lg bg-blue-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-blue-700"
          >
            입력 화면으로 돌아가기
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4" noValidate>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700">현재 비밀번호</span>
            <input
              type="password"
              className={inputClass}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700">새 비밀번호</span>
            <input
              type="password"
              className={inputClass}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
            />
            <span className="text-xs text-gray-400">{MIN_LENGTH}자 이상</span>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700">새 비밀번호 확인</span>
            <input
              type="password"
              className={inputClass}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/"
              className="rounded-lg border border-gray-200 bg-white py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              취소
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? "변경 중..." : "변경하기"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
