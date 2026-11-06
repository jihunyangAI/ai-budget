"use client";

import { useEffect, useState } from "react";
import { Pie, PieChart, Tooltip } from "recharts";
import CategoryBadge from "@/components/CategoryBadge";
import StatCard from "@/components/StatCard";
import { CATEGORY_STYLES, type Expense } from "@/lib/types";
import {
  api,
  categoryTotals,
  shiftMonth,
  thisMonth,
  toMonthKey,
  won,
  type MonthStats,
  type YearMonth,
} from "@/lib/expenses";

const cardClass = "rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6";

interface MonthData {
  month: string;
  stats: MonthStats;
  prev: MonthStats;
  expenses: Expense[];
}

/** 마운트 직후 0% → 목표값으로 차오르는 프로그레스바 */
function ProgressBar({ percent, color }: { percent: number; color: string }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(percent));
    return () => cancelAnimationFrame(id);
  }, [percent]);
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-gray-100"
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-1000 ease-out"
        style={{ width: `${width}%`, backgroundColor: color }}
      />
    </div>
  );
}

/** 하루 평균 계산에 쓸 일수: 이번 달은 오늘까지, 지난 달은 그 달 전체, 미래 달은 0 */
function elapsedDays(ym: YearMonth, today: Date) {
  const daysInMonth = new Date(ym.year, ym.month, 0).getDate();
  const cmp = ym.year * 12 + ym.month - (today.getFullYear() * 12 + today.getMonth() + 1);
  if (cmp < 0) return daysInMonth;
  if (cmp > 0) return 0;
  return today.getDate();
}

