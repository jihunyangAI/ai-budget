import { getRequestSession, unauthorized } from "@/lib/auth";
import { deleteExpense, updateExpense } from "@/lib/db";
import { isUuid, normalizeExpense } from "@/lib/validate";

export async function PUT(request: Request, ctx: RouteContext<"/api/expenses/[id]">) {
  if (!(await getRequestSession(request))) return unauthorized();
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "잘못된 id입니다." }, { status: 400 });

  // 수정 후 합계는 항목 금액의 합으로 다시 계산
  const data = normalizeExpense(await request.json().catch(() => null), { useItemSumAsTotal: true });
  if (!data) return Response.json({ error: "수정할 내용이 올바르지 않습니다." }, { status: 400 });

  try {
    const updated = await updateExpense(id, data);
    if (!updated) return Response.json({ error: "지출을 찾을 수 없습니다." }, { status: 404 });
    return Response.json(updated);
  } catch (err) {
    console.error("[expenses] update error:", err);
    return Response.json({ error: "저장하지 못했습니다." }, { status: 500 });
  }
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/expenses/[id]">) {
  if (!(await getRequestSession(request))) return unauthorized();
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "잘못된 id입니다." }, { status: 400 });
  try {
    const ok = await deleteExpense(id);
    if (!ok) return Response.json({ error: "지출을 찾을 수 없습니다." }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[expenses] delete error:", err);
    return Response.json({ error: "삭제하지 못했습니다." }, { status: 500 });
  }
}
