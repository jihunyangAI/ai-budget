// Neon 연결 문자열(pooled)을 받아 .env.local 끝에 DATABASE_URL로 추가한다.
// 비밀값은 화면에 출력하지 않는다. 사용: npm run db:env
import { execSync } from "node:child_process";
import { appendFileSync } from "node:fs";

const PROJECT_ID = "bitter-brook-02318708"; // Neon project: ai-budget (aws-us-east-1)

const uri = execSync(`npx neonctl connection-string --project-id ${PROJECT_ID} --pooled`, {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "ignore"],
}).trim();

if (!uri.startsWith("postgres")) {
  console.error("연결 문자열을 가져오지 못했습니다. `npx neonctl auth`로 로그인했는지 확인하세요.");
  process.exit(1);
}

appendFileSync(".env.local", `\n# Neon Postgres (project: ai-budget, ${PROJECT_ID})\nDATABASE_URL=${uri}\n`);
console.log("DATABASE_URL을 .env.local에 추가했습니다.");
