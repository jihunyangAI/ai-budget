// expenses 테이블 생성. 사용: npm run db:migrate
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL이 없습니다. 먼저 npm run db:env를 실행하세요.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS expenses (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    store       text        NOT NULL,
    date        date        NOT NULL,
    total       integer     NOT NULL,
    items       jsonb       NOT NULL DEFAULT '[]'::jsonb,
    created_at  timestamptz NOT NULL DEFAULT now()
  )
`;
await sql`CREATE INDEX IF NOT EXISTS expenses_date_idx ON expenses (date)`;
await sql`CREATE INDEX IF NOT EXISTS expenses_created_at_idx ON expenses (created_at DESC)`;

const [{ count }] = await sql`SELECT count(*)::int AS count FROM expenses`;
console.log(`마이그레이션 완료: expenses 테이블 준비됨 (현재 ${count}건)`);
