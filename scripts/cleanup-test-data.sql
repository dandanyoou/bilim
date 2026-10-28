-- Vitest(tests/rentals-api.test.ts)가 bilim_dev에 만든 테스트 데이터를 정리한다.
-- FK 의존 순서대로 지운다: 자식 테이블 -> rentals/items -> users.
BEGIN;

CREATE TEMP TABLE _test_users AS
  SELECT id FROM users WHERE school_email ~ '^(owner|renter|renterb)-[0-9]+-[a-z0-9]+@korea\.ac\.kr$';

CREATE TEMP TABLE _test_items AS
  SELECT id FROM items WHERE title LIKE '테스트 물품%';

CREATE TEMP TABLE _test_rentals AS
  SELECT id FROM rentals WHERE item_id IN (SELECT id FROM _test_items);

DELETE FROM reviews WHERE rental_id IN (SELECT id FROM _test_rentals);
DELETE FROM payouts WHERE rental_id IN (SELECT id FROM _test_rentals);
DELETE FROM claim_decisions WHERE claim_id IN (SELECT id FROM claims WHERE rental_id IN (SELECT id FROM _test_rentals));
DELETE FROM buyouts WHERE rental_id IN (SELECT id FROM _test_rentals);
DELETE FROM claims WHERE rental_id IN (SELECT id FROM _test_rentals);
DELETE FROM check_photos WHERE check_id IN (SELECT id FROM handover_checks WHERE rental_id IN (SELECT id FROM _test_rentals));
DELETE FROM handover_checks WHERE rental_id IN (SELECT id FROM _test_rentals);
DELETE FROM payments WHERE rental_id IN (SELECT id FROM _test_rentals);
DELETE FROM rental_events WHERE rental_id IN (SELECT id FROM _test_rentals);
DELETE FROM rentals WHERE id IN (SELECT id FROM _test_rentals);
DELETE FROM item_photos WHERE item_id IN (SELECT id FROM _test_items);
DELETE FROM items WHERE id IN (SELECT id FROM _test_items);
DELETE FROM idempotency_keys WHERE user_id IN (SELECT id FROM _test_users);
DELETE FROM email_codes WHERE email IN (SELECT school_email FROM users WHERE id IN (SELECT id FROM _test_users));
DELETE FROM users WHERE id IN (SELECT id FROM _test_users);

COMMIT;
