-- 0002_app_additions.sql
-- SSAD DB 계약 시험(schema.sql) 범위 밖, 웹 앱 구현에 필요한 추가 테이블.
-- 0001_schema.sql(= 원본 빌림_schema.sql, 수정 금지)에는 손대지 않고 여기에만 추가한다.
-- 세션은 jose로 서명한 상태 비저장(stateless) JWT 쿠키를 쓰므로 별도 세션 테이블은 두지 않는다.

-- 학교 이메일 인증 코드. 코드는 평문으로 저장하지 않고 sha256 해시만 저장한다(AC-01-1, AC-01-2).
CREATE TABLE email_codes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email        text NOT NULL CHECK (email = lower(email)),
  code_hash    text NOT NULL,
  attempts     smallint NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  locked_at    timestamptz,
  consumed_at  timestamptz,
  expires_at   timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
-- 이메일당 시간당 발송 횟수 제한(SEC-08) 조회용.
CREATE INDEX email_codes_email_created_idx ON email_codes (email, created_at DESC);
