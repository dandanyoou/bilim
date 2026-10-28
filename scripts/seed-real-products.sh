#!/bin/bash
# 사용자가 채팅에 붙여넣은 실제 상품 사진 8종을 bilim_dev에 시드한다.
# 사진 1장짜리 상품은 item_photos UNIQUE(storage_key) 제약을 만족시키려고
# 같은 원본을 4개의 서로 다른 파일로 복제해 4장처럼 채운다(SHORTCUT: 시드 전용,
# 실제 사용자 등록은 /items/new에서 여전히 진짜 4장을 요구한다).
set -euo pipefail

SRC_DIR="/var/folders/hv/m57y6kfx6s1fn6qp2yy5zqqr0000gn/T"
UPLOAD_DIR="/Users/test/bilim/public/uploads/items"
OWNER_ID="51bc4a15-f08a-4aa1-8a7b-3a14f19e9be5" # owner@korea.ac.kr(빌려주는사람)
mkdir -p "$UPLOAD_DIR"

insert_item() {
  local src="$1" category="$2" title="$3" description="$4" daily="$5" deposit="$6" buyout="$7" pickup="$8"

  local item_id
  item_id=$(psql -d bilim_dev -q -t -A -c "
    INSERT INTO items (owner_id, category, title, description, daily_fee, deposit, buyout_price, pickup_place, status)
    VALUES ('$OWNER_ID', '$category', '$title', '$description', $daily, $deposit, $buyout, '$pickup', 'listed')
    RETURNING id")

  for pos in 1 2 3 4; do
    local key="items/$(uuidgen).jpg"
    cp "$src" "$UPLOAD_DIR/$(basename "$key")"
    psql -d bilim_dev -t -A -c "
      INSERT INTO item_photos (item_id, storage_key, position) VALUES ('$item_id', '$key', $pos)" > /dev/null
  done

  echo "등록: $title ($item_id)"
}

insert_item "$SRC_DIR/orca-paste-1793184896044-8303d1a4-dcdd-468d-a8ae-5c20423669c4.png" \
  event_clothing "스트라이프 반팔 셔츠" "거의 새 것, 행사·소개팅룩으로 좋아요." \
  5000 0 40000 "정문 앞"

insert_item "$SRC_DIR/orca-paste-1793184905384-250f2575-6783-4745-b609-7a230228cfea.png" \
  event_clothing "LEGACY 그래픽 스웨트셔츠" "두껍지 않아 사계절 레이어드하기 좋아요." \
  6000 0 50000 "기숙사 정문"

insert_item "$SRC_DIR/orca-paste-1793184914205-bf30a1d3-8271-4855-9d0c-6fda5c42e577.png" \
  event_clothing "Lost in the Stars 블루 후드집업" "포인트 프린트가 있는 블루 후드예요." \
  7000 0 60000 "중앙도서관 앞"

insert_item "$SRC_DIR/orca-paste-1793184926558-0a74519a-1ed3-4e12-964b-95e2a75db40c.png" \
  event_clothing "차콜 그래픽 후드티" "무난한 차콜톤, 과잠 안에 받쳐입기 좋아요." \
  6000 0 50000 "정문 앞"

insert_item "$SRC_DIR/orca-paste-1793184991172-9a014ccc-c228-4708-a5d2-4f94e129d922.png" \
  electronics "캐논 24-70mm 렌즈 풀프레임 카메라" "행사·졸업사진 촬영용 고급기입니다. 렌즈 포함." \
  25000 200000 1500000 "정문 앞"

insert_item "$SRC_DIR/orca-paste-1793184997247-3249d32b-69a1-4870-a2c1-1e8f44732e4a.png" \
  electronics "캐논 EOS 700D + 18-55mm 키트" "입문용으로 가볍고 다루기 쉬워요." \
  15000 100000 400000 "후문 편의점 앞"

insert_item "$SRC_DIR/orca-paste-1793185003146-4998fb30-5473-459b-b823-7147e5ff48dd.png" \
  electronics "캐논 EOS Rebel T6 풀박스 키트" "박스·충전기·렌즈캡까지 풀구성이에요." \
  12000 80000 300000 "정문 앞"

insert_item "$SRC_DIR/orca-paste-1793184954943-152a9733-c9c9-4e53-a6c6-2f6515769b79.png" \
  electronics "PS5 Pro 본체" "미개봉급, 단기로 게임 몰아할 때 좋아요." \
  15000 150000 800000 "기숙사 정문"

insert_item "$SRC_DIR/orca-paste-1793184944881-bbde8133-40b7-47b0-842e-19469c27c2cf.png" \
  electronics "전자기기 모음 박스 A(헤드폰·공유기·스마트워치 등)" "여러 소형 전자기기를 한 번에 빌려드려요. 구성품은 사진 참고." \
  10000 50000 300000 "중앙도서관 앞"

insert_item "$SRC_DIR/orca-paste-1793184962256-9cb7dbd1-4537-44fd-85c0-4fe791317bad.png" \
  electronics "전자기기 모음 박스 B(마우스·PS5 타이틀·밴드 등)" "여러 소형 전자기기를 한 번에 빌려드려요. 구성품은 사진 참고." \
  8000 30000 150000 "후문 편의점 앞"

echo "완료"
