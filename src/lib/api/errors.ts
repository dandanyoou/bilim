// SSAD 3.5.3 오류 코드 매핑을 한 곳에 모아 둔다.
// DB 트리거(rentals_guard 등)는 이미 메시지를 "E_TRANSITION: ..." 형태로 던지므로
// 그 접두사를 그대로 API 오류 코드로 재사용한다 — 같은 뜻을 두 번 쓰지 않는다.

const STATUS: Record<string, number> = {
  E_AUTH_REQUIRED: 401,
  E_FORBIDDEN: 403,
  E_NOT_FOUND: 404,
  E_VALIDATION: 400,
  E_EMAIL_DOMAIN: 400,
  E_CODE_INVALID: 400,
  E_CODE_LOCKED: 429,
  E_CATEGORY_DISABLED: 400,
  E_PHOTO_MIN: 400,
  E_SELF_RENTAL: 400,
  E_PERIOD_TAKEN: 409,
  E_INVALID_STATE: 409,
  E_STALE_VERSION: 409,
  E_PRECONDITION_REQUIRED: 428,
  E_IDEMPOTENCY_MISMATCH: 422,
  E_IDEMPOTENCY_IN_PROGRESS: 409,
  E_WINDOW_CLOSED: 409,
  E_SIGNATURE: 401,
  E_RATE_LIMITED: 429,
  E_INTERNAL: 500,
  // DB 트리거가 직접 던지는 코드(rentals_guard, check_photos_keep)
  E_TRANSITION: 409,
  E_DEPOSIT: 409,
  E_PAYMENT: 409,
  E_HANDOVER: 409,
  E_BUYOUT: 409,
  E_STATE: 400,
  E_RETENTION: 409,
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(code: keyof typeof STATUS | (string & {}), message?: string, details?: unknown) {
    super(message ?? code);
    this.code = code;
    this.status = STATUS[code] ?? 500;
    this.details = details;
  }
}

export function apiError(code: keyof typeof STATUS, message?: string, details?: unknown) {
  return new ApiError(code, message, details);
}

interface PgLikeError {
  code?: string;
  message?: string;
  constraint?: string;
}

interface ZodLikeError {
  name?: string;
  issues?: { path: (string | number)[]; message: string }[];
}

/** DB에서 올라온 에러를 ApiError로 변환한다. SSAD 3.3.1의 매핑표를 그대로 따른다. */
export function fromPgError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;

  const zod = err as ZodLikeError;
  if (zod?.name === "ZodError" && zod.issues) {
    return apiError("E_VALIDATION", "입력 값을 확인해 주세요.", {
      issues: zod.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    });
  }

  const pg = err as PgLikeError;

  if (pg?.code === "23P01") {
    return apiError("E_PERIOD_TAKEN", "그 기간에 이미 수락된 대여가 있습니다.");
  }
  if (pg?.code === "23514") {
    return apiError("E_VALIDATION", "입력 값이 조건을 벗어났습니다.", {
      constraint: pg.constraint,
    });
  }
  if (pg?.code === "P0001") {
    const prefix = /^E_[A-Z_]+/.exec(pg.message ?? "")?.[0];
    if (prefix && prefix in STATUS) {
      return new ApiError(prefix, pg.message);
    }
    return apiError("E_INVALID_STATE", pg.message ?? "지금 상태에서 할 수 없는 동작입니다.");
  }
  if (pg?.code === "23505") {
    return apiError("E_INVALID_STATE", "이미 처리된 요청입니다.", {
      constraint: pg.constraint,
    });
  }
  if (pg?.code === "23503") {
    return apiError("E_NOT_FOUND", "참조한 대상을 찾을 수 없습니다.");
  }

  console.error("unhandled error", err);
  return apiError("E_INTERNAL", "서버 오류가 발생했습니다.");
}

export function errorResponse(err: unknown): Response {
  const apiErr = fromPgError(err);
  return Response.json(
    {
      error: {
        code: apiErr.code,
        message: apiErr.message,
        details: apiErr.details ?? null,
      },
    },
    { status: apiErr.status }
  );
}
