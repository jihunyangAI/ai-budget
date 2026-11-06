import { CATEGORIES, type Category, type ExpenseItem, type ReceiptAnalysis } from "./types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(s: string) {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function toCategory(v: unknown): Category {
  return CATEGORIES.includes(v as Category) ? (v as Category) : "기타";
}

function toItems(raw: unknown): ExpenseItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 200).map((it) => {
    const o = (it ?? {}) as Record<string, unknown>;
    return {
      name: String(o.name ?? "").trim().slice(0, 200) || "항목",
      quantity: Math.max(1, Math.round(Number(o.quantity) || 1)),
      price: Math.max(0, Math.round(Number(o.price) || 0)),
      category: toCategory(o.category),
    };
  });
}

/**
 * 외부 입력(Gemini 응답, 클라이언트 요청)을 저장 가능한 형태로 정리한다.
 * total을 주지 않으면 항목 합계를 사용한다.
 */
export function normalizeExpense(
  raw: unknown,
  { useItemSumAsTotal = false }: { useItemSumAsTotal?: boolean } = {},
): ReceiptAnalysis | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const items = toItems(o.items);
  if (items.length === 0) return null;

  const itemSum = items.reduce((s, i) => s + i.price, 0);
  const date = typeof o.date === "string" && isValidDate(o.date) ? o.date : null;
  if (!date) return null;

  return {
    store: String(o.store ?? "").trim().slice(0, 200) || "알 수 없는 상점",
    date,
    total: useItemSumAsTotal ? itemSum : Math.max(0, Math.round(Number(o.total) || itemSum)),
    items,
  };
}

export const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

export const isMonthKey = (s: string | null): s is string => !!s && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
