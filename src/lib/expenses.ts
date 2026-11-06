import { CATEGORIES, type Category, type Expense, type ReceiptAnalysis } from "./types";

export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

/* ───────── 월(YYYY-MM) 계산 ───────── */

export interface YearMonth {
  year: number;
  month: number; // 1-12
}

export const toMonthKey = ({ year, month }: YearMonth) => `${year}-${String(month).padStart(2, "0")}`;

export function shiftMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function thisMonth(): YearMonth {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** 항목들을 카테고리별로 합산 (CATEGORIES 정의 순서) */
export function categoryTotals(items: { category: Category; price: number }[]) {
  const totals = new Map<Category, number>();
  for (const it of items) totals.set(it.category, (totals.get(it.category) ?? 0) + it.price);
  return CATEGORIES.filter((c) => totals.has(c)).map((c) => ({ category: c, amount: totals.get(c)! }));
}

/* ───────── 클라이언트 → API ───────── */

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (res.status === 401) {
    // 세션이 만료됐으면 로그인 페이지로 이동. 컴포넌트 밖 헬퍼라 router를 쓸 수 없고,
    // 화면 상태를 모두 비우는 전체 새로고침이 의도된 동작이다.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    throw new Error("로그인이 필요합니다.");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "요청에 실패했습니다.");
  return data as T;
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export type MonthStats = {
  month: string;
  total: number;
  count: number;
  rows: { category: Category; amount: number }[];
};

export const api = {
  list: (month?: string) => request<Expense[]>(month ? `/api/expenses?month=${month}` : "/api/expenses"),
  create: (data: ReceiptAnalysis) => request<Expense>("/api/expenses", jsonInit("POST", data)),
  update: (id: string, data: ReceiptAnalysis) =>
    request<Expense>(`/api/expenses/${id}`, jsonInit("PUT", data)),
  remove: (id: string) => request<void>(`/api/expenses/${id}`, { method: "DELETE" }),
  stats: (month: string) => request<MonthStats>(`/api/stats?month=${month}`),
  analyze: (form: FormData) => request<Expense>("/api/analyze", { method: "POST", body: form }),
};

/* ───────── 이전 버전(localStorage) 데이터 이전 ───────── */

const LEGACY_KEY = "ai-household-expenses";

let migration: Promise<number> | null = null;

/**
 * 브라우저에 남아 있는 이전 데이터를 DB로 옮긴다. 옮긴 건수를 반환.
 * (개발 모드 StrictMode에서 effect가 두 번 실행돼도 한 번만 이전되도록 Promise를 공유)
 */
export function migrateLegacyExpenses(): Promise<number> {
  migration ??= doMigrate();
  return migration;
}

async function doMigrate(): Promise<number> {
  let legacy: Expense[] = [];
  try {
    legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? "[]");
  } catch {
    return 0;
  }
  if (!Array.isArray(legacy) || legacy.length === 0) return 0;

  // 오래된 것부터 넣어 created_at 순서를 유지
  const remaining: Expense[] = [];
  let moved = 0;
  for (const e of [...legacy].reverse()) {
    try {
      await api.create({ store: e.store, date: e.date, total: e.total, items: e.items });
      moved++;
    } catch {
      remaining.unshift(e);
    }
  }
  try {
    if (remaining.length) localStorage.setItem(LEGACY_KEY, JSON.stringify(remaining));
    else localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
  return moved;
}
