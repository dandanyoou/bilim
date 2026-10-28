import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { requestRental } from "@/lib/rentals/commands";
import { withIdempotency } from "@/lib/api/idempotency";
import { errorResponse } from "@/lib/api/errors";

const Body = z.object({
  itemId: z.string().uuid(),
  start: z.string(),
  days: z.number().int().min(1).max(14),
});

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const json = await request.json();
    const body = Body.parse(json);
    const key = request.headers.get("idempotency-key");

    const result = await withIdempotency(session.userId, key, "POST /v1/rentals", json, async () => {
      const rental = await requestRental({
        renterId: session.userId,
        itemId: body.itemId,
        startIso: body.start,
        days: body.days,
      });
      return {
        status: 201,
        body: { rentalId: rental.id, status: rental.status, version: rental.version },
      };
    });

    return Response.json(result.body, { status: result.status });
  } catch (err) {
    return errorResponse(err);
  }
}
