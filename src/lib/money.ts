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
