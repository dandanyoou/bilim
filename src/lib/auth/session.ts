import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { ApiError } from "@/lib/api/errors";

const COOKIE_NAME = "bilim_session";
const SESSION_DAYS = 14;

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET is not set (or too short). Set it in .env.local.");
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  displayName: string;
  role: "member" | "moderator" | "admin";
}

/** 로그인 성공 시 서명된 세션 쿠키를 발급한다(SSAD 3.5.1: HttpOnly·SameSite=Lax, 14일). */
export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** 세션이 없거나 유효하지 않으면 null. 라우트는 이걸로 "로그인 안 돼 있어도 보이는 화면"을 분기한다. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.userId !== "string") return null;
    return {
      userId: payload.userId,
      displayName: payload.displayName as string,
      role: payload.role as SessionPayload["role"],
    };
  } catch {
    return null;
  }
}

/** 로그인 필수 라우트/서버 액션에서 사용. 없으면 401 E_AUTH_REQUIRED로 던진다. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new ApiError("E_AUTH_REQUIRED", "로그인이 필요합니다.");
  }
  return session;
}
