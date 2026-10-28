import { sql } from "kysely";
import { db } from "@/lib/db/client";
import { apiError } from "@/lib/api/errors";
import { calcRentalFee, calcPlatformFee } from "@/lib/money";
import { mockAuthorize } from "@/lib/adapters/paymentGateway";
import type { ReadyPhoto } from "@/components/uploads/PhotoPicker";

async function getRentalOrThrow(id: string) {
  const rental = await db.selectFrom("rentals").selectAll().where("id", "=", id).executeTakeFirst();
  if (!rental) throw apiError("E_NOT_FOUND", "대여를 찾을 수 없어요.");
  return rental;
}

/** If-Match(버전) 기반 낙관적 잠금으로 상태를 바꾼다. 버전이 다르면 E_STALE_VERSION. */
async function updateRentalStatus(id: string, toStatus: string, expectedVersion: number) {
  const updated = await db
    .updateTable("rentals")
    .set({ status: toStatus })
    .where("id", "=", id)
    .where("version", "=", expectedVersion)
    .returningAll()
    .executeTakeFirst();
  if (updated) return updated;

  const stillExists = await db.selectFrom("rentals").select("id").where("id", "=", id).executeTakeFirst();
  if (!stillExists) throw apiError("E_NOT_FOUND", "대여를 찾을 수 없어요.");
  throw apiError("E_STALE_VERSION", "다른 곳에서 먼저 상태가 바뀌었어요. 새로고침해 주세요.");
}

