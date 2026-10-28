import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getRentalDetail } from "@/lib/rentals/queries";
import { RentalStatusBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatDateTime } from "@/lib/dates";
import { formatWon } from "@/lib/money";
import { RentalActionPanel } from "@/components/rentals/RentalActionPanel";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RentalDetailPage({ params }: PageProps) {
  const session = await getSession();
  const { id } = await params;
  if (!session) redirect(`/auth/login?next=/rentals/${id}`);

  const rental = await getRentalDetail(id, session.userId);
  if (!rental) notFound();

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">{rental.itemTitle}</h1>
        <RentalStatusBadge status={rental.status} />
      </div>

      <Card className="mb-6 space-y-2 p-5 text-sm">
        <Row label="빌려주는 사람" value={rental.ownerName} />
        <Row label="빌리는 사람" value={rental.renterName} />
        <Row label="기간" value={`${formatDateTime(rental.from)} ~ ${formatDateTime(rental.to)}`} />
        <Row label="대여료" value={formatWon(rental.rentalFee)} />
        <Row label="플랫폼 수수료" value={formatWon(rental.platformFee)} />
        <Row label="보증금" value={formatWon(rental.depositSnapshot)} />
        <Row label="인수가" value={formatWon(rental.buyoutPriceSnapshot)} />
      </Card>

      <RentalActionPanel rental={rental} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-soft">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}
