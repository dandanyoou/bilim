import { Pool } from "pg";
import { Kysely, PostgresDialect, CamelCasePlugin } from "kysely";
import type { DB } from "./types.generated";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
}

// Next.js dev reloads modules on every edit; cache the pool on globalThis so
// we don't exhaust Postgres connections by creating a new pool per reload.
const globalForDb = globalThis as unknown as { pgPool?: Pool };

const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgPool = pool;
}

export const db = new Kysely<DB>({
  dialect: new PostgresDialect({ pool }),
  // types.generated.ts가 --camel-case로 생성되므로, 쿼리 빌더의 camelCase 프로퍼티를
  // 실제 snake_case 컬럼명으로 왕복 변환해주는 플러그인이 꼭 있어야 한다.
  plugins: [new CamelCasePlugin()],
});
