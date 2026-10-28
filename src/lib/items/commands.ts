import { db } from "@/lib/db/client";
import { apiError } from "@/lib/api/errors";
import { isEnabledCategory } from "@/lib/categories";

export interface CreateItemInput {
  ownerId: string;
  category: string;
  title: string;
  description?: string;
  dailyFee: number;
  deposit: number;
  buyoutPrice: number;
  pickupPlace: string;
  photoKeys: string[];
}

/**
 * OP-02(createItem+publishItem)를 Phase A 범위에선 한 번에 처리한다: 등록 폼에서
 * 사진을 다 올리고 제출하면 바로 공개(listed)까지 간다. 금액·길이 범위는 DB CHECK
 * 제약이 이미 검증하므로(23514 → E_VALIDATION) 여기서 다시 베껴 쓰지 않는다.
 * 여기서 직접 확인하는 건 DB가 모르는 두 가지뿐이다: 허용 품목인지, 사진 4장 이상인지.
 */
export async function createAndPublishItem(input: CreateItemInput) {
  if (!isEnabledCategory(input.category)) {
    throw apiError("E_CATEGORY_DISABLED", "1단계에서 받지 않는 품목이에요.");
  }
  if (input.photoKeys.length < 4) {
    throw apiError("E_PHOTO_MIN", "사진을 4장 이상 올려주세요.");
  }

  return db.transaction().execute(async (trx) => {
    const item = await trx
      .insertInto("items")
      .values({
        ownerId: input.ownerId,
        category: input.category,
        title: input.title,
        description: input.description ?? "",
        dailyFee: input.dailyFee,
        deposit: input.deposit,
        buyoutPrice: input.buyoutPrice,
        pickupPlace: input.pickupPlace,
        status: "listed",
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    await trx
      .insertInto("itemPhotos")
      .values(
        input.photoKeys.map((storageKey, i) => ({
          itemId: item.id,
          storageKey,
          position: i + 1,
        }))
      )
      .execute();

    return item;
  });
}
