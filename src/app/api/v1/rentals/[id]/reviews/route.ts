import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { writeReview } from "@/lib/rentals/commands";
import { withIdempotency } from "@/lib/api/idempotency";
import { errorResponse } from "@/lib/api/errors";

const Body = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().max(500).optional(),
});

export async function POST(request: Request, ctx: RouteContext<"/api/v1/rentals/[id]/reviews">) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const key = request.headers.get("idempotency-key");
    const json = await request.json();
    const parsed = Body.parse(json);

    const result = await withIdempotency(session.userId, key, `POST /v1/rentals/${id}/reviews`, json, async () => {
      const review = await writeReview(id, session.userId, parsed.rating, parsed.body ?? "");
      return { status: 201, body: { reviewId: review.id } };
    });

    return Response.json(result.body, { status: result.status });
  } catch (err) {
    return errorResponse(err);
  }
}
