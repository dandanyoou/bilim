import { createHash, randomInt } from "node:crypto";
import { db } from "@/lib/db/client";
import { apiError } from "@/lib/api/errors";

// SSAD 3.9 설정값: allowed_email_domains(제안값). 바뀌면 여기 한 곳만 고치면 된다.
const ALLOWED_DOMAIN = "korea.ac.kr";
const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_HOUR = 5;

export function assertSchoolEmail(emailRaw: string): string {
  const email = emailRaw.trim().toLowerCase();
  if (!email.includes("@") || !email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    throw apiError("E_EMAIL_DOMAIN", `${ALLOWED_DOMAIN} 이메일만 가입할 수 있어요.`);
  }
  return email;
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * AC-01-1/SEC-08: 코드는 해시로만 저장하고, 이메일당 시간당 5회까지만 발송한다.
 * 개발 모드에선 메일을 실제로 보내지 않고 응답에 코드를 그대로 담아 돌려준다.
 */
export async function issueEmailCode(emailRaw: string): Promise<{ expiresInSec: number; devCode?: string }> {
  const email = assertSchoolEmail(emailRaw);

  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await db
    .selectFrom("emailCodes")
    .select((eb) => eb.fn.countAll().as("count"))
    .where("email", "=", email)
    .where("createdAt", ">=", since)
    .executeTakeFirstOrThrow();
  if (Number(recent.count) >= MAX_SENDS_PER_HOUR) {
    throw apiError("E_RATE_LIMITED", "인증 코드를 너무 많이 요청했어요. 잠시 후 다시 시도하세요.");
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);
  await db
    .insertInto("emailCodes")
    .values({ email, codeHash: hashCode(code), expiresAt })
    .execute();

  const devCode = process.env.NODE_ENV !== "production" ? code : undefined;
  return { expiresInSec: CODE_TTL_MINUTES * 60, devCode };
}

/** AC-01-2: 5회 틀리면 그 코드는 잠긴다. 맞으면 소비 처리해 재사용을 막는다. */
export async function verifyEmailCode(emailRaw: string, code: string): Promise<void> {
  const email = assertSchoolEmail(emailRaw);

  const row = await db
    .selectFrom("emailCodes")
    .selectAll()
    .where("email", "=", email)
    .where("consumedAt", "is", null)
    .orderBy("createdAt", "desc")
    .executeTakeFirst();

  if (!row || row.expiresAt < new Date()) {
    throw apiError("E_CODE_INVALID", "인증 코드가 틀렸거나 만료되었어요.");
  }
  if (row.lockedAt || row.attempts >= MAX_ATTEMPTS) {
    throw apiError("E_CODE_LOCKED", "인증 코드를 5번 틀려 잠겼어요. 새 코드를 요청하세요.");
  }

  if (hashCode(code) !== row.codeHash) {
    const attempts = row.attempts + 1;
    const lockedNow = attempts >= MAX_ATTEMPTS;
    await db
      .updateTable("emailCodes")
      .set({ attempts, lockedAt: lockedNow ? new Date() : null })
      .where("id", "=", row.id)
      .execute();
    throw apiError(lockedNow ? "E_CODE_LOCKED" : "E_CODE_INVALID", "인증 코드가 틀렸어요.");
  }

  await db.updateTable("emailCodes").set({ consumedAt: new Date() }).where("id", "=", row.id).execute();
}
