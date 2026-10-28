-- 가칭 빌림: 개인 간 물품 대여 중개 서비스 데이터 모델 (PostgreSQL 15 이상)
-- SSAD 3.3 데이터 모델과 같은 내용입니다. 금액은 모두 원 단위 정수입니다.
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_email      text NOT NULL UNIQUE CHECK (school_email = lower(school_email) AND school_email LIKE '%@%'),
  school_verified_at timestamptz,
  display_name      text NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 20),
  role              text NOT NULL DEFAULT 'member' CHECK (role IN ('member','moderator','admin')),
  status            text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','withdrawn')),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid NOT NULL REFERENCES users(id),
  category      text NOT NULL CHECK (category IN ('electronics','camping_living','event_clothing','bicycle','scooter','space')),
  title         text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 80),
  description   text NOT NULL DEFAULT '' CHECK (char_length(description) <= 2000),
  daily_fee     integer NOT NULL CHECK (daily_fee BETWEEN 1000 AND 500000),
  deposit       integer NOT NULL CHECK (deposit BETWEEN 0 AND 3000000),
  buyout_price  integer NOT NULL CHECK (buyout_price BETWEEN 1000 AND 3000000),
  pickup_place  text NOT NULL CHECK (char_length(pickup_place) BETWEEN 2 AND 100),
  status        text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','listed','paused','removed','transferred')),
  version       integer NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (deposit <= buyout_price)
);

CREATE TABLE item_photos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  storage_key text NOT NULL UNIQUE,
  position    smallint NOT NULL CHECK (position BETWEEN 1 AND 10),
  UNIQUE (item_id, position)
);

-- 대여. 같은 물품의 활성 대여 기간은 겹칠 수 없습니다(INV-1).
CREATE TABLE rentals (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id                uuid NOT NULL REFERENCES items(id),
  owner_id               uuid NOT NULL REFERENCES users(id),
  renter_id              uuid NOT NULL REFERENCES users(id),
  period                 tstzrange NOT NULL,
  days                   integer NOT NULL CHECK (days BETWEEN 1 AND 14),
  daily_fee_snapshot     integer NOT NULL,
  rental_fee             integer NOT NULL,
  deposit_snapshot       integer NOT NULL,
  buyout_price_snapshot  integer NOT NULL,
  platform_fee           integer NOT NULL CHECK (platform_fee >= 0),
  status                 text NOT NULL DEFAULT 'REQUESTED' CHECK (status IN (
                           'REQUESTED','DECLINED','EXPIRED','ACCEPTED','PAID','CANCELED',
                           'IN_USE','OVERDUE','RETURNED','DISPUTED','BUYOUT_PENDING','CLOSED','BOUGHT_OUT')),
  version                integer NOT NULL DEFAULT 1,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CHECK (owner_id <> renter_id),
  CHECK (NOT isempty(period) AND lower(period) < upper(period)),
  CHECK (rental_fee = daily_fee_snapshot * days),
  CHECK (platform_fee <= rental_fee),
  EXCLUDE USING gist (item_id WITH =, period WITH &&)
    WHERE (status IN ('ACCEPTED','PAID','IN_USE','OVERDUE'))
);
CREATE INDEX rentals_renter_idx ON rentals (renter_id, created_at DESC);
CREATE INDEX rentals_owner_idx  ON rentals (owner_id, created_at DESC);

-- 상태 전이 기록. 모든 전이는 여기에 한 줄씩 남습니다.
CREATE TABLE rental_events (
  id          bigserial PRIMARY KEY,
  rental_id   uuid NOT NULL REFERENCES rentals(id),
  from_status text,
  to_status   text NOT NULL,
  actor_id    uuid,
  reason      text,
  at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id        uuid NOT NULL REFERENCES rentals(id),
  purpose          text NOT NULL CHECK (purpose IN ('rental_fee','deposit_hold','buyout','repair')),
  amount           integer NOT NULL CHECK (amount > 0),
  status           text NOT NULL DEFAULT 'PENDING' CHECK (status IN
                     ('PENDING','AUTHORIZED','UNKNOWN','FAILED','CAPTURED','VOIDED','REFUNDED')),
  pg_payment_key   text UNIQUE,
  idempotency_key  text NOT NULL UNIQUE,
  version          integer NOT NULL DEFAULT 1,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
-- 같은 대여·같은 목적의 살아 있는 결제는 하나만 둡니다(이중 청구 방지).
CREATE UNIQUE INDEX payments_one_live ON payments (rental_id, purpose)
  WHERE status IN ('PENDING','AUTHORIZED','UNKNOWN','CAPTURED');

-- 결제대행사 웹훅은 같은 이벤트가 여러 번 와도 한 번만 처리합니다.
CREATE TABLE pg_webhook_events (
  provider     text NOT NULL,
  event_id     text NOT NULL,
  payload      jsonb NOT NULL,
  received_at  timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  PRIMARY KEY (provider, event_id)
);

CREATE TABLE handover_checks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id     uuid NOT NULL REFERENCES rentals(id),
  kind          text NOT NULL CHECK (kind IN ('handover','return')),
  party         text NOT NULL CHECK (party IN ('owner','renter')),
  checklist     jsonb NOT NULL,
  confirmed_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rental_id, kind, party)
);

