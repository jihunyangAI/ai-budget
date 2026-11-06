import type { ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  loading?: boolean;
}

/** 요약 숫자 카드. 휴대폰에서는 작게, 넓은 화면에서는 크게 보인다. */
export default function StatCard({ label, value, sub, loading }: Props) {
  return (
    <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-5">
      <p className="truncate text-xs text-gray-500 sm:text-sm">{label}</p>
      {loading ? (
        <div className="mt-2 h-6 w-20 animate-pulse rounded bg-gray-100 sm:h-8 sm:w-28" />
      ) : (
        <p className="mt-1 truncate text-base font-bold tabular-nums text-gray-900 sm:text-2xl">{value}</p>
      )}
      {sub && !loading && <div className="mt-0.5 truncate text-xs text-gray-500 sm:mt-1">{sub}</div>}
    </div>
  );
}
