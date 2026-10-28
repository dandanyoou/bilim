import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { signUp, publishItem, requestRentalApi, acceptRentalApi, type TestUser } from "./helpers";
import { cleanupTestData } from "./cleanup";

// 이 4가지는 DB 계약 시험(sql/tests.sql)이 이미 증명한 불변식을, 그 제약을 실제로
// 호출하는 Next.js 라우트 레이어에서도 다시 확인한다. DB가 맞다는 건 이미 알고 있고,
// 여기서 보는 건 "라우트 코드가 그 DB 제약을 올바르게 호출·해석하는가"다.
//
// 주의: 이 시험은 실행 중인 서버(= bilim_dev, 사람이 보는 그 DB)에 실제로 데이터를
// 만든다. beforeAll/afterAll에서 반드시 치운다 — 한 번 안 치워서 "테스트 물품"이
// 실제 상점 목록에 남는 사고가 있었다.
describe("대여 API 핵심 계약", () => {
  let owner: TestUser;
  let renter: TestUser;
  let itemId: string;

  beforeAll(async () => {
    await cleanupTestData(); // 이전 실행이 비정상 종료해 남긴 찌꺼기 선제 정리
    owner = await signUp("owner", "테스트빌려주는사람");
    renter = await signUp("renter", "테스트빌리는사람");
    itemId = await publishItem(owner);
  }, 30_000);

  afterAll(async () => {
    await cleanupTestData();
  }, 30_000);

  it("AC-04-3: 자기 물품은 빌릴 수 없다(E_SELF_RENTAL)", async () => {
    const { status, body } = await requestRentalApi(owner, itemId, "2027-03-01T10:00:00+09:00", 2);
    expect(status).toBe(400);
    expect(body.error.code).toBe("E_SELF_RENTAL");
  });

  it("AC-04-2/INV-5: 같은 Idempotency-Key로 재요청하면 같은 대여를 돌려준다", async () => {
    const key = crypto.randomUUID();
    const first = await requestRentalApi(renter, itemId, "2027-03-10T10:00:00+09:00", 2, key);
    const second = await requestRentalApi(renter, itemId, "2027-03-10T10:00:00+09:00", 2, key);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.rentalId).toBe(first.body.rentalId);
  });

  it("AC-05-3: 오래된 버전으로 수락하면 409 E_STALE_VERSION", async () => {
    const { body } = await requestRentalApi(renter, itemId, "2027-03-20T10:00:00+09:00", 2);
    const firstAccept = await acceptRentalApi(owner, body.rentalId, body.version);
    expect(firstAccept.status).toBe(200);

    const staleAccept = await acceptRentalApi(owner, body.rentalId, body.version); // 이미 쓴 버전 재사용
    expect(staleAccept.status).toBe(409);
    expect(staleAccept.body.error.code).toBe("E_STALE_VERSION");
  });

  it("AC-05-1/INV-1: 겹치는 기간 동시 수락은 1건만 성공하고 나머지는 409 E_PERIOD_TAKEN", async () => {
    const renterB = await signUp("renterb", "테스트빌리는사람2");
    const a = await requestRentalApi(renter, itemId, "2027-04-01T10:00:00+09:00", 3);
    const b = await requestRentalApi(renterB, itemId, "2027-04-02T10:00:00+09:00", 3);
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);

    const [acceptA, acceptB] = await Promise.all([
      acceptRentalApi(owner, a.body.rentalId, a.body.version),
      acceptRentalApi(owner, b.body.rentalId, b.body.version),
    ]);

    const statuses = [acceptA.status, acceptB.status].sort();
    expect(statuses).toEqual([200, 409]);
    const rejected = acceptA.status === 409 ? acceptA : acceptB;
    expect(rejected.body.error.code).toBe("E_PERIOD_TAKEN");
  });
});
