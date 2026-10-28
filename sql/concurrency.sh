#!/bin/bash
# DB-19: 같은 물품·겹치는 기간 대여 30건을 동시에 수락 → 1건만 성공해야 함
# DB-22: 같은 대여의 정산 생성 요청 20건 동시 → 1건만 저장
# DB-23: 같은 멱등 키 요청 20건 동시 → 1건만 저장
P="psql -h ${PGHOST:-/tmp} -p ${PGPORT:-5544} -U ${PGUSER:-postgres} -d rent -q -t -A"
$P -c "INSERT INTO items (id, owner_id, category, title, daily_fee, deposit, buyout_price, pickup_place, status) VALUES ('00000000-0000-0000-0000-0000000000f2','00000000-0000-0000-0000-00000000000a','camping_living','캠핑 의자 2개',5000,0,60000,'후문','listed')"
for i in $(seq -w 1 30); do
 $P -c "INSERT INTO rentals (id,item_id,owner_id,renter_id,period,days,daily_fee_snapshot,rental_fee,deposit_snapshot,buyout_price_snapshot,platform_fee) VALUES ('00000000-0000-0000-0000-0000000002$i','00000000-0000-0000-0000-0000000000f2','00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000b',tstzrange('2026-11-20 10:00+09','2026-11-22 10:00+09'),2,5000,10000,0,60000,1000)"
done
for i in $(seq -w 1 30); do
 ( $P -c "UPDATE rentals SET status='ACCEPTED' WHERE id='00000000-0000-0000-0000-0000000002$i'" >/dev/null 2>&1 ) &
done; wait
A=$($P -c "SELECT count(*) FROM rentals WHERE item_id='00000000-0000-0000-0000-0000000000f2' AND status='ACCEPTED'")
echo "DB-19 accepted=$A"
for i in $(seq 1 20); do
 ( $P -c "INSERT INTO payouts (rental_id,owner_id,amount,idempotency_key) VALUES ('00000000-0000-0000-0000-000000000103','00000000-0000-0000-0000-00000000000a',18000,'payout-103-try$i')" >/dev/null 2>&1 ) &
done; wait
B=$($P -c "SELECT count(*) FROM payouts WHERE rental_id='00000000-0000-0000-0000-000000000103'")
echo "DB-22 payouts=$B"
for i in $(seq 1 20); do
 ( $P -c "INSERT INTO idempotency_keys (user_id,key,endpoint,request_hash) VALUES ('00000000-0000-0000-0000-00000000000b','req-key-0000000000001','POST /v1/rentals','h1')" >/dev/null 2>&1 ) &
done; wait
C=$($P -c "SELECT count(*) FROM idempotency_keys WHERE key='req-key-0000000000001'")
echo "DB-23 idem=$C"
