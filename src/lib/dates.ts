// rentals.period는 Postgres tstzrange라 Kysely가 네이티브로 타입화하지 못한다(문자열로 들어온다).
// 여기서 그 변환을 전담한다 — 다른 곳에서 직접 파싱하지 않는다.

const KST = "Asia/Seoul";

export function formatDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: KST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function formatDateTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: KST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/** Postgres tstzrange 텍스트 표현("[2026-11-10 10:00:00+09,2026-11-12 10:00:00+09)")을 파싱한다. */
export function parseTstzRange(raw: string): { from: string; to: string } {
  const inner = raw.slice(1, -1); // 앞뒤 [ ) 제거
  const [from, to] = inner.split(",").map((s) => s.replace(/^"|"$/g, ""));
  return { from, to };
}
