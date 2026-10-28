import { requireSession } from "@/lib/auth/session";
import { getRentalDetail } from "@/lib/rentals/queries";
import { apiError, errorResponse } from "@/lib/api/errors";

export async function GET(_request: Request, ctx: RouteContext<"/api/v1/rentals/[id]">) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const rental = await getRentalDetail(id, session.userId);
    if (!rental) throw apiError("E_NOT_FOUND", "대여를 찾을 수 없어요.");
    return Response.json(rental);
  } catch (err) {
    return errorResponse(err);
  }
}