CREATE TABLE check_photos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id      uuid NOT NULL REFERENCES handover_checks(id),
  storage_key   text NOT NULL UNIQUE,
  sha256        text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  taken_at      timestamptz NOT NULL,
  delete_after  timestamptz NOT NULL
);

CREATE TABLE claims (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id    uuid NOT NULL REFERENCES rentals(id),
  opened_by    uuid NOT NULL REFERENCES users(id),
  reason       text NOT NULL CHECK (reason IN ('stain_odor','damage','missing_part','not_returned','lost','other')),
  description  text NOT NULL CHECK (char_length(description) BETWEEN 10 AND 1000),
  status       text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','DECIDED','WITHDRAWN')),
  opened_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX claims_one_open ON claims (rental_id) WHERE status = 'OPEN';

CREATE TABLE claim_decisions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id      uuid NOT NULL UNIQUE REFERENCES claims(id),
  moderator_id  uuid NOT NULL REFERENCES users(id),
  outcome       text NOT NULL CHECK (outcome IN ('no_fault','repair_charge','buyout')),
  amount        integer NOT NULL DEFAULT 0 CHECK (amount >= 0),
  reason        text NOT NULL CHECK (char_length(reason) >= 10),
  decided_at    timestamptz NOT NULL DEFAULT now(),
  CHECK ((outcome = 'no_fault') = (amount = 0))
);

-- 물품 인수(Buyout). 빌린 사람 동의나 운영자 결정 없이는 확정할 수 없습니다(INV-7).
CREATE TABLE buyouts (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id            uuid NOT NULL UNIQUE REFERENCES rentals(id),
  price                integer NOT NULL CHECK (price > 0),
  cause                text NOT NULL CHECK (cause IN ('damage','loss','overdue')),
  renter_consented_at  timestamptz,
  decision_id          uuid REFERENCES claim_decisions(id),
  status               text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','CONFIRMED','CANCELED')),
  CHECK (status <> 'CONFIRMED' OR renter_consented_at IS NOT NULL OR decision_id IS NOT NULL)
);

-- 정산. 대여 한 건당 한 번만 만들어집니다(INV-4).
CREATE TABLE payouts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id        uuid NOT NULL UNIQUE REFERENCES rentals(id),
  owner_id         uuid NOT NULL REFERENCES users(id),
  amount           integer NOT NULL CHECK (amount >= 0),
  status           text NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED','SENT','FAILED','UNKNOWN')),
  idempotency_key  text NOT NULL UNIQUE,
  scheduled_at     timestamptz NOT NULL DEFAULT now(),
  sent_at          timestamptz
);

CREATE TABLE reviews (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id  uuid NOT NULL REFERENCES rentals(id),
  author_id  uuid NOT NULL REFERENCES users(id),
  target_id  uuid NOT NULL REFERENCES users(id),
  rating     smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body       text NOT NULL DEFAULT '' CHECK (char_length(body) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rental_id, author_id),
  CHECK (author_id <> target_id)
);

-- 같은 멱등 키로 다시 온 요청은 저장된 응답을 돌려줍니다(INV-5).
CREATE TABLE idempotency_keys (
  user_id          uuid NOT NULL REFERENCES users(id),
  key              text NOT NULL CHECK (char_length(key) BETWEEN 16 AND 64),
  endpoint         text NOT NULL,
  request_hash     text NOT NULL,
  response_status  smallint,
  response_body    jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);

-- 알림·송금 같은 외부 부작용은 같은 트랜잭션에서 여기에 먼저 씁니다.
CREATE TABLE outbox (
  id            bigserial PRIMARY KEY,
  aggregate_id  uuid NOT NULL,
  event_type    text NOT NULL,
  payload       jsonb NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  published_at  timestamptz,
  attempts      integer NOT NULL DEFAULT 0
);
CREATE INDEX outbox_unpublished ON outbox (id) WHERE published_at IS NULL;

CREATE TABLE admin_actions (
  id         bigserial PRIMARY KEY,
  admin_id   uuid NOT NULL REFERENCES users(id),
  action     text NOT NULL,
  target_id  uuid NOT NULL,
  reason     text NOT NULL CHECK (char_length(reason) >= 10),
  at         timestamptz NOT NULL DEFAULT now()
);

