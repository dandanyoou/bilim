import { Pool } from "pg";

// Vitest 스위트가 실행 중인 서버(= bilim_dev, 사람이 보고 있는 그 DB)에 실제 HTTP로
// 데이터를 만들기 때문에, 시험이 끝나면 만든 걸 전부 지워야 한다. 안 그러면 "테스트
// 물품"이 실제 상점 목록에 계속 남는다 — 한 번 이 문제로 사용자가 직접 겪었다.
const TEST_EMAIL_PATTERN = "^(owner|renter|renterb)-[0-9]+-[a-z0-9]+@korea\\.ac\\.kr$";
const TEST_ITEM_TITLE_PATTERN = "테스트 물품%";

export async function cleanupTestData(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query("BEGIN");
    await pool.query(`
      CREATE TEMP TABLE _test_users AS
        SELECT id FROM users WHERE school_email ~ $1
    `, [TEST_EMAIL_PATTERN]);
    await pool.query(`
      CREATE TEMP TABLE _test_items AS
        SELECT id FROM items WHERE title LIKE $1
    `, [TEST_ITEM_TITLE_PATTERN]);
    await pool.query(`
      CREATE TEMP TABLE _test_rentals AS
        SELECT id FROM rentals WHERE item_id IN (SELECT id FROM _test_items)
    `);

    await pool.query(`DELETE FROM reviews WHERE rental_id IN (SELECT id FROM _test_rentals)`);
    await pool.query(`DELETE FROM payouts WHERE rental_id IN (SELECT id FROM _test_rentals)`);
    await pool.query(
      `DELETE FROM claim_decisions WHERE claim_id IN (SELECT id FROM claims WHERE rental_id IN (SELECT id FROM _test_rentals))`
    );
    await pool.query(`DELETE FROM buyouts WHERE rental_id IN (SELECT id FROM _test_rentals)`);
    await pool.query(`DELETE FROM claims WHERE rental_id IN (SELECT id FROM _test_rentals)`);
    await pool.query(
      `DELETE FROM check_photos WHERE check_id IN (SELECT id FROM handover_checks WHERE rental_id IN (SELECT id FROM _test_rentals))`
    );
    await pool.query(`DELETE FROM handover_checks WHERE rental_id IN (SELECT id FROM _test_rentals)`);
    await pool.query(`DELETE FROM payments WHERE rental_id IN (SELECT id FROM _test_rentals)`);
    await pool.query(`DELETE FROM rental_events WHERE rental_id IN (SELECT id FROM _test_rentals)`);
    await pool.query(`DELETE FROM rentals WHERE id IN (SELECT id FROM _test_rentals)`);
    await pool.query(`DELETE FROM item_photos WHERE item_id IN (SELECT id FROM _test_items)`);
    await pool.query(`DELETE FROM items WHERE id IN (SELECT id FROM _test_items)`);
    await pool.query(`DELETE FROM idempotency_keys WHERE user_id IN (SELECT id FROM _test_users)`);
    await pool.query(
      `DELETE FROM email_codes WHERE email IN (SELECT school_email FROM users WHERE id IN (SELECT id FROM _test_users))`
    );
    await pool.query(`DELETE FROM users WHERE id IN (SELECT id FROM _test_users)`);
    await pool.query("COMMIT");
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  } finally {
    await pool.end();
  }
}
