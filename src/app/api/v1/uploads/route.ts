import { requireSession } from "@/lib/auth/session";
import { saveUpload } from "@/lib/adapters/objectStorage";
import { apiError, errorResponse } from "@/lib/api/errors";

export async function POST(request: Request) {
  try {
    await requireSession();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw apiError("E_VALIDATION", "file 필드가 필요해요.");
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const saved = await saveUpload(bytes, file.type);
    return Response.json(saved, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
