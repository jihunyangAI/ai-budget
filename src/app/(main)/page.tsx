"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CategoryBadge from "@/components/CategoryBadge";
import ExpenseCard from "@/components/ExpenseCard";
import StatCard from "@/components/StatCard";
import { CATEGORY_STYLES, type Expense, type ReceiptAnalysis } from "@/lib/types";
import {
  api,
  categoryTotals,
  migrateLegacyExpenses,
  thisMonth,
  toMonthKey,
  won,
  type MonthStats,
} from "@/lib/expenses";

/** 큰 휴대폰 사진은 최대 1600px JPEG로 줄여 업로드 용량을 낮춘다. 디코딩 실패 시 원본 사용. */
async function compressImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

const cardClass = "rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6";

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 방금 분석한 영수증 id. 결과 패널은 목록의 데이터를 그대로 보여주므로 수정 내용이 함께 반영된다.
  const [resultId, setResultId] = useState<string | null>(null);
  const result = expenses.find((e) => e.id === resultId) ?? null;
  const [listState, setListState] = useState<"loading" | "ready" | "error">("loading");
  const [notice, setNotice] = useState<string | null>(null);
  const [monthStats, setMonthStats] = useState<MonthStats | null>(null);
  // 지출이 추가·수정·삭제될 때마다 올려서 이번 달 요약을 다시 불러온다
  const [dataVersion, setDataVersion] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 이전 버전에서 브라우저에 저장했던 지출이 있으면 DB로 한 번 옮긴다
      const moved = await migrateLegacyExpenses();
      if (!cancelled && moved > 0) setNotice(`브라우저에 저장돼 있던 지출 ${moved}건을 DB로 옮겼어요.`);
      try {
        const list = await api.list();
        if (cancelled) return;
        setExpenses(list);
        setListState("ready");
      } catch {
        if (!cancelled) setListState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    let cancelled = false;
    api
      .stats(toMonthKey(thisMonth()))
      .then((s) => !cancelled && setMonthStats(s))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [dataVersion]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    setError(null);
    setResultId(null);
    setPreview(URL.createObjectURL(file));
    setLoading(true);

    try {
      const blob = await compressImage(file);
      const form = new FormData();
      form.append("file", blob, file.name);
      // 서버가 분석 후 DB에 저장하고, 저장된 지출을 돌려준다
      const entry = await api.analyze(form);
      setExpenses((prev) => [entry, ...prev]);
      setResultId(entry.id);
      setDataVersion((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "분석에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  const removeExpense = async (id: string) => {
    await api.remove(id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    setDataVersion((v) => v + 1);
  };

  const updateExpense = async (id: string, data: ReceiptAnalysis) => {
    const updated = await api.update(id, data);
    setExpenses((prev) => prev.map((e) => (e.id === id ? updated : e)));
    setDataVersion((v) => v + 1);
  };

  const top = monthStats?.rows[0];

  return (
    <>
      {/* 이번 달 요약: 휴대폰에서도 3칸으로 한 줄 */}
      <section aria-label="이번 달 요약" className="grid grid-cols-3 gap-2 sm:gap-4">
        <StatCard label="이번 달 지출" value={monthStats && won(monthStats.total)} loading={!monthStats} />
        <StatCard
          label="이번 달 영수증"
          value={monthStats && `${monthStats.count}건`}
          loading={!monthStats}
        />
        <StatCard
          label="가장 많이 쓴 곳"
          value={top ? `${CATEGORY_STYLES[top.category].emoji} ${top.category}` : "—"}
          sub={top && won(top.amount)}
          loading={!monthStats}
        />
      </section>

      {/* 넓은 화면: 왼쪽 업로드·분석 결과 / 오른쪽 최근 지출 */}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6">
        <section className={cardClass}>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">영수증 올리기</h2>
          <div
            role="button"
            tabIndex={0}
            aria-label="영수증 사진 업로드"
            onClick={() => !loading && inputRef.current?.click()}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && !loading) {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (!loading) handleFile(e.dataTransfer.files[0]);
            }}
            className={`flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:min-h-56 lg:min-h-72 ${
              dragging
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
            } ${loading ? "cursor-wait" : ""}`}
          >
            {preview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                <img
                  src={preview}
                  alt="업로드한 영수증"
                  className={`max-h-64 rounded-lg object-contain shadow lg:max-h-80 ${loading ? "opacity-50" : ""}`}
                />
                {loading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <span className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                    <span className="rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-gray-700">
                      AI가 분석 중...
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-3xl">
                  🧾
                </div>
                <div>
                  <p className="font-medium text-gray-800">
                    <span className="hidden sm:inline">영수증 사진을 끌어다 놓거나 </span>
                    <span className="text-blue-600">
                      <span className="sm:hidden">눌러서 영수증 사진 선택</span>
                      <span className="hidden sm:inline">클릭해서 선택</span>
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-gray-500">JPG, PNG, WEBP, HEIC</p>
                </div>
              </>
            )}
            {preview && !loading && (
              <p className="text-sm text-gray-500">다른 영수증을 올리려면 누르거나 끌어다 놓으세요</p>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />

          {error && (
            <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {result && (
            <div className="mt-5 space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-100 pb-3">
                <div>
                  <p className="font-semibold text-gray-900">{result.store}</p>
                  <p className="text-xs text-gray-500">{result.date}</p>
                </div>
                <p className="text-xl font-bold tabular-nums text-gray-900">{won(result.total)}</p>
              </div>
              <ul className="divide-y divide-gray-100">
                {result.items.map((it, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="flex min-w-0 items-center gap-2">
                      <CategoryBadge category={it.category} />
                      <span className="truncate text-gray-800">{it.name}</span>
                      {it.quantity > 1 && <span className="text-gray-400">×{it.quantity}</span>}
                    </div>
                    <span className="shrink-0 tabular-nums text-gray-700">{won(it.price)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                {categoryTotals(result.items).map(({ category, amount }) => (
                  <span key={category} className="rounded-lg bg-gray-50 px-3 py-1.5 text-xs text-gray-600">
                    {CATEGORY_STYLES[category].emoji} {category}{" "}
                    <b className="tabular-nums text-gray-900">{won(amount)}</b>
                  </span>
                ))}
              </div>
              <p className="text-xs text-green-600">
                ✓ 지출 목록에 저장되었습니다. 잘못 인식된 내용은 목록의 &lsquo;수정&rsquo;에서 고칠 수 있어요.
              </p>
            </div>
          )}
        </section>

        <section className={cardClass}>
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-900">최근 지출</h2>
            {listState === "ready" && expenses.length > 0 && (
              <span className="text-xs text-gray-400">최근 {Math.min(expenses.length, 30)}건</span>
            )}
          </div>
          {notice && (
            <p className="mb-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">{notice}</p>
          )}
          {listState === "loading" ? (
            <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-1" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className="h-24 animate-pulse rounded-xl bg-gray-50" />
              ))}
            </ul>
          ) : listState === "error" ? (
            <div className="py-10 text-center text-sm text-gray-500">
              <p>지출 목록을 불러오지 못했어요.</p>
              <button
                type="button"
                onClick={() => {
                  setListState("loading");
                  setReloadKey((k) => k + 1);
                }}
                className="mt-2 rounded-lg border border-gray-200 px-3 py-1.5 text-gray-700 hover:bg-gray-50"
              >
                다시 시도
              </button>
            </div>
          ) : expenses.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">
              아직 기록된 지출이 없어요. 영수증을 올려보세요!
            </p>
          ) : (
            // 태블릿(한 열 화면)에서는 카드 2열, 노트북(오른쪽 칸)에서는 1열
            <ul className="grid items-start gap-3 md:grid-cols-2 lg:grid-cols-1">
              {expenses.slice(0, 30).map((e) => (
                <ExpenseCard key={e.id} expense={e} onSave={updateExpense} onDelete={removeExpense} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
