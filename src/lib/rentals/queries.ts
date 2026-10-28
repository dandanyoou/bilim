import { db } from "@/lib/db/client";
import { parseTstzRange } from "@/lib/dates";

export interface RentalDetail {
  id: string;
  itemId: string;
  itemTitle: string;
  ownerId: string;
  ownerName: string;
  renterId: string;
  renterName: string;
  from: string;
  to: string;
  days: number;
  rentalFee: number;
  platformFee: number;
  depositSnapshot: number;
  buyoutPriceSnapshot: number;
  status: string;
  version: number;
  createdAt: string;
  handoverPartiesConfirmed: string[];
  returnConfirmed: boolean;
  viewerRole: "owner" | "renter" | null;
  viewerHasReviewed: boolean;
}

export async function getRentalDetail(id: string, viewerId: string): Promise<RentalDetail | null> {
  const row = await db
    .selectFrom("rentals")
    .innerJoin("items", "items.id", "rentals.itemId")
    .innerJoin("users as owner", "owner.id", "rentals.ownerId")
    .innerJoin("users as renter", "renter.id", "rentals.renterId")
    .select([
      "rentals.id",
      "rentals.itemId",
      "items.title as itemTitle",
      "rentals.ownerId",
      "owner.displayName as ownerName",
      "rentals.renterId",
      "renter.displayName as renterName",
      "rentals.period",
      "rentals.days",
      "rentals.rentalFee",
      "rentals.platformFee",
      "rentals.depositSnapshot",
      "rentals.buyoutPriceSnapshot",
      "rentals.status",
      "rentals.version",
      "rentals.createdAt",
    ])
    .where("rentals.id", "=", id)
    .executeTakeFirst();

  if (!row) return null;
  if (row.ownerId !== viewerId && row.renterId !== viewerId) return null; // SEC-02: 당사자만

  const { from, to } = parseTstzRange(row.period);

  const handoverChecks = await db
    .selectFrom("handoverChecks")
    .select(["party", "kind"])
    .where("rentalId", "=", id)
    .execute();

  const viewerReview = await db
    .selectFrom("reviews")
    .select("id")
    .where("rentalId", "=", id)
    .where("authorId", "=", viewerId)
    .executeTakeFirst();

  return {
    id: row.id,
    itemId: row.itemId,
    itemTitle: row.itemTitle,
    ownerId: row.ownerId,
    ownerName: row.ownerName,
    renterId: row.renterId,
    renterName: row.renterName,
    from,
    to,
    days: row.days,
    rentalFee: row.rentalFee,
    platformFee: row.platformFee,
    depositSnapshot: row.depositSnapshot,
    buyoutPriceSnapshot: row.buyoutPriceSnapshot,
    status: row.status,
    version: row.version,
    createdAt: new Date(row.createdAt).toISOString(),
    handoverPartiesConfirmed: handoverChecks.filter((h) => h.kind === "handover").map((h) => h.party),
    returnConfirmed: handoverChecks.some((h) => h.kind === "return"),
    viewerRole: row.ownerId === viewerId ? "owner" : row.renterId === viewerId ? "renter" : null,
    viewerHasReviewed: !!viewerReview,
  };
}

export interface RentalListRow {
  id: string;
  itemTitle: string;
  counterpartName: string;
  status: string;
  from: string;
  to: string;
  rentalFee: number;
}

export async function listMyRentals(userId: string, role: "owner" | "renter"): Promise<RentalListRow[]> {
  const rows = await db
    .selectFrom("rentals")
    .innerJoin("items", "items.id", "rentals.itemId")
    .innerJoin("users as counterpart", "counterpart.id", role === "owner" ? "rentals.renterId" : "rentals.ownerId")
    .select([
      "rentals.id",
      "items.title as itemTitle",
      "counterpart.displayName as counterpartName",
      "rentals.status",
      "rentals.period",
      "rentals.rentalFee",
    ])
    .where(role === "owner" ? "rentals.ownerId" : "rentals.renterId", "=", userId)
    .orderBy("rentals.createdAt", "desc")
    .execute();

  return rows.map((r) => {
    const { from, to } = parseTstzRange(r.period);
    return {
      id: r.id,
      itemTitle: r.itemTitle,
      counterpartName: r.counterpartName,
      status: r.status,
      from,
      to,
      rentalFee: r.rentalFee,
    };
  });
}
