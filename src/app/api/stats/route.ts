import type { NextRequest } from "next/server";
import { getRequestSession, unauthorized } from "@/lib/auth";
import { monthlyCategoryTotals, monthlyReceiptCount } from "@/lib/db";
import { isMonthKey } from "@/lib/validate";

/** GET /api/stats?month=YYYY-MM → 카테고리별 지출 합계(금액 큰 순), 총액, 영수증 건수 */
export async function GET(request: NextRequest) {
  if (!(await getRequestSession(request))) return unauthorized();
  const month = request.nextUrl.searchParams.get("month");
  if (!isMonthKey(month)) {
    return Response.json({ error: "month는 YYYY-MM 형식이어야 합니다." }, { status: 400 });
  }
  try {
    const [rows, count] = await Promise.all([monthlyCategoryTotals(month), monthlyReceiptCount(month)]);
    const total = rows.reduce((s, r) => s + r.amount, 0);
    return Response.json({ month, total, count, rows });
  } catch (err) {
    console.error("[stats] error:", err);
    return Response.json({ error: "통계를 불러오지 못했습니다." }, { status: 500 });
  }
}
