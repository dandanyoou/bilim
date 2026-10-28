import { z } from "zod";
import { assertSchoolEmail, verifyEmailCode } from "@/lib/auth/emailCode";
import { apiError } from "@/lib/api/errors";
import { findOrCreateUser, userExists } from "@/lib/auth/users";
import { createSession } from "@/lib/auth/session";
import { errorResponse } from "@/lib/api/errors";
import type { SessionPayload } from "@/lib/auth/session";

const Body = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  displayName: z.string().min(2).max(20).optional(),
});

export async function POST(request: Request) {
  try {
    const body = Body.parse(await request.json());
    const email = assertSchoolEmail(body.email);

    // 코드를 "소비"하기 전에 먼저 확인한다: 처음 오는 이메일인데 표시 이름이
    // 없으면 여기서 멈춰야 한다. 안 그러면 코드만 날리고 다시 받아야 한다.
    if (!(await userExists(email)) && !body.displayName) {
      throw apiError("E_VALIDATION", "표시 이름을 2~20자로 입력하세요.");
    }

    await verifyEmailCode(email, body.code);
    const user = await findOrCreateUser(email, body.displayName);
    await createSession({
      userId: user.id,
      displayName: user.displayName,
      role: user.role as SessionPayload["role"],
    });

    return Response.json({ userId: user.id, displayName: user.displayName }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
