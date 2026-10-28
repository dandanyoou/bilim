import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { confirmReturn } from "@/lib/rentals/commands";
import { requireIfMatch } from "@/lib/api/version";
import { withIdempotency } from "@/lib/api/idempotency";
import { errorResponse } from "@/lib/api/errors";

const Body = z.object({
  items: z.array(z.object({ name: z.string(), ok: z.boolean() })),
  photos: z.array(z.object({ storageKey: z.string(), sha256: z.string() })).min(4),
});

export async function POST(request: Request, ctx: RouteContext<"/api/v1/rentals/[id]/return">) {
  try {
    const session = await requireSession();
    const { id } = await ctx.params;
    const expectedVersion = requireIfMatch(request);
    const key = request.headers.get("idempotency-key");
    const json = await request.json();
    const body = Body.parse(json);

    const result = await withIdempotency(
      session.userId,
      key,
      `POST /v1/rentals/${id}/return`,
      { id, expectedVersion, json },
      async () => {
        const rental = await confirmReturn(id, session.userId, expectedVersion, {
          items: body.items.map((i) => `${i.name}:${i.ok}`),
          photos: body.photos,
        });
        return { status: 200, body: { status: rental.status, version: rental.version } };
      }
    );

    return Response.json(result.body, { status: result.status });
  } catch (err) {
    return errorResponse(err);
  }
}
