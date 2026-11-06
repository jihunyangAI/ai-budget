import { neon } from "@neondatabase/serverless";
import type { Category, Expense, ReceiptAnalysis } from "./types";

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL이 설정되지 않았습니다. .env.local을 확인하세요.");
  return neon(url);
}

// date는 문자열, created_at은 epoch ms로 받아 타임존 변환 문제를 피한다.
type Row = {
  id: string;
  store: string;
  date: string;
  total: number;
  items: Expense["items"];
  createdAt: number;
};

const toExpense = (r: Row): Expense => ({ ...r, createdAt: Number(r.createdAt) });

/** month('YYYY-MM')를 주면 그 달의 지출을 날짜 내림차순으로, 없으면 최근 입력 순으로 반환 */
export async function listExpenses({ limit = 50, month }: { limit?: number; month?: string } = {}): Promise<
  Expense[]
> {
  const sql = getSql();
  const rows = (
    month
      ? await sql`
          SELECT id, store, to_char(date, 'YYYY-MM-DD') AS date, total, items,
                 (extract(epoch FROM created_at) * 1000)::float8 AS "createdAt"
          FROM expenses
          WHERE date >= ${`${month}-01`}::date AND date < (${`${month}-01`}::date + interval '1 month')
          ORDER BY date DESC, created_at DESC
          LIMIT ${limit}
        `
      : await sql`
          SELECT id, store, to_char(date, 'YYYY-MM-DD') AS date, total, items,
                 (extract(epoch FROM created_at) * 1000)::float8 AS "createdAt"
          FROM expenses
          ORDER BY created_at DESC
          LIMIT ${limit}
        `
  ) as Row[];
  return rows.map(toExpense);
}

/** 해당 월의 영수증 건수 */
export async function monthlyReceiptCount(month: string): Promise<number> {
  const sql = getSql();
  const start = `${month}-01`;
  const [{ count }] = (await sql`
    SELECT count(*)::int AS count FROM expenses
    WHERE date >= ${start}::date AND date < (${start}::date + interval '1 month')
  `) as { count: number }[];
  return count;
}

export async function createExpense(data: ReceiptAnalysis): Promise<Expense> {
  const sql = getSql();
  const [row] = (await sql`
    INSERT INTO expenses (store, date, total, items)
    VALUES (${data.store}, ${data.date}, ${data.total}, ${JSON.stringify(data.items)}::jsonb)
    RETURNING id, store, to_char(date, 'YYYY-MM-DD') AS date, total, items,
              (extract(epoch FROM created_at) * 1000)::float8 AS "createdAt"
  `) as Row[];
  return toExpense(row);
}

export async function updateExpense(id: string, data: ReceiptAnalysis): Promise<Expense | null> {
  const sql = getSql();
  const [row] = (await sql`
    UPDATE expenses
    SET store = ${data.store}, date = ${data.date}, total = ${data.total},
        items = ${JSON.stringify(data.items)}::jsonb
    WHERE id = ${id}
    RETURNING id, store, to_char(date, 'YYYY-MM-DD') AS date, total, items,
              (extract(epoch FROM created_at) * 1000)::float8 AS "createdAt"
  `) as Row[];
  return row ? toExpense(row) : null;
}

export async function deleteExpense(id: string): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`DELETE FROM expenses WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

/** month: 'YYYY-MM'. 해당 월의 카테고리별 항목 금액 합계 (금액 큰 순) */
export async function monthlyCategoryTotals(
  month: string,
): Promise<{ category: Category; amount: number }[]> {
  const sql = getSql();
  const start = `${month}-01`;
  const rows = (await sql`
    SELECT item->>'category' AS category, sum((item->>'price')::int)::int AS amount
    FROM expenses, jsonb_array_elements(items) AS item
    WHERE date >= ${start}::date AND date < (${start}::date + interval '1 month')
    GROUP BY 1
    HAVING sum((item->>'price')::int) > 0
    ORDER BY amount DESC
  `) as { category: Category; amount: number }[];
  return rows;
}
