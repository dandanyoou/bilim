# sql/

- `schema.sql` — `빌림_schema.sql` 원본을 그대로 복사한 파일. **수정 금지.** SSAD 3.3절 데이터 계약이고, `tests.sql`/`concurrency.sh`로 31/31건 통과가 증명된 버전 그대로다.
- `tests.sql`, `concurrency.sh`, `run_all.sh` — 원본 DB 계약 시험 하네스. 역시 그대로 복사, 수정 금지.
- `0002_app_additions.sql` — 웹 앱 구현에만 필요한 추가 테이블(`email_codes`). SSAD DB 계약 시험 범위 밖이라 `schema.sql`과 분리했다.

## 알아둘 것: `run_all.sh`와 개발용 DB(`bilim_dev`)를 같은 클러스터에서 같이 못 돌린다

`schema.sql`은 `app_rw`/`retention_job` 롤을 **클러스터 전역**으로 `CREATE ROLE`한다. `run_all.sh`는 매번 이 롤을 드롭 후 재생성하면서 `rent` DB를 처음부터 다시 만드는 식으로 동작하는데, 같은 클러스터에 `bilim_dev`가 이미 이 롤에 의존(GRANT)하고 있으면 롤 드롭이 실패하고 `run_all.sh`가 중간에 멈춘다.

그래서 `run_all.sh`로 DB 계약을 다시 통째로 검증하고 싶으면:
```bash
dropdb --if-exists bilim_dev
PGPORT=5432 PGUSER=<내 역할> PGDATABASE=postgres bash run_all.sh   # rent DB로 31/31 확인
dropdb --if-exists rent
psql -d postgres -c "drop role if exists app_rw"
psql -d postgres -c "drop role if exists retention_job"
# 그 다음 bilim_dev를 schema.sql + 0002_app_additions.sql로 다시 세팅
```
CI에서는 매번 새 컨테이너에서 돌리므로 이 충돌이 아예 발생하지 않는다(SSAD 4.5절 전제와 동일). 로컬 공유 클러스터에서만 생기는 제약이다.
