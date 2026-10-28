import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { listMyRentals, type RentalListRow } from "@/lib/rentals/queries";
import { RentalStatusBadge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/dates";
import { formatWon } from "@/lib/money";

export default async function MyRentalsPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login?next=/rentals");

  const [asRenter, asOwner] = await Promise.all([
    listMyRentals(session.userId, "renter"),
    listMyRentals(session.userId, "owner"),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-bold text-ink">내 대여</h1>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-medium text-ink-soft">내가 빌리는 중</h2>
        <RentalList rows={asRenter} empty="아직 신청한 대여가 없어요." />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-ink-soft">내 물건을 빌려준 요청</h2>
        <RentalList rows={asOwner} empty="아직 받은 대여 요청이 없어요." />
      </section>
    </div>
  );
}

function RentalList({ rows, empty }: { rows: RentalListRow[]; empty: string }) {
  if (rows.length === 0) return <p className="text-sm text-ink-soft">{empty}</p>;
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.id}>
          <Link
            href={`/rentals/${r.id}`}
            className="flex items-center justify-between rounded-xl border border-line bg-white/60 px-4 py-3 hover:shadow-sm"
          >
            <div>
              <p className="font-medium text-ink">{r.itemTitle}</p>
              <p className="text-xs text-ink-soft">
                {r.counterpartName} · {formatDate(r.from)}~{formatDate(r.to)} · {formatWon(r.rentalFee)}
              </p>
            </div>
            <RentalStatusBadge status={r.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
