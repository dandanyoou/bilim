"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RentalDetail } from "@/lib/rentals/queries";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PhotoPicker, type ReadyPhoto } from "@/components/uploads/PhotoPicker";

const CHECKLIST_ITEMS = ["외관 상태", "작동 여부", "구성품(충전기·케이스 등)"];

async function callAction(
  path: string,
  version: number | null,
  body?: unknown
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (version !== null) headers["If-Match"] = String(version);
  headers["Idempotency-Key"] = crypto.randomUUID();

  const res = await fetch(path, {
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

export function RentalActionPanel({ rental }: { rental: RentalDetail }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(path: string, body?: unknown) {
    setBusy(true);
    setError(null);
    const { ok, data } = await callAction(path, rental.version, body);
    setBusy(false);
    if (!ok) {
      setError((data.error as { message?: string })?.message ?? "처리에 실패했어요.");
      return;
    }
    router.refresh();
  }

  const { status, viewerRole } = rental;
  const iAmOwner = viewerRole === "owner";
  const iAmRenter = viewerRole === "renter";
  const iHaveConfirmedHandover = viewerRole ? rental.handoverPartiesConfirmed.includes(viewerRole) : false;

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-danger">{error}</p>}

      {status === "REQUESTED" && iAmOwner && (
        <div className="flex gap-3">
          <Button disabled={busy} onClick={() => run(`/api/v1/rentals/${rental.id}/accept`)}>
            수락하기
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => run(`/api/v1/rentals/${rental.id}/decline`)}>
            거절하기
          </Button>
        </div>
      )}

      {status === "ACCEPTED" && iAmRenter && (
        <Button disabled={busy} onClick={() => run(`/api/v1/rentals/${rental.id}/payments`)} className="w-full">
          {busy ? "결제 처리 중…" : `결제하기 (모의 결제, ${rental.rentalFee.toLocaleString()}원)`}
        </Button>
      )}

      {(status === "REQUESTED" || status === "ACCEPTED" || status === "PAID") && (iAmOwner || iAmRenter) && (
        <button
          type="button"
          disabled={busy}
          onClick={() => run(`/api/v1/rentals/${rental.id}/cancel`)}
          className="text-sm text-ink-soft underline hover:text-danger"
        >
          대여 취소하기
        </button>
      )}

      {status === "PAID" && !iHaveConfirmedHandover && (iAmOwner || iAmRenter) && (
        <ChecklistCard
          title="인계 확인"
          description="물건을 주고받을 때 상태를 사진으로 남겨 두세요."
          busy={busy}
          onSubmit={(photos) => run(`/api/v1/rentals/${rental.id}/handover`, { items: checklistPayload(), photos })}
        />
      )}
      {status === "PAID" && iHaveConfirmedHandover && (
        <p className="text-sm text-ink-soft">인계를 확인했어요. 상대방 확인을 기다리는 중이에요.</p>
      )}

      {(status === "IN_USE" || status === "OVERDUE") && iAmOwner && (
        <ChecklistCard
          title="반납 확인"
          description="물건을 돌려받았으면 상태를 사진으로 남겨 두세요."
          busy={busy}
          onSubmit={(photos) => run(`/api/v1/rentals/${rental.id}/return`, { items: checklistPayload(), photos })}
        />
      )}

      {status === "RETURNED" && (iAmOwner || iAmRenter) && (
        <Card className="space-y-2 p-4 text-sm">
          <p className="text-ink-soft">
            반납이 확인됐어요. 실제 서비스라면 24시간 이의 제기 기간 뒤 자동으로 종료·정산돼요.
          </p>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => run(`/api/v1/rentals/${rental.id}/dev-close`)}
          >
            (개발용) 이의기간 종료 처리
          </Button>
        </Card>
      )}

      {(status === "CLOSED" || status === "BOUGHT_OUT") && (iAmOwner || iAmRenter) && !rental.viewerHasReviewed && (
        <ReviewForm busy={busy} onSubmit={(rating, body) => run(`/api/v1/rentals/${rental.id}/reviews`, { rating, body })} />
      )}
      {(status === "CLOSED" || status === "BOUGHT_OUT") && rental.viewerHasReviewed && (
        <p className="text-sm text-ink-soft">후기를 남겼어요. 고마워요!</p>
      )}
    </div>
  );
}

function checklistPayload() {
  return CHECKLIST_ITEMS.map((name) => ({ name, ok: true }));
}

function ChecklistCard({
  title,
  description,
  busy,
  onSubmit,
}: {
  title: string;
  description: string;
  busy: boolean;
  onSubmit: (photos: ReadyPhoto[]) => void;
}) {
  const [photos, setPhotos] = useState<ReadyPhoto[]>([]);

  return (
    <Card className="space-y-3 p-5">
      <div>
        <h3 className="font-medium text-ink">{title}</h3>
        <p className="text-sm text-ink-soft">{description}</p>
      </div>
      <ul className="list-inside list-disc text-sm text-ink-soft">
        {CHECKLIST_ITEMS.map((item) => (
          <li key={item}>{item} 확인함</li>
        ))}
      </ul>
      <PhotoPicker onReadyChange={setPhotos} minCount={4} />
      <Button disabled={busy || photos.length < 4} onClick={() => onSubmit(photos)} className="w-full">
        {busy ? "확인하는 중…" : "확인했어요"}
      </Button>
    </Card>
  );
}

function ReviewForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (rating: number, body: string) => void;
}) {
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");

  return (
    <Card className="space-y-3 p-5">
      <h3 className="font-medium text-ink">후기 남기기</h3>
      <label className="block text-sm text-ink-soft">
        평점
        <select
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="ml-2 rounded-lg border border-line bg-cream px-2 py-1 text-sm text-ink"
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {"★".repeat(n)}
            </option>
          ))}
        </select>
      </label>
      <textarea
        maxLength={500}
        rows={3}
        placeholder="거래 후기를 남겨 주세요(선택)"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="w-full rounded-lg border border-line bg-cream px-3 py-2 text-sm text-ink outline-accent"
      />
      <Button disabled={busy} onClick={() => onSubmit(rating, body)} className="w-full">
        후기 남기기
      </Button>
    </Card>
  );
}
