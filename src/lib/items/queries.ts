import { sql } from "kysely";
import { db } from "@/lib/db/client";
import type { Category } from "@/lib/categories";

export interface ItemListFilter {
  category?: Category;
  from?: string; // ISO datetime
  to?: string;
  q?: string;
  limit?: number;
}

export interface ItemListRow {
  id: string;
  title: string;
  category: string;
  dailyFee: number;
  deposit: number;
  buyoutPrice: number;
  pickupPlace: string;
  thumbnailKey: string | null;
}

/** OP-03 searchItems. AC-03-1: 지정한 기간에 활성 대여가 있는 물품은 결과에서 뺀다. */
export async function listItems(filter: ItemListFilter): Promise<ItemListRow[]> {
  let query = db
    .selectFrom("items")
    .where("status", "=", "listed")
    .select([
      "items.id",
      "items.title",
      "items.category",
      "items.dailyFee",
      "items.deposit",
      "items.buyoutPrice",
      "items.pickupPlace",
    ])
    .orderBy("items.createdAt", "desc")
    .limit(filter.limit ?? 24);

  if (filter.category) {
    query = query.where("items.category", "=", filter.category);
  }
  if (filter.q) {
    query = query.where("items.title", "ilike", `%${filter.q}%`);
  }
  if (filter.from && filter.to) {
    query = query.where((eb) =>
      eb.not(
        eb.exists(
          eb
            .selectFrom("rentals")
            .select("rentals.id")
            .whereRef("rentals.itemId", "=", "items.id")
            .where("rentals.status", "in", ["ACCEPTED", "PAID", "IN_USE", "OVERDUE"])
            .where(
              sql<boolean>`rentals.period && tstzrange(${filter.from}::timestamptz, ${filter.to}::timestamptz, '[)')`
            )
        )
      )
    );
  }

  const rows = await query.execute();
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const photos = await db
    .selectFrom("itemPhotos")
    .select(["itemId", "storageKey", "position"])
    .where("itemId", "in", ids)
    .orderBy("position", "asc")
    .execute();

  const thumbByItem = new Map<string, string>();
  for (const p of photos) {
    if (!thumbByItem.has(p.itemId)) thumbByItem.set(p.itemId, p.storageKey);
  }

  return rows.map((r) => ({ ...r, thumbnailKey: thumbByItem.get(r.id) ?? null }));
}

export interface ItemDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  dailyFee: number;
  deposit: number;
  buyoutPrice: number;
  pickupPlace: string;
  status: string;
  version: number;
  ownerId: string;
  ownerDisplayName: string;
  photos: { storageKey: string; position: number }[];
}

/** OP-03의 상세 조회 부분. 소유자이거나 공개(listed) 상태일 때만 보여준다(권한은 호출부에서 처리). */
export async function getItemDetail(id: string): Promise<ItemDetail | null> {
  const item = await db
    .selectFrom("items")
    .innerJoin("users", "users.id", "items.ownerId")
    .select([
      "items.id",
      "items.title",
      "items.description",
      "items.category",
      "items.dailyFee",
      "items.deposit",
      "items.buyoutPrice",
      "items.pickupPlace",
      "items.status",
      "items.version",
      "items.ownerId",
      "users.displayName as ownerDisplayName",
    ])
    .where("items.id", "=", id)
    .executeTakeFirst();

  if (!item) return null;

  const photos = await db
    .selectFrom("itemPhotos")
    .select(["storageKey", "position"])
    .where("itemId", "=", id)
    .orderBy("position", "asc")
    .execute();

  return { ...item, photos };
}