/** 지난달 대비 증감률. 지출이 늘면 빨강, 줄면 초록 */
function ChangeValue({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return <span className="text-gray-400">—</span>;
  const diff = current - previous;
  if (diff === 0) return <span className="text-gray-500">0%</span>;
  const pct = Math.abs((diff / previous) * 100).toFixed(1);
  return (
    <span className={diff > 0 ? "text-red-600" : "text-green-600"}>
      {diff > 0 ? "▲" : "▼"} {pct}%
    </span>
  );
}

export default function DashboardPage() {
  const [current, setCurrent] = useState<YearMonth | null>(null);
  const [data, setData] = useState<MonthData | null>(null);
  const [failedMonth, setFailedMonth] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 현재 날짜는 클라이언트에서만 결정
    setCurrent(thisMonth());
  }, []);

  const monthKey = current ? toMonthKey(current) : null;

  useEffect(() => {
    if (!current) return;
    const key = toMonthKey(current);
    let cancelled = false;
    Promise.all([api.stats(key), api.stats(toMonthKey(shiftMonth(current, -1))), api.list(key)])
      .then(([stats, prev, expenses]) => !cancelled && setData({ month: key, stats, prev, expenses }))
      .catch(() => !cancelled && setFailedMonth(key));
    return () => {
      cancelled = true;
    };
  }, [current]);

  // 선택한 달의 데이터가 도착하기 전에는 이전 달 데이터를 보여주지 않는다
  const loaded = data !== null && data.month === monthKey;
  const failed = failedMonth === monthKey && !loaded;
  const rows = loaded ? data.stats.rows : [];
  const total = loaded ? data.stats.total : 0;
  const days = current ? elapsedDays(current, new Date()) : 0;
  const chartData = rows.map((r) => ({
    name: r.category,
    value: r.amount,
    fill: CATEGORY_STYLES[r.category].color,
  }));

  return (
    <>
      {/* 제목 + 월 선택: 휴대폰은 위아래, 넓은 화면은 한 줄 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="hidden sm:block">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">지출 리포트</h1>
          <p className="text-sm text-gray-500">카테고리별로 어디에 얼마나 썼는지 한눈에 확인하세요</p>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-1.5 shadow-sm sm:gap-2">
          <button
            type="button"
            onClick={() => current && setCurrent(shiftMonth(current, -1))}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            aria-label="이전 달"
          >
            ◀
          </button>
          <h2
            className="min-w-32 text-center text-lg font-semibold tabular-nums text-gray-900"
            aria-live="polite"
          >
            {current ? `${current.year}년 ${current.month}월` : " "}
          </h2>
          <button
            type="button"
            onClick={() => current && setCurrent(shiftMonth(current, 1))}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            aria-label="다음 달"
          >
            ▶
          </button>
        </div>
      </div>

      {failed ? (
        <p className={`${cardClass} py-16 text-center text-sm text-red-600`}>통계를 불러오지 못했어요.</p>
      ) : (
        <>
          {/* 요약 숫자: 휴대폰 2×2, 넓은 화면 4칸 */}
          <section aria-label="월간 요약" className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
            <StatCard
              label={`${current?.month ?? ""}월 총 지출`}
              value={won(total)}
              loading={!loaded}
            />
            <StatCard
              label="지난달 대비"
              value={loaded && <ChangeValue current={total} previous={data.prev.total} />}
              sub={loaded && (data.prev.total > 0 ? `지난달 ${won(data.prev.total)}` : "지난달 기록 없음")}
              loading={!loaded}
            />
            <StatCard
              label="영수증"
              value={loaded ? `${data.stats.count}건` : null}
              sub={loaded && data.stats.count > 0 && `건당 평균 ${won(Math.round(total / data.stats.count))}`}
              loading={!loaded}
            />
            <StatCard
              label="하루 평균"
              value={days > 0 ? won(Math.round(total / days)) : "—"}
              sub={days > 0 && `${days}일 기준`}
              loading={!loaded}
            />
          </section>

          {/* 도넛 차트 + 카테고리별 금액: 넓은 화면에서 나란히 */}
          <div className="grid items-stretch gap-5 lg:grid-cols-12 lg:gap-6">
            <section className={`${cardClass} lg:col-span-5`}>
              <h2 className="text-lg font-semibold text-gray-900">카테고리별 비율</h2>
              {!loaded ? (
                <div className="mx-auto mt-6 aspect-square w-full max-w-72 animate-pulse rounded-full border-[28px] border-gray-100" />
              ) : rows.length === 0 ? (
                <p className="py-20 text-center text-sm text-gray-400">이 달에 기록된 지출이 없어요.</p>
              ) : (
                <div className="relative mx-auto mt-6 aspect-square w-full max-w-72 lg:max-w-80">
                  <PieChart key={monthKey} responsive style={{ width: "100%", height: "100%" }}>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="68%"
                      outerRadius="100%"
                      startAngle={90}
                      endAngle={-270}
                      paddingAngle={rows.length > 1 ? 2 : 0}
                      stroke="none"
                      isAnimationActive
                      animationBegin={0}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    />
                    <Tooltip
                      formatter={(value, name) => [won(Number(value)), name]}
                      contentStyle={{ borderRadius: 8, borderColor: "#e5e7eb", fontSize: 13 }}
                    />
                  </PieChart>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs text-gray-500">총 지출</span>
                    <span className="text-xl font-bold tabular-nums text-gray-900 sm:text-2xl">{won(total)}</span>
                  </div>
                </div>
              )}
            </section>

            <section className={`${cardClass} lg:col-span-7`}>
              <h2 className="mb-4 text-lg font-semibold text-gray-900">카테고리별 지출</h2>
              {!loaded ? (
                <ul className="flex flex-col gap-5" aria-hidden>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <li key={i} className="h-8 animate-pulse rounded bg-gray-50" />
                  ))}
                </ul>
              ) : rows.length === 0 ? (
                <p className="py-20 text-center text-sm text-gray-400">표시할 카테고리가 없어요.</p>
              ) : (
                <ul key={monthKey} className="flex flex-col gap-4">
                  {rows.map(({ category, amount }) => {
                    const style = CATEGORY_STYLES[category];
                    const percent = (amount / total) * 100;
                    return (
                      <li key={category} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="flex items-center gap-2 font-medium text-gray-800">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: style.color }}
                              aria-hidden
                            />
                            {style.emoji} {category}
                          </span>
                          <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                            <span className="font-semibold text-gray-900">{won(amount)}</span>
                            <span className="w-12 text-right text-xs text-gray-500">{percent.toFixed(1)}%</span>
                          </span>
                        </div>
                        <ProgressBar percent={percent} color={style.color} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          {/* 이 달의 지출 내역: 넓은 화면은 표, 휴대폰은 목록 */}
          <section className={cardClass}>
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold text-gray-900">
                {current ? `${current.month}월` : "이 달의"} 지출 내역
              </h2>
              {loaded && <span className="text-xs text-gray-400">{data.expenses.length}건</span>}
            </div>
            {!loaded ? (
              <div className="h-32 animate-pulse rounded-xl bg-gray-50" />
            ) : data.expenses.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-400">이 달에 기록된 지출이 없어요.</p>
            ) : (
              <>
                {/* 휴대폰 */}
                <ul className="divide-y divide-gray-100 md:hidden">
                  {data.expenses.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{e.store}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-gray-500">
                          {e.date.slice(5).replace("-", "/")}
                          {categoryTotals(e.items).map(({ category }) => (
                            <span key={category} aria-label={category} title={category}>
                              {CATEGORY_STYLES[category].emoji}
                            </span>
                          ))}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">
                        {won(e.total)}
                      </span>
                    </li>
                  ))}
                </ul>
                {/* 태블릿·노트북 */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                        <th className="py-2 pr-4 font-medium">날짜</th>
                        <th className="py-2 pr-4 font-medium">상호</th>
                        <th className="py-2 pr-4 font-medium">카테고리</th>
                        <th className="hidden py-2 pr-4 font-medium lg:table-cell">항목</th>
                        <th className="py-2 text-right font-medium">금액</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.expenses.map((e) => (
                        <tr key={e.id} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap py-2.5 pr-4 tabular-nums text-gray-500">{e.date}</td>
                          <td className="py-2.5 pr-4 font-medium text-gray-900">{e.store}</td>
                          <td className="py-2.5 pr-4">
                            <div className="flex flex-wrap gap-1">
                              {categoryTotals(e.items).map(({ category }) => (
                                <CategoryBadge key={category} category={category} />
                              ))}
                            </div>
                          </td>
                          <td className="hidden max-w-64 truncate py-2.5 pr-4 text-gray-500 lg:table-cell">
                            {e.items.map((it) => it.name).join(", ")}
                          </td>
                          <td className="whitespace-nowrap py-2.5 text-right font-semibold tabular-nums text-gray-900">
                            {won(e.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </>
  );
}