// OP-04 requestRental
export async function requestRental(input: {
  renterId: string;
  itemId: string;
  startIso: string;
  days: number;
}) {
  const item = await db.selectFrom("items").selectAll().where("id", "=", input.itemId).executeTakeFirst();
  if (!item || item.status !== "listed") {
    throw apiError("E_NOT_FOUND", "물품을 찾을 수 없어요.");
  }
  if (item.ownerId === input.renterId) {
    throw apiError("E_SELF_RENTAL", "자기 물품은 빌릴 수 없어요.");
  }

  const start = new Date(input.startIso);
  const end = new Date(start.getTime() + input.days * 24 * 60 * 60 * 1000);
  const rentalFee = calcRentalFee(item.dailyFee, input.days);
  const platformFee = calcPlatformFee(rentalFee);

  return db
    .insertInto("rentals")
    .values({
      itemId: item.id,
      ownerId: item.ownerId,
      renterId: input.renterId,
      period: sql`tstzrange(${start.toISOString()}::timestamptz, ${end.toISOString()}::timestamptz, '[)')`,
      days: input.days,
      dailyFeeSnapshot: item.dailyFee,
      rentalFee,
      depositSnapshot: item.deposit,
      buyoutPriceSnapshot: item.buyoutPrice,
      platformFee,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

// OP-05 acceptRental/declineRental
export async function acceptRental(id: string, ownerId: string, expectedVersion: number) {
  const rental = await getRentalOrThrow(id);
  if (rental.ownerId !== ownerId) throw apiError("E_FORBIDDEN", "빌려준 사람만 수락할 수 있어요.");
  return updateRentalStatus(id, "ACCEPTED", expectedVersion);
}

export async function declineRental(id: string, ownerId: string, expectedVersion: number) {
  const rental = await getRentalOrThrow(id);
  if (rental.ownerId !== ownerId) throw apiError("E_FORBIDDEN", "빌려준 사람만 거절할 수 있어요.");
  return updateRentalStatus(id, "DECLINED", expectedVersion);
}

// OP-06+OP-07을 모의 어댑터로 한 번에: 승인 즉시 두 결제를 AUTHORIZED로 만들고 PAID로 전환한다.
export async function payRental(id: string, renterId: string, expectedVersion: number) {
  const rental = await getRentalOrThrow(id);
  if (rental.renterId !== renterId) throw apiError("E_FORBIDDEN", "빌리는 사람만 결제할 수 있어요.");
  if (rental.status !== "ACCEPTED") throw apiError("E_INVALID_STATE", "지금은 결제할 수 없어요.");

  return db.transaction().execute(async (trx) => {
    const feeAuth = await mockAuthorize(`${id}-fee`);
    await trx
      .insertInto("payments")
      .values({
        rentalId: id,
        purpose: "rental_fee",
        amount: rental.rentalFee,
        status: feeAuth.status,
        pgPaymentKey: feeAuth.pgPaymentKey,
        idempotencyKey: `mock-${id}-fee`,
      })
      .onConflict((oc) => oc.column("idempotencyKey").doNothing())
      .execute();

    // rentals_guard 트리거: deposit_snapshot이 0이면 보증금 승인은 아예 요구하지 않는다.
    if (rental.depositSnapshot > 0) {
      const depositAuth = await mockAuthorize(`${id}-deposit`);
      await trx
        .insertInto("payments")
        .values({
          rentalId: id,
          purpose: "deposit_hold",
          amount: rental.depositSnapshot,
          status: depositAuth.status,
          pgPaymentKey: depositAuth.pgPaymentKey,
          idempotencyKey: `mock-${id}-deposit`,
        })
        .onConflict((oc) => oc.column("idempotencyKey").doNothing())
        .execute();
    }

    const updated = await trx
      .updateTable("rentals")
      .set({ status: "PAID" })
      .where("id", "=", id)
      .where("version", "=", expectedVersion)
      .returningAll()
      .executeTakeFirst();
    if (!updated) throw apiError("E_STALE_VERSION", "다른 곳에서 먼저 상태가 바뀌었어요. 새로고침해 주세요.");
    return updated;
  });
}

interface ChecklistInput {
  items: string[];
  photos: ReadyPhoto[];
}

// OP-09 confirmHandover: 당사자별 1회, 둘 다 확정되면 IN_USE로 전환한다.
export async function confirmHandover(id: string, userId: string, expectedVersion: number, input: ChecklistInput) {
  const rental = await getRentalOrThrow(id);
  const party = rental.ownerId === userId ? "owner" : rental.renterId === userId ? "renter" : null;
  if (!party) throw apiError("E_FORBIDDEN", "이 대여의 당사자만 할 수 있어요.");
  if (rental.version !== expectedVersion) {
    throw apiError("E_STALE_VERSION", "다른 곳에서 먼저 상태가 바뀌었어요. 새로고침해 주세요.");
  }
  if (input.photos.length < 4) throw apiError("E_PHOTO_MIN", "사진을 4장 이상 올려주세요.");

  return db.transaction().execute(async (trx) => {
    const check = await trx
      .insertInto("handoverChecks")
      .values({
        rentalId: id,
        kind: "handover",
        party,
        checklist: JSON.stringify({ items: input.items, confirmedAt: new Date().toISOString() }),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    await trx
      .insertInto("checkPhotos")
      .values(
        input.photos.map((p) => ({
          checkId: check.id,
          storageKey: p.storageKey,
          sha256: p.sha256,
          takenAt: new Date(),
          deleteAfter: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // DEC-07 제안값: 90일
        }))
      )
      .execute();

    const confirmedCount = await trx
      .selectFrom("handoverChecks")
      .select((eb) => eb.fn.countAll().as("count"))
      .where("rentalId", "=", id)
      .where("kind", "=", "handover")
      .executeTakeFirstOrThrow();

    if (Number(confirmedCount.count) >= 2) {
      const updated = await trx
        .updateTable("rentals")
        .set({ status: "IN_USE" })
        .where("id", "=", id)
        .where("version", "=", expectedVersion)
        .returningAll()
        .executeTakeFirstOrThrow();
      return { rental: updated, confirmedBy: ["owner", "renter"] as const };
    }

    const current = await trx.selectFrom("rentals").selectAll().where("id", "=", id).executeTakeFirstOrThrow();
    return { rental: current, confirmedBy: [party] as const };
  });
}

// OP-10 confirmReturn: owner만. 반납 체크리스트 확정 → RETURNED.
export async function confirmReturn(id: string, ownerId: string, expectedVersion: number, input: ChecklistInput) {
  const rental = await getRentalOrThrow(id);
  if (rental.ownerId !== ownerId) throw apiError("E_FORBIDDEN", "빌려준 사람만 반납을 확정할 수 있어요.");
  if (input.photos.length < 4) throw apiError("E_PHOTO_MIN", "사진을 4장 이상 올려주세요.");

  return db.transaction().execute(async (trx) => {
    const check = await trx
      .insertInto("handoverChecks")
      .values({
        rentalId: id,
        kind: "return",
        party: "owner",
        checklist: JSON.stringify({ items: input.items, confirmedAt: new Date().toISOString() }),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    await trx
      .insertInto("checkPhotos")
      .values(
        input.photos.map((p) => ({
          checkId: check.id,
          storageKey: p.storageKey,
          sha256: p.sha256,
          takenAt: new Date(),
          deleteAfter: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        }))
      )
      .execute();

    const updated = await trx
      .updateTable("rentals")
      .set({ status: "RETURNED" })
      .where("id", "=", id)
      .where("version", "=", expectedVersion)
      .returningAll()
      .executeTakeFirst();
    if (!updated) throw apiError("E_STALE_VERSION", "다른 곳에서 먼저 상태가 바뀌었어요. 새로고침해 주세요.");
    return updated;
  });
}

// OP-17 cancelRental (인계 전 취소만. 환불 계산은 Phase B)
export async function cancelRental(id: string, userId: string, expectedVersion: number) {
  const rental = await getRentalOrThrow(id);
  if (rental.ownerId !== userId && rental.renterId !== userId) {
    throw apiError("E_FORBIDDEN", "이 대여의 당사자만 취소할 수 있어요.");
  }
  return updateRentalStatus(id, "CANCELED", expectedVersion);
}

/**
 * OP-14 closeAndSettle을 JOB-03(스케줄러) 없이 수동으로 트리거한다.
 * SHORTCUT: 실제로는 "반납 후 24시간 이의 없음"을 기다려야 하지만, Phase A엔
 * 스케줄러가 없어서 당사자가 버튼으로 즉시 종료·정산 생성까지 진행한다.
 * Phase B에서 JOB-03 cron으로 교체하고 이 함수는 그 cron이 호출하게 바뀐다.
 */
export async function devCloseAndSettle(id: string, actorId: string) {
  const rental = await getRentalOrThrow(id);
  if (rental.ownerId !== actorId && rental.renterId !== actorId) {
    throw apiError("E_FORBIDDEN", "이 대여의 당사자만 할 수 있어요.");
  }
  if (rental.status !== "RETURNED") {
    throw apiError("E_INVALID_STATE", "반납 확정 후에만 종료할 수 있어요.");
  }

  return db.transaction().execute(async (trx) => {
    const updated = await trx
      .updateTable("rentals")
      .set({ status: "CLOSED" })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirstOrThrow();

    const settleAmount = updated.rentalFee - updated.platformFee;
    await trx
      .insertInto("payouts")
      .values({
        rentalId: id,
        ownerId: updated.ownerId,
        amount: settleAmount,
        idempotencyKey: `payout-${id}`,
      })
      .onConflict((oc) => oc.column("rentalId").doNothing())
      .execute();

    return updated;
  });
}

// OP-19 writeReview
export async function writeReview(id: string, authorId: string, rating: number, body: string) {
  const rental = await getRentalOrThrow(id);
  if (rental.ownerId !== authorId && rental.renterId !== authorId) {
    throw apiError("E_FORBIDDEN", "이 대여의 당사자만 후기를 쓸 수 있어요.");
  }
  if (!["CLOSED", "BOUGHT_OUT"].includes(rental.status)) {
    throw apiError("E_INVALID_STATE", "종료된 대여만 후기를 쓸 수 있어요.");
  }
  const targetId = rental.ownerId === authorId ? rental.renterId : rental.ownerId;

  return db
    .insertInto("reviews")
    .values({ rentalId: id, authorId, targetId, rating, body })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export { getRentalOrThrow };
