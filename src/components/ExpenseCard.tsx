"use client";

import { useState } from "react";
import CategoryBadge from "@/components/CategoryBadge";
import { categoryTotals, won } from "@/lib/expenses";
import { CATEGORIES, CATEGORY_STYLES, type Category, type Expense, type ReceiptAnalysis } from "@/lib/types";

interface DraftItem {
  name: string;
  quantity: number;
  price: string; // 입력 중인 값 (숫자만)
  category: Category;
}

interface Draft {
  store: string;
  date: string;
  items: DraftItem[];
}

const toDraft = (e: Expense): Draft => ({
  store: e.store,
  date: e.date,
  items: e.items.map((it) => ({ ...it, price: String(it.price) })),
});

const digitsOnly = (v: string) => v.replace(/[^\d]/g, "");
const formatDigits = (v: string) => (v === "" ? "" : Number(v).toLocaleString("ko-KR"));

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

interface Props {
  expense: Expense;
  onSave: (id: string, data: ReceiptAnalysis) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function ExpenseCard({ expense, onSave, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const editing = draft !== null;

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await onDelete(expense.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제하지 못했습니다.");
      setBusy(false);
    }
  };

  const startEdit = () => {
    setDraft(toDraft(expense));
    setError(null);
    setOpen(true);
  };

  const cancelEdit = () => {
    setDraft(null);
    setError(null);
  };

  const updateItem = (index: number, patch: Partial<DraftItem>) =>
    setDraft((d) => d && { ...d, items: d.items.map((it, i) => (i === index ? { ...it, ...patch } : it)) });

  const save = async () => {
    if (!draft || busy) return;
    if (draft.items.some((it) => it.name.trim() === "")) {
      setError("항목명을 입력해주세요.");
      return;
    }
    if (draft.items.some((it) => it.price === "")) {
      setError("금액을 입력해주세요.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) {
      setError("날짜를 입력해주세요.");
      return;
    }
    const items = draft.items.map((it) => ({
      name: it.name.trim(),
      quantity: it.quantity,
      price: Number(it.price),
      category: it.category,
    }));
    setBusy(true);
    setError(null);
    try {
      await onSave(expense.id, {
        store: draft.store.trim() || "알 수 없는 상점",
        date: draft.date,
        items,
        total: items.reduce((s, it) => s + it.price, 0),
      });
      setDraft(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  /* ───────── 수정 모드 ───────── */
  if (editing) {
    const draftTotal = draft.items.reduce((s, it) => s + (Number(it.price) || 0), 0);
    return (
      <li className="rounded-xl border-2 border-blue-200 bg-blue-50/30 p-4">
        <p className="mb-3 text-xs font-semibold text-blue-600">수정 중</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">상호명</span>
            <input
              className={inputClass}
              value={draft.store}
              onChange={(e) => setDraft({ ...draft, store: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">날짜</span>
            <input
              type="date"
              className={inputClass}
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            />
          </label>
        </div>

        <ul className="mt-4 flex flex-col gap-3">
          {draft.items.map((it, i) => (
            <li key={i} className="rounded-lg border border-gray-200 bg-white p-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-gray-500">항목명</span>
                <input
                  className={inputClass}
                  value={it.name}
                  onChange={(e) => updateItem(i, { name: e.target.value })}
                />
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">카테고리</span>
                  <select
                    className={inputClass}
                    value={it.category}
                    onChange={(e) => updateItem(i, { category: e.target.value as Category })}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_STYLES[c].emoji} {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">금액(원)</span>
                  <input
                    inputMode="numeric"
                    className={`${inputClass} text-right tabular-nums`}
                    value={formatDigits(it.price)}
                    onChange={(e) => updateItem(i, { price: digitsOnly(e.target.value) })}
                  />
                </label>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-gray-500">합계</span>
          <span className="font-semibold tabular-nums text-gray-900">{won(draftTotal)}</span>
        </div>

        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={cancelEdit}
            className="rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
          >
            {busy ? "저장 중..." : "저장"}
          </button>
        </div>
      </li>
    );
  }

  /* ───────── 보기 모드 ───────── */
  return (
    <li className="rounded-xl border border-gray-100 bg-white p-4 transition hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="min-w-0 flex-1 text-left"
          aria-expanded={open}
        >
          <p className="truncate font-medium text-gray-900">{expense.store}</p>
          <p className="truncate text-xs text-gray-500">
            {expense.date} · {expense.items.length}개 항목 {open ? "▲" : "▼"}
          </p>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <p className="mr-1 font-semibold tabular-nums text-gray-900">{won(expense.total)}</p>
          <button
            type="button"
            onClick={startEdit}
            className="rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
            aria-label={`${expense.store} 지출 수정`}
          >
            수정
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="rounded-md p-1 text-gray-300 hover:bg-gray-100 hover:text-red-500 disabled:opacity-40"
            aria-label={`${expense.store} 지출 삭제`}
          >
            ✕
          </button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {categoryTotals(expense.items).map(({ category }) => (
          <CategoryBadge key={category} category={category} />
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
      {open && (
        <ul className="mt-3 divide-y divide-gray-100 border-t border-gray-100">
          {expense.items.map((it, i) => (
            <li key={i} className="flex justify-between gap-3 py-1.5 text-sm">
              <span className="truncate text-gray-700">
                {CATEGORY_STYLES[it.category].emoji} {it.name}
                {it.quantity > 1 && <span className="text-gray-400"> ×{it.quantity}</span>}
              </span>
              <span className="shrink-0 tabular-nums text-gray-600">{won(it.price)}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
