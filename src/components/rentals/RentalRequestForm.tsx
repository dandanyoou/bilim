"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { calcBuyoutPrice, calcPlatformFee, calcRentalFee, formatWon } from "@/lib/money";

interface Props {
  itemId: string;
  dailyFee: number;
  deposit: number;
  /** 물품 등록 시 정한 기본 인수가. 실제 신청 금액은 대여일수에 따라 이보다 올라간다. */
  baseBuyoutPrice: number;
}

function todayPlus(days: number): string {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export function RentalRequestForm({ itemId, dailyFee, deposit, baseBuyoutPrice }: Props) {
  const router = useRouter();
  const [startDate, setStartDate] = useState(todayPlus(1));
  const [days, setDays] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const idempotencyKey = useRef(crypto.randomUUID());

  const rentalFee = useMemo(() => calcRentalFee(dailyFee, days), [dailyFee, days]);
  const platformFee = useMemo(() => calcPlatformFee(rentalFee), [rentalFee]);
  // 일수가 길수록 인수가도 올라간다(팀 결정, lib/money.ts의 calcBuyoutPrice 참고).
  const buyoutPrice = useMemo(
    () => calcBuyoutPrice(baseBuyoutPrice, dailyFee, days),
    [baseBuyoutPrice, dailyFee, days]
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/v1/rentals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey.current,
        },
        body: JSON.stringify({
          itemId,
          start: `${startDate}T10:00:00+09:00`,
          days,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message ?? "대여 신청에 실패했어요.");
      router.push(`/rentals/${body.rentalId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "대여 신청에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1.5 text-sm text-ink-soft">
          시작일
          <input
            type="date"
            required
            min={todayPlus(1)}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-line bg-cream px-3 py-2 text-sm text-ink outline-accent"
          />
        </label>
        <label className="block space-y-1.5 text-sm text-ink-soft">
          대여 일수(1~14일)
          <input
            type="number"
            required
            min={1}
            max={14}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="w-full rounded-lg border border-line bg-cream px-3 py-2 text-sm text-ink outline-accent"
          />
        </label>
      </div>

      <Card className="space-y-2 p-5 text-sm">
        <Row label={`대여료 (일 ${formatWon(dailyFee)} × ${days}일)`} value={formatWon(rentalFee)} />
        <Row label="플랫폼 수수료(대여료의 10%, 제안값)" value={formatWon(platformFee)} />
        <Row label="보증금 승인 보류" value={formatWon(deposit)} />
        <div className="border-t border-line pt-2">
          <Row label={`인수가(파손·분실 시, 기본 ${formatWon(baseBuyoutPrice)} + 대여일수만큼 가산)`} value={formatWon(buyoutPrice)} strong />
        </div>
      </Card>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "신청하는 중…" : "대여 신청하기"}
      </Button>
      <p className="text-center text-xs text-ink-soft">
        신청만으로는 결제되지 않아요. 빌려주는 사람이 수락하면 결제를 진행해요.
      </p>
    </form>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-soft">{label}</span>
      <span className={strong ? "font-semibold text-ink" : "text-ink"}>{value}</span>
    </div>
  );
}