-- 상태 전이 규칙(INV-8)과 전이 조건(INV-2, INV-3, INV-7)
CREATE TABLE rental_transitions (
  from_status text NOT NULL,
  to_status   text NOT NULL,
  PRIMARY KEY (from_status, to_status)
);
INSERT INTO rental_transitions VALUES
 ('REQUESTED','ACCEPTED'),('REQUESTED','DECLINED'),('REQUESTED','EXPIRED'),('REQUESTED','CANCELED'),
 ('ACCEPTED','PAID'),('ACCEPTED','EXPIRED'),('ACCEPTED','CANCELED'),
 ('PAID','IN_USE'),('PAID','CANCELED'),
 ('IN_USE','RETURNED'),('IN_USE','OVERDUE'),('IN_USE','BUYOUT_PENDING'),
 ('OVERDUE','RETURNED'),('OVERDUE','BUYOUT_PENDING'),
 ('RETURNED','CLOSED'),('RETURNED','DISPUTED'),
 ('DISPUTED','CLOSED'),('DISPUTED','BUYOUT_PENDING'),
 ('BUYOUT_PENDING','BOUGHT_OUT'),('BUYOUT_PENDING','CLOSED');

CREATE FUNCTION rentals_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'REQUESTED' THEN
      RAISE EXCEPTION 'E_STATE: new rental must start as REQUESTED' USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM rental_transitions WHERE from_status = OLD.status AND to_status = NEW.status) THEN
    RAISE EXCEPTION 'E_TRANSITION: % -> % is not allowed', OLD.status, NEW.status USING ERRCODE = 'P0001';
  END IF;
  IF NEW.status = 'PAID' AND NOT EXISTS (
       SELECT 1 FROM payments WHERE rental_id = NEW.id AND purpose = 'deposit_hold' AND status IN ('AUTHORIZED','CAPTURED'))
     AND NEW.deposit_snapshot > 0 THEN
    RAISE EXCEPTION 'E_DEPOSIT: deposit hold is not authorized' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.status = 'PAID' AND NOT EXISTS (
       SELECT 1 FROM payments WHERE rental_id = NEW.id AND purpose = 'rental_fee' AND status IN ('AUTHORIZED','CAPTURED')) THEN
    RAISE EXCEPTION 'E_PAYMENT: rental fee is not authorized' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.status = 'IN_USE' AND (SELECT count(*) FROM handover_checks WHERE rental_id = NEW.id AND kind = 'handover') < 2 THEN
    RAISE EXCEPTION 'E_HANDOVER: both parties must confirm the handover checklist' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.status = 'BOUGHT_OUT' AND NOT EXISTS (
       SELECT 1 FROM buyouts WHERE rental_id = NEW.id AND status = 'CONFIRMED') THEN
    RAISE EXCEPTION 'E_BUYOUT: buyout is not confirmed' USING ERRCODE = 'P0001';
  END IF;
  NEW.version := OLD.version + 1;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER rentals_guard BEFORE INSERT OR UPDATE ON rentals FOR EACH ROW EXECUTE FUNCTION rentals_guard();

CREATE FUNCTION rentals_log() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO rental_events (rental_id, from_status, to_status) VALUES (NEW.id, NULL, NEW.status);
  ELSIF NEW.status <> OLD.status THEN
    INSERT INTO rental_events (rental_id, from_status, to_status) VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER rentals_log AFTER INSERT OR UPDATE ON rentals FOR EACH ROW EXECUTE FUNCTION rentals_log();

-- 분쟁 보관 기간 전에는 검수 사진을 지울 수 없습니다(INV-9).
CREATE FUNCTION check_photos_keep() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.delete_after > now() THEN
    RAISE EXCEPTION 'E_RETENTION: photo is under retention until %', OLD.delete_after USING ERRCODE = 'P0001';
  END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER check_photos_keep BEFORE DELETE ON check_photos FOR EACH ROW EXECUTE FUNCTION check_photos_keep();

-- 운영 계정 권한: 앱 계정은 상태 기록과 감사 기록을 고치거나 지울 수 없습니다.
CREATE ROLE app_rw NOLOGIN;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_rw;
REVOKE UPDATE ON rental_events, admin_actions FROM app_rw;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_rw;
-- 앱 계정에는 DELETE 권한이 없습니다. 보관 기간이 끝난 사진은 별도 작업 계정만 지웁니다.
CREATE ROLE retention_job NOLOGIN;
GRANT SELECT, DELETE ON check_photos TO retention_job;
