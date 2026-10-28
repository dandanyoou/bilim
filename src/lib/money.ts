// 금액은 항상 원 단위 정수로만 다룬다. 어디서도 소수점 연산을 하지 않는다.

export function formatWon(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}

export function calcRentalFee(dailyFee: number, days: number): number {
  return dailyFee * days;
}

export function calcPlatformFee(rentalFee: number, feeRate = 0.1): number {
  // 반올림이 아니라 내림 — 플랫폼 수수료가 대여료를 넘는 반올림 오류를 만들지 않는다.
  return Math.floor(rentalFee * feeRate);
}

/**
 * 인수가(파손·분실 시 물어내는 값)는 원래 SSAD AC-10-2대로라면 물품 등록값 그대로
 * 고정이어야 하지만, 팀 결정으로 "오래 빌릴수록 인수가도 올라간다"로 바꿨다
 * (요청 2026-10-28). 등록된 기본 인수가에 "일 요금 × 대여일수 × 0.5"를 더한다.
 * 대여 요청 시점에 한 번 계산해 rentals.buyout_price_snapshot에 스냅샷하고,
 * 그 뒤로는(물품 정보가 바뀌어도) 다시 계산하지 않는다 — 스냅샷이라는 원칙은 유지.
 */
export function calcBuyoutPrice(baseBuyoutPrice: number, dailyFee: number, days: number): number {
  return baseBuyoutPrice + Math.floor(dailyFee * days * 0.5);
}
