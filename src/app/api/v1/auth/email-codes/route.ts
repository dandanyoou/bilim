import { z } from "zod";
import { issueEmailCode } from "@/lib/auth/emailCode";
import { errorResponse } from "@/lib/api/errors";

const Body = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  try {
    const body = Body.parse(await request.json());
    const result = await issueEmailCode(body.email);
    return Response.json(result, { status: 202 });
  } catch (err) {
    return errorResponse(err);
  }
}
