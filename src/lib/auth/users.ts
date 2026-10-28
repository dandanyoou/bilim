import { db } from "@/lib/db/client";
import { apiError } from "@/lib/api/errors";

/**
 * 코드 검증 전에 먼저 호출한다. 처음 오는 이메일인데 표시 이름이 없으면 코드를
 * 소비하기 전에 막아야 한다 — 안 그러면 "이름을 안 적어서 실패했는데 코드는
 * 이미 써버려서 다시 받아야 하는" 상황이 생긴다.
 */
export async function userExists(email: string): Promise<boolean> {
  const row = await db.selectFrom("users").select("id").where("schoolEmail", "=", email).executeTakeFirst();
  return !!row;
}

/** 코드 인증을 마친 뒤 호출한다. 기존 회원이면 조회, 처음이면 가입(displayName 필수). */
export async function findOrCreateUser(email: string, displayName?: string) {
  const existing = await db.selectFrom("users").selectAll().where("schoolEmail", "=", email).executeTakeFirst();
  if (existing) {
    if (!existing.schoolVerifiedAt) {
      await db.updateTable("users").set({ schoolVerifiedAt: new Date() }).where("id", "=", existing.id).execute();
    }
    return existing;
  }

  const name = displayName?.trim();
  if (!name || name.length < 2 || name.length > 20) {
    throw apiError("E_VALIDATION", "표시 이름을 2~20자로 입력하세요.");
  }

  return db
    .insertInto("users")
    .values({ schoolEmail: email, displayName: name, schoolVerifiedAt: new Date() })
    .returningAll()
    .executeTakeFirstOrThrow();
}
