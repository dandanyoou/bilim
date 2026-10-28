/**
 * SSAD 3.5.4 PaymentGateway 어댑터 계약의 Mock 구현. 실제 결제대행사 대신
 * 즉시 AUTHORIZED로 응답한다. DEC-03(결제대행사)이 정해지면 이 파일만 실제
 * SDK 호출로 바꾸면 되고, 호출부(rentals 명령)는 바뀌지 않는다.
 */
export interface MockAuthorizeResult {
  status: "AUTHORIZED";
  pgPaymentKey: string;
}

export async function mockAuthorize(idempotencyKey: string): Promise<MockAuthorizeResult> {
  return { status: "AUTHORIZED", pgPaymentKey: `mock_${idempotencyKey}` };
}
