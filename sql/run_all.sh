#!/bin/bash
# 스키마를 새로 만들고 계약 시험과 동시성 시험을 모두 실행합니다.
D=$(cd "$(dirname "$0")" && pwd)
P="psql -h ${PGHOST:-/tmp} -p ${PGPORT:-5544} -U ${PGUSER:-postgres} -v ON_ERROR_STOP=1 -q"
$P -c "drop database if exists rent" 2>/dev/null; $P -c "drop role if exists app_rw" ; $P -c "drop role if exists retention_job"; $P -c "create database rent"
$P -d rent -f $D/schema.sql >/dev/null && $P -d rent -f $D/tests.sql >/dev/null || exit 1
echo "실행 일시: $(TZ=Asia/Seoul date '+%Y-%m-%d %H:%M %Z')"
psql -h ${PGHOST:-/tmp} -p ${PGPORT:-5544} -U ${PGUSER:-postgres} -t -A -c "select version()"
echo
$P -d rent -c "select tc as \"시험\",result as \"결과\",title as \"내용\",actual as \"실제 응답\" from db_test_results order by tc"
echo "동시성 시험 (기대값: 각각 1)"
C=$($D/concurrency.sh); echo "$C"
F=$($P -d rent -t -A -c "select count(*) from db_test_results where result<>'PASS'")
F=$((F + $(echo "$C" | grep -vc '=1$')))
echo "FAIL 건수: $F"
[ "$F" -eq 0 ]
