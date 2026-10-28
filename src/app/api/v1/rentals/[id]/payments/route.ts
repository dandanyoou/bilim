import { requireSession } from "@/lib/auth/session";
import { payRental } from "@/lib/rentals/commands";
import { requireIfMatch } from "@/lib/api/version";
import { withIdempotency } from "@/lib/api/idempotency";
import { errorResponse } from "@/lib/api/errors";

export async function POST(request: Request, ctx: RouteContext<"/api/v1/rentals/[id]/payments">) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const expectedVersion = requireIfMatch(request);
    const key = request.headers.get("idempotency-key");

    const result = await withIdempotency(
      session.userId,
      key,
      `POST /v1/rentals/${id}/payments`,
      { id, expectedVersion },
      async () => {
        const rental = await payRental(id, session.userId, expectedVersion);
        return { status: 201, body: { status: rental.status, version: rental.version } };
      }
    );

    return Response.json(result.body, { status: result.status });
  } catch (err) {
    return errorResponse(err);
  }
}
