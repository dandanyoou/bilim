// SHORTCUT: JOB-03(이의기간 종료→정산) 스케줄러가 없는 Phase A의 임시 수동 트리거.
// Phase B에서 실제 cron이 이 자리의 devCloseAndSettle 호출을 대신하게 된다.
import { requireSession } from "@/lib/auth/session";
import { devCloseAndSettle } from "@/lib/rentals/commands";
import { errorResponse } from "@/lib/api/errors";

export async function POST(_request: Request, ctx: RouteContext<"/api/v1/rentals/[id]/dev-close">) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const rental = await devCloseAndSettle(id, session.userId);
    return Response.json({ status: rental.status });
  } catch (err) {
    return errorResponse(err);
  }
}
