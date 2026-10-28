import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getItemDetail } from "@/lib/items/queries";
import { RentalRequestForm } from "@/components/rentals/RentalRequestForm";
import { CATEGORY_LABEL, type Category } from "@/lib/categories";

interface PageProps {
  searchParams: Promise<{ itemId?: string }>;
}

export default async function NewRentalPage({ searchParams }: PageProps) {
  const session = await getSession();
  const { itemId } = await searchParams;
  if (!itemId) notFound();
  if (!session) redirect(`/auth/login?next=/rentals/new?itemId=${itemId}`);

  const item = await getItemDetail(itemId);
  if (!item || item.status !== "listed") notFound();
  if (item.ownerId === session.userId) redirect(`/items/${itemId}`);

  return (
    <div className="mx-auto max-w-lg px-6 py-10">
      <h1 className="mb-2 text-2xl font-bold text-ink">대여 신청</h1>
      <p className="mb-6 text-sm text-ink-soft">
        <span className="text-accent">{CATEGORY_LABEL[item.category as Category] ?? item.category}</span> ·{" "}
        {item.title}
      </p>
      <RentalRequestForm
        itemId={item.id}
        dailyFee={item.dailyFee}
        deposit={item.deposit}
        buyoutPrice={item.buyoutPrice}
      />
    </div>
  );
}
