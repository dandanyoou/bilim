-- A2/A3 수동 테스트 때 넣었던 가짜 사진(맥 기본 배경화면)짜리 "2인용 텐트" 데모 상품을
-- 지운다. 실제 사용자 사진으로 상품을 다시 시드하기 전 정리.
BEGIN;

CREATE TEMP TABLE _demo_item AS SELECT id FROM items WHERE id = '6ea0486e-1d4d-4f79-82a4-dd339870f7a1';
CREATE TEMP TABLE _demo_rentals AS SELECT id FROM rentals WHERE item_id IN (SELECT id FROM _demo_item);

DELETE FROM reviews WHERE rental_id IN (SELECT id FROM _demo_rentals);
DELETE FROM payouts WHERE rental_id IN (SELECT id FROM _demo_rentals);
-- INV-9 보관 기간 트리거를 통과하려면 먼저 delete_after를 과거로 당겨야 한다.
UPDATE check_photos SET delete_after = now() - interval '1 minute'
  WHERE check_id IN (SELECT id FROM handover_checks WHERE rental_id IN (SELECT id FROM _demo_rentals));
DELETE FROM check_photos WHERE check_id IN (SELECT id FROM handover_checks WHERE rental_id IN (SELECT id FROM _demo_rentals));
DELETE FROM handover_checks WHERE rental_id IN (SELECT id FROM _demo_rentals);
DELETE FROM payments WHERE rental_id IN (SELECT id FROM _demo_rentals);
DELETE FROM rental_events WHERE rental_id IN (SELECT id FROM _demo_rentals);
DELETE FROM rentals WHERE id IN (SELECT id FROM _demo_rentals);
DELETE FROM item_photos WHERE item_id IN (SELECT id FROM _demo_item);
DELETE FROM items WHERE id IN (SELECT id FROM _demo_item);

COMMIT;
