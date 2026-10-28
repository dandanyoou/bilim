-- 데이터 계약 실행 검증. 각 시험은 결과표 db_test_results에 PASS/FAIL로 남습니다.
SET client_min_messages = warning;
CREATE TABLE db_test_results (tc text PRIMARY KEY, title text, expected text, actual text, result text);

CREATE FUNCTION t_expect_error(tc text, title text, stmt text, marker text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE msg text; st text;
BEGIN
  BEGIN
    EXECUTE stmt;
    INSERT INTO db_test_results VALUES (tc, title, 'error '||marker, 'no error', 'FAIL');
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS msg = MESSAGE_TEXT, st = RETURNED_SQLSTATE;
    INSERT INTO db_test_results VALUES (tc, title, 'error '||marker, st||' '||left(msg,80),
      CASE WHEN st = marker OR msg LIKE marker||'%' THEN 'PASS' ELSE 'FAIL' END);
  END;
END $$;

CREATE FUNCTION t_expect_ok(tc text, title text, stmt text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE msg text;
BEGIN
  BEGIN
    EXECUTE stmt;
    INSERT INTO db_test_results VALUES (tc, title, 'ok', 'ok', 'PASS');
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS msg = MESSAGE_TEXT;
    INSERT INTO db_test_results VALUES (tc, title, 'ok', left(msg,80), 'FAIL');
  END;
END $$;

-- 고정 데이터
INSERT INTO users (id, school_email, display_name, role) VALUES
 ('00000000-0000-0000-0000-00000000000a','owner@korea.ac.kr','빌려주는사람','member'),
 ('00000000-0000-0000-0000-00000000000b','renter@korea.ac.kr','빌리는사람','member'),
 ('00000000-0000-0000-0000-00000000000c','renter2@korea.ac.kr','빌리는사람2','member'),
 ('00000000-0000-0000-0000-00000000000d','mod@korea.ac.kr','운영자','moderator');
INSERT INTO items (id, owner_id, category, title, daily_fee, deposit, buyout_price, pickup_place, status) VALUES
 ('00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-00000000000a','electronics','미러리스 카메라',10000,50000,300000,'정문 앞','listed');

CREATE FUNCTION t_new_rental(rid uuid, renter uuid, f text, t text, d int) RETURNS void LANGUAGE sql AS $$
  INSERT INTO rentals (id,item_id,owner_id,renter_id,period,days,daily_fee_snapshot,rental_fee,deposit_snapshot,buyout_price_snapshot,platform_fee)
  VALUES (rid,'00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-00000000000a',renter,
          tstzrange(f::timestamptz,t::timestamptz,'[)'),d,10000,10000*d,50000,300000,1000*d);
$$;

SELECT t_new_rental('00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-00000000000b','2026-11-10 10:00+09','2026-11-12 10:00+09',2);
SELECT t_new_rental('00000000-0000-0000-0000-000000000102','00000000-0000-0000-0000-00000000000c','2026-11-11 10:00+09','2026-11-13 10:00+09',2);
SELECT t_new_rental('00000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-00000000000c','2026-11-12 10:00+09','2026-11-14 10:00+09',2);

SELECT t_expect_ok   ('DB-01a','겹치지 않는 첫 대여 수락',
  $$UPDATE rentals SET status='ACCEPTED' WHERE id='00000000-0000-0000-0000-000000000101'$$);
SELECT t_expect_error('DB-01b','겹치는 기간의 두 번째 대여 수락 거부',
  $$UPDATE rentals SET status='ACCEPTED' WHERE id='00000000-0000-0000-0000-000000000102'$$,'23P01');
SELECT t_expect_ok   ('DB-02','끝나는 시각에 시작하는 대여는 겹치지 않음',
  $$UPDATE rentals SET status='ACCEPTED' WHERE id='00000000-0000-0000-0000-000000000103'$$);
SELECT t_expect_error('DB-03','허용표에 없는 전이 REQUESTED→IN_USE 거부',
  $$UPDATE rentals SET status='IN_USE' WHERE id='00000000-0000-0000-0000-000000000102'$$,'E_TRANSITION');
SELECT t_expect_error('DB-04','보증금 승인 전 PAID 전환 거부',
  $$UPDATE rentals SET status='PAID' WHERE id='00000000-0000-0000-0000-000000000101'$$,'E_DEPOSIT');

INSERT INTO payments (rental_id,purpose,amount,status,idempotency_key) VALUES
 ('00000000-0000-0000-0000-000000000101','deposit_hold',50000,'AUTHORIZED','idem-0000000000000001'),
 ('00000000-0000-0000-0000-000000000101','rental_fee',20000,'UNKNOWN','idem-0000000000000002');
SELECT t_expect_error('DB-05a','결제 결과가 UNKNOWN이면 PAID 전환 거부',
  $$UPDATE rentals SET status='PAID' WHERE id='00000000-0000-0000-0000-000000000101'$$,'E_PAYMENT');
UPDATE payments SET status='AUTHORIZED' WHERE idempotency_key='idem-0000000000000002';
SELECT t_expect_ok   ('DB-05b','대여료·보증금 승인 후 PAID 전환',
  $$UPDATE rentals SET status='PAID' WHERE id='00000000-0000-0000-0000-000000000101'$$);
SELECT t_expect_error('DB-06','같은 대여·목적의 두 번째 살아 있는 결제 거부',
  $$INSERT INTO payments (rental_id,purpose,amount,idempotency_key) VALUES ('00000000-0000-0000-0000-000000000101','rental_fee',20000,'idem-0000000000000003')$$,'23505');
SELECT t_expect_error('DB-07','같은 멱등 키 결제 재생성 거부',
  $$INSERT INTO payments (rental_id,purpose,amount,idempotency_key) VALUES ('00000000-0000-0000-0000-000000000103','rental_fee',20000,'idem-0000000000000001')$$,'23505');

INSERT INTO handover_checks (rental_id,kind,party,checklist) VALUES
 ('00000000-0000-0000-0000-000000000101','handover','owner','{"items":["본체","배터리","충전기"],"ok":true}');
SELECT t_expect_error('DB-08a','한쪽만 인계 확인하면 IN_USE 전환 거부',
  $$UPDATE rentals SET status='IN_USE' WHERE id='00000000-0000-0000-0000-000000000101'$$,'E_HANDOVER');
SELECT t_expect_error('DB-09','같은 당사자의 인계 확인 중복 거부',
  $$INSERT INTO handover_checks (rental_id,kind,party,checklist) VALUES ('00000000-0000-0000-0000-000000000101','handover','owner','{}')$$,'23505');
INSERT INTO handover_checks (rental_id,kind,party,checklist) VALUES
 ('00000000-0000-0000-0000-000000000101','handover','renter','{"items":["본체","배터리","충전기"],"ok":true}');
SELECT t_expect_ok   ('DB-08b','양쪽 인계 확인 후 IN_USE 전환',
  $$UPDATE rentals SET status='IN_USE' WHERE id='00000000-0000-0000-0000-000000000101'$$);

SELECT t_expect_ok   ('DB-10a','대여 한 건의 첫 정산 생성',
  $$INSERT INTO payouts (rental_id,owner_id,amount,idempotency_key) VALUES ('00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-00000000000a',18000,'payout-000000000101')$$);
SELECT t_expect_error('DB-10b','같은 대여의 두 번째 정산 거부',
  $$INSERT INTO payouts (rental_id,owner_id,amount,idempotency_key) VALUES ('00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-00000000000a',18000,'payout-000000000101-b')$$,'23505');

UPDATE rentals SET status='BUYOUT_PENDING' WHERE id='00000000-0000-0000-0000-000000000101';
INSERT INTO buyouts (rental_id,price,cause) VALUES ('00000000-0000-0000-0000-000000000101',300000,'loss');
SELECT t_expect_error('DB-11','동의·결정 없이 인수 확정 거부',
  $$UPDATE buyouts SET status='CONFIRMED' WHERE rental_id='00000000-0000-0000-0000-000000000101'$$,'23514');
SELECT t_expect_error('DB-12a','인수 확정 전 BOUGHT_OUT 전환 거부',
  $$UPDATE rentals SET status='BOUGHT_OUT' WHERE id='00000000-0000-0000-0000-000000000101'$$,'E_BUYOUT');
UPDATE buyouts SET renter_consented_at=now(), status='CONFIRMED' WHERE rental_id='00000000-0000-0000-0000-000000000101';
SELECT t_expect_ok   ('DB-12b','빌린 사람 동의 후 BOUGHT_OUT 전환',
  $$UPDATE rentals SET status='BOUGHT_OUT' WHERE id='00000000-0000-0000-0000-000000000101'$$);

INSERT INTO pg_webhook_events (provider,event_id,payload) VALUES ('pg','evt_1','{}');
SELECT t_expect_error('DB-13','같은 웹훅 이벤트 두 번째 저장 거부',
  $$INSERT INTO pg_webhook_events (provider,event_id,payload) VALUES ('pg','evt_1','{}')$$,'23505');

INSERT INTO check_photos (check_id,storage_key,sha256,taken_at,delete_after)
 SELECT id,'photos/h1.jpg',repeat('a',64),now(),now()+interval '90 days' FROM handover_checks WHERE party='owner' LIMIT 1;
SELECT t_expect_error('DB-14','보관 기간 중 검수 사진 삭제 거부',
  $$DELETE FROM check_photos WHERE storage_key='photos/h1.jpg'$$,'E_RETENTION');

INSERT INTO claims (rental_id,opened_by,reason,description) VALUES
 ('00000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-00000000000a','damage','렌즈 앞쪽에 긁힌 자국이 있습니다');
SELECT t_expect_error('DB-15','같은 대여의 두 번째 열린 분쟁 거부',
  $$INSERT INTO claims (rental_id,opened_by,reason,description) VALUES ('00000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-00000000000a','other','추가로 신고합니다 내용')$$,'23505');

SELECT t_expect_error('DB-17','자기 물건을 자기가 빌리는 대여 거부',
  $$SELECT t_new_rental('00000000-0000-0000-0000-000000000104','00000000-0000-0000-0000-00000000000a','2026-12-01 10:00+09','2026-12-02 10:00+09',1)$$,'23514');
SELECT t_expect_error('DB-18','대여료가 일 요금×일수와 다르면 거부',
  $$INSERT INTO rentals (item_id,owner_id,renter_id,period,days,daily_fee_snapshot,rental_fee,deposit_snapshot,buyout_price_snapshot,platform_fee)
    VALUES ('00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000b',
            tstzrange('2026-12-05 10:00+09','2026-12-07 10:00+09'),2,10000,15000,50000,300000,1000)$$,'23514');
SELECT t_expect_error('DB-20','REQUESTED가 아닌 상태로 대여 생성 거부',
  $$INSERT INTO rentals (item_id,owner_id,renter_id,period,days,daily_fee_snapshot,rental_fee,deposit_snapshot,buyout_price_snapshot,platform_fee,status)
    VALUES ('00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000b',
            tstzrange('2026-12-08 10:00+09','2026-12-09 10:00+09'),1,10000,10000,50000,300000,1000,'PAID')$$,'E_STATE');
SELECT t_expect_ok   ('DB-21','모든 상태 전이가 기록됨(대여 101: 6건)',
  $q$DO $d$ BEGIN IF (SELECT count(*) FROM rental_events WHERE rental_id='00000000-0000-0000-0000-000000000101') <> 6 THEN RAISE EXCEPTION 'count mismatch'; END IF; END $d$$q$);

SELECT t_expect_error('DB-24','보증금이 인수가보다 크면 물품 저장 거부',
  $$INSERT INTO items (owner_id,category,title,daily_fee,deposit,buyout_price,pickup_place) VALUES ('00000000-0000-0000-0000-00000000000a','electronics','태블릿',8000,400000,300000,'정문')$$,'23514');
SELECT t_expect_error('DB-25','종료 상태(DECLINED)에서 ACCEPTED로 되돌리기 거부',
  $q$DO $d$ BEGIN UPDATE rentals SET status='DECLINED' WHERE id='00000000-0000-0000-0000-000000000102'; UPDATE rentals SET status='ACCEPTED' WHERE id='00000000-0000-0000-0000-000000000102'; END $d$$q$,'E_TRANSITION');

-- 권한 시험: 앱 계정으로 상태 기록을 고치거나 지울 수 없음
GRANT INSERT ON db_test_results TO app_rw;
SET ROLE app_rw;
SELECT t_expect_error('DB-16a','앱 계정의 상태 기록 수정 거부',
  $$UPDATE rental_events SET to_status='CLOSED'$$,'42501');
SELECT t_expect_error('DB-16b','앱 계정의 결제 기록 삭제 거부',
  $$DELETE FROM payments$$,'42501');
RESET ROLE;
