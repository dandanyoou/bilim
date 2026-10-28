type Tone = "neutral" | "accent" | "ok" | "danger";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-cream-soft text-ink-soft",
  accent: "bg-accent-soft text-accent",
  ok: "bg-ok-soft text-ok",
  danger: "bg-danger-soft text-danger",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${TONE_CLASS[tone]}`}>
      {children}
    </span>
  );
}

// SSAD 2.5.2(대여 상태 전이도)의 13개 상태 → 화면 표시용 한글 라벨/톤.
export const RENTAL_STATUS: Record<string, { label: string; tone: Tone }> = {
  REQUESTED: { label: "요청됨", tone: "neutral" },
  ACCEPTED: { label: "수락됨", tone: "accent" },
  DECLINED: { label: "거절됨", tone: "danger" },
  EXPIRED: { label: "만료됨", tone: "neutral" },
  PAID: { label: "결제완료", tone: "accent" },
  CANCELED: { label: "취소됨", tone: "neutral" },
  IN_USE: { label: "사용중", tone: "ok" },
  OVERDUE: { label: "연체", tone: "danger" },
  RETURNED: { label: "반납됨", tone: "ok" },
  DISPUTED: { label: "분쟁중", tone: "danger" },
  BUYOUT_PENDING: { label: "인수 대기", tone: "danger" },
  CLOSED: { label: "종료", tone: "neutral" },
  BOUGHT_OUT: { label: "인수 완료", tone: "neutral" },
};

export function RentalStatusBadge({ status }: { status: string }) {
  const meta = RENTAL_STATUS[status] ?? { label: status, tone: "neutral" as Tone };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

// items.status(4종) → 화면 표시용.
export const ITEM_STATUS: Record<string, { label: string; tone: Tone }> = {
  draft: { label: "임시저장", tone: "neutral" },
  listed: { label: "대여 가능", tone: "ok" },
  paused: { label: "일시중지", tone: "neutral" },
  removed: { label: "내려짐", tone: "neutral" },
  transferred: { label: "인수 완료", tone: "neutral" },
};

export function ItemStatusBadge({ status }: { status: string }) {
  const meta = ITEM_STATUS[status] ?? { label: status, tone: "neutral" as Tone };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
