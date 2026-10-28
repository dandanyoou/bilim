import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { createAndPublishItem } from "@/lib/items/commands";
import { errorResponse } from "@/lib/api/errors";

const Body = z.object({
  category: z.string(),
  title: z.string().min(2).max(80),
  description: z.string().max(2000).optional(),
  dailyFee: z.number().int(),
  deposit: z.number().int(),
  buyoutPrice: z.number().int(),
  pickupPlace: z.string().min(2).max(100),
  photoKeys: z.array(z.string()).min(1),
});

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = Body.parse(await request.json());
    const item = await createAndPublishItem({ ownerId: session.userId, ...body });
    return Response.json({ itemId: item.id, status: item.status }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
