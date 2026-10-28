import { ItemCard } from "@/components/items/ItemCard";
import type { ItemListRow } from "@/lib/items/queries";

/** 7개마다 한 칸을 크게(벤토) — 사진이 있는 물품만 골라서, 빈 플레이스홀더가 커 보이지 않게 한다. */
function isFeatured(item: ItemListRow, index: number): boolean {
  return index % 7 === 0 && item.photoKeys.length > 0;
}

export function ItemGrid({ items }: { items: ItemListRow[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:[grid-auto-flow:dense] lg:grid-cols-4">
      {items.map((item, i) => (
        <ItemCard key={item.id} item={item} featured={isFeatured(item, i)} />
      ))}
    </div>
  );
}
