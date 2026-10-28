import { listItems } from "@/lib/items/queries";
import { isEnabledCategory } from "@/lib/categories";
import { ItemCard } from "@/components/items/ItemCard";
import { ItemFilterBar } from "@/components/items/ItemFilterBar";

interface PageProps {
  searchParams: Promise<{ category?: string; from?: string; to?: string; q?: string }>;
}

export default async function ItemsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const category = params.category && isEnabledCategory(params.category) ? params.category : undefined;
  const fromIso = params.from ? `${params.from}T00:00:00+09:00` : undefined;
  const toIso = params.to ? `${params.to}T00:00:00+09:00` : undefined;

  const items = await listItems({
    category,
    from: fromIso && toIso ? fromIso : undefined,
    to: fromIso && toIso ? toIso : undefined,
    q: params.q,
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-bold text-ink">둘러보기</h1>
      <ItemFilterBar category={category} from={params.from} to={params.to} q={params.q} />

      {items.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-2 text-center text-ink-soft">
          <p className="font-hand text-3xl text-ink-soft/60">아직 비어 있어요</p>
          <p className="text-sm">조건에 맞는 물건이 없어요. 첫 물건을 등록해 볼래요?</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
