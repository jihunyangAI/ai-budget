import { getRequestSession, unauthorized } from "@/lib/auth";
import { createExpense, listExpenses } from "@/lib/db";
import { isMonthKey, normalizeExpense } from "@/lib/validate";

/** GET /api/expenses → 최근 입력 50건, ?month=YYYY-MM → 그 달의 지출(최대 300건) */
export async function GET(request: Request) {
  if (!(await getRequestSession(request))) return unauthorized();
  const month = new URL(request.url).searchParams.get("month");
  if (month !== null && !isMonthKey(month)) {
    return Response.json({ error: "month는 YYYY-MM 형식이어야 합니다." }, { status: 400 });
  }
  try {
    return Response.json(await listExpenses(month ? { month, limit: 300 } : {}));
  } catch (err) {
    console.error("[expenses] list error:", err);
    return Response.json({ error: "지출 목록을 불러오지 못했습니다." }, { status: 500 });
  }
}

/** 직접 입력 또는 기존 브라우저(localStorage) 데이터 이전용 */
export async function POST(request: Request) {
  if (!(await getRequestSession(request))) return unauthorized();
  const data = normalizeExpense(await request.json().catch(() => null));
  if (!data) return Response.json({ error: "지출 데이터가 올바르지 않습니다." }, { status: 400 });
  try {
    return Response.json(await createExpense(data), { status: 201 });
  } catch (err) {
    console.error("[expenses] create error:", err);
    return Response.json({ error: "저장하지 못했습니다." }, { status: 500 });
  }
}
