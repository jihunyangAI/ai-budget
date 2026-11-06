"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "입력", icon: "🧾" },
  { href: "/dashboard", label: "대시보드", icon: "📊" },
] as const;

export default function TabNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="메인 메뉴" className="grid grid-cols-2 rounded-xl bg-gray-100 p-1 md:flex md:gap-1">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors md:px-5 ${
              active ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <span aria-hidden>{tab.icon}</span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
