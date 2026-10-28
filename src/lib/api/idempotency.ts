import { createHash } from "node:crypto";
import { db } from "@/lib/db/client";
import { apiError } from "@/lib/api/errors";
import type { JsonValue } from "@/lib/db/types.generated";

function hashRequest(body: unknown): string {
  return createHash("sha256").update(JSON.stringify(body ?? null)).digest("hex");
}

/**
 * SSAD 3.5.1 Idempotency-Key 계약 + INV-5. idempotency_keys의 PK(user_id,key)가
 * 동시에 들어온 같은 키 요청 중 하나만 통과시키는 걸 그대로 활용한다(DB-23과 같은 보장).
 * 먼저 "처리 중" 행을 심어서 진짜 동시 요청의 패자가 그 행을 다시 읽게 한다.
 */
export async function withIdempotency<T>(
  userId: string,
  key: string | null,
  endpoint: string,
  requestBody: unknown,
  handler: () => Promise<{ status: number; body: T }>
): Promise<{ status: number; body: T }> {
  if (!key || key.length < 16 || key.length > 64) {
    throw apiError("E_PRECONDITION_REQUIRED", "Idempotency-Key가 필요해요(16~64자).");
  }
  const requestHash = hashRequest(requestBody);

  const existing = await db
    .selectFrom("idempotencyKeys")
    .selectAll()
    .where("userId", "=", userId)
    .where("key", "=", key)
    .executeTakeFirst();

  if (existing) {
    if (existing.requestHash !== requestHash) {
      throw apiError("E_IDEMPOTENCY_MISMATCH", "같은 키로 다른 요청이 왔어요.");
    }
    if (existing.responseStatus == null) {
      throw apiError("E_IDEMPOTENCY_IN_PROGRESS", "같은 요청을 처리하고 있어요. 잠시 후 다시 시도하세요.");
    }
    return { status: existing.responseStatus, body: existing.responseBody as T };
  }

  try {
    await db.insertInto("idempotencyKeys").values({ userId, key, endpoint, requestHash }).execute();
  } catch {
    // 거의 동시에 들어온 두 번째 요청: 방금 첫 번째가 심은 행을 다시 읽는다
    const row = await db
      .selectFrom("idempotencyKeys")
      .selectAll()
      .where("userId", "=", userId)
      .where("key", "=", key)
      .executeTakeFirst();
    if (row?.responseStatus != null) return { status: row.responseStatus, body: row.responseBody as T };
    throw apiError("E_IDEMPOTENCY_IN_PROGRESS", "같은 요청을 처리하고 있어요. 잠시 후 다시 시도하세요.");
  }

  const result = await handler();

  await db
    .updateTable("idempotencyKeys")
    .set({ responseStatus: result.status, responseBody: result.body as unknown as JsonValue })
    .where("userId", "=", userId)
    .where("key", "=", key)
    .execute();

  return result;
}
