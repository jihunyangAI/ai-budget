"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function UserMenu() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  };

  const username = session?.user
    ? ((session.user as { username?: string }).username ?? session.user.name)
    : null;

  const buttonClass =
    "whitespace-nowrap rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 sm:text-sm";

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {username && (
        <span className="mr-1 hidden items-center gap-1.5 text-sm text-gray-500 lg:flex">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
            {username.slice(0, 1).toUpperCase()}
          </span>
          {username}
        </span>
      )}
      <Link href="/change-password" className={buttonClass}>
        비밀번호 변경
      </Link>
      <button type="button" onClick={signOut} disabled={signingOut} className={`${buttonClass} disabled:opacity-50`}>
        {signingOut ? "로그아웃 중..." : "로그아웃"}
      </button>
    </div>
  );
}
