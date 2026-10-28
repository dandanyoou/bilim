import { apiError } from "@/lib/api/errors";

/** SSAD 3.5.1 If-Match 계약. 상태 변경 명령에는 항상 필요하다. */
export function requireIfMatch(request: Request): number {
  const header = request.headers.get("if-match");
  if (!header) {
    throw apiError("E_PRECONDITION_REQUIRED", "If-Match 헤더가 필요해요.");
  }
  const version = Number(header);
  if (!Number.isInteger(version)) {
    throw apiError("E_VALIDATION", "If-Match 값이 올바르지 않아요.");
  }
  return version;
}
