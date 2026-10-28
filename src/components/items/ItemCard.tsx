import Image from "next/image";
import Link from "next/link";
import { CATEGORY_LABEL, type Category } from "@/lib/categories";
import { formatWon } from "@/lib/money";
import type { ItemListRow } from "@/lib/items/queries";

export function ItemCard({ item }: { item: ItemListRow }) {
  return (
    <Link
      href={`/items/${item.id}`}
      className="group block overflow-hidden rounded-2xl border border-line bg-white/60 transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square w-full bg-cream-soft">
        {item.thumbnailKey ? (
          <Image
            src={`/uploads/${item.thumbnailKey}`}
            alt={item.title}
            fill
            sizes="(min-width: 1024px) 23vw, (min-width: 640px) 45vw, 90vw"
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-hand text-2xl text-ink-soft/50">
            빌림
          </div>
        )}
      </div>
      <div className="space-y-1.5 p-4">
        <span className="text-xs text-accent">{CATEGORY_LABEL[item.category as Category] ?? item.category}</span>
        <h3 className="line-clamp-1 font-medium text-ink">{item.title}</h3>
        <p className="text-sm font-semibold text-ink">
          일 {formatWon(item.dailyFee)}
          <span className="ml-1.5 text-xs font-normal text-ink-soft">
            · 보증금 {formatWon(item.deposit)}
          </span>
        </p>
        <p className="truncate text-xs text-ink-soft">{item.pickupPlace}</p>
      </div>
    </Link>
  );
}
