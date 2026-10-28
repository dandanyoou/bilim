// 테스트는 실행 중인 Next.js 서버(기본 http://localhost:3000, pnpm dev)에 실제 HTTP
// 요청을 보낸다. App Router의 route handler는 next/headers의 cookies()를 쓰는데,
// 이건 Next의 요청 컨텍스트 밖에서 직접 import해 호출하면 동작하지 않는다 — 그래서
// 라우트 함수를 직접 부르지 않고, DB 계약 시험과 같은 방식으로 "진짜 서버"에 대고 돈다.
// "BASE_URL"이 아니라 "TEST_BASE_URL"을 쓴다: Vite가 자기 base path 용도로
// process.env.BASE_URL을 "/"로 예약해 두고 있어서 이름이 겹치면 덮어써진다.
export const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@korea.ac.kr`;
}

export interface TestUser {
  email: string;
  userId: string;
  cookie: string;
}

export async function signUp(prefix: string, displayName: string): Promise<TestUser> {
  const email = uniqueEmail(prefix);
  const codeRes = await fetch(`${BASE_URL}/api/v1/auth/email-codes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!codeRes.ok) throw new Error(`email-codes failed: ${await codeRes.text()}`);
  const { devCode } = await codeRes.json();

  const sessionRes = await fetch(`${BASE_URL}/api/v1/auth/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code: devCode, displayName }),
  });
  if (!sessionRes.ok) throw new Error(`sessions failed: ${await sessionRes.text()}`);
  const setCookie = sessionRes.headers.get("set-cookie") ?? "";
  const cookie = setCookie.split(";")[0];
  const { userId } = await sessionRes.json();

  return { email, userId, cookie };
}

async function uploadFakePhoto(cookie: string): Promise<{ storageKey: string; sha256: string }> {
  // 1x1 PNG 픽셀 하나. 실제 내용은 중요하지 않고 ObjectStorage 계약만 만족하면 된다.
  const pngBytes = Uint8Array.from(
    atob(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
    ),
    (c) => c.charCodeAt(0)
  );
  const form = new FormData();
  form.append("file", new Blob([pngBytes], { type: "image/png" }), "test.png");
  const res = await fetch(`${BASE_URL}/api/v1/uploads`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: form,
  });
  if (!res.ok) throw new Error(`upload failed: ${await res.text()}`);
  return res.json();
}

export async function publishItem(
  owner: TestUser,
  overrides: Partial<{ dailyFee: number; deposit: number; buyoutPrice: number }> = {}
): Promise<string> {
  const photos = await Promise.all([1, 2, 3, 4].map(() => uploadFakePhoto(owner.cookie)));
  const res = await fetch(`${BASE_URL}/api/v1/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: owner.cookie },
    body: JSON.stringify({
      category: "electronics",
      title: `테스트 물품 ${Date.now()}`,
      dailyFee: overrides.dailyFee ?? 10000,
      deposit: overrides.deposit ?? 0,
      buyoutPrice: overrides.buyoutPrice ?? 100000,
      pickupPlace: "정문 앞",
      photoKeys: photos.map((p) => p.storageKey),
    }),
  });
  if (!res.ok) throw new Error(`item create failed: ${await res.text()}`);
  const body = await res.json();
  return body.itemId as string;
}

export async function requestRentalApi(
  renter: TestUser,
  itemId: string,
  start: string,
  days: number,
  idempotencyKey = crypto.randomUUID()
) {
  const res = await fetch(`${BASE_URL}/api/v1/rentals`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: renter.cookie, "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ itemId, start, days }),
  });
  return { status: res.status, body: await res.json() };
}

export async function acceptRentalApi(owner: TestUser, rentalId: string, ifMatch: number) {
  const res = await fetch(`${BASE_URL}/api/v1/rentals/${rentalId}/accept`, {
    method: "POST",
    headers: { Cookie: owner.cookie, "If-Match": String(ifMatch), "Idempotency-Key": crypto.randomUUID() },
  });
  return { status: res.status, body: await res.json() };
}
