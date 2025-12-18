/**
 * Database Setup Test
 * Verifies that the database integration test infrastructure works
 */

import { createSharedDatabaseHelper } from '../helpers/databaseTestHelper';

describe('Database Integration Test Setup', () => {
  const dbHelper = createSharedDatabaseHelper();

  it('should start PostgreSQL container and run migrations', async () => {
    const pool = dbHelper.getPool();

    // Verify we can connect and query
    const result = await pool.query('SELECT 1 as test');
    expect(result.rows[0].test).toBe(1);
  });

  it('should have all required tables from migrations', async () => {
    const pool = dbHelper.getPool();

    // Check that all expected tables exist
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    const tableNames = result.rows.map((row) => row.table_name);

    expect(tableNames).toContain('schema_migrations');
    expect(tableNames).toContain('games');
    expect(tableNames).toContain('player_identities');
    expect(tableNames).toContain('player_profiles');
    expect(tableNames).toContain('game_invitations');
    expect(tableNames).toContain('turn_notifications');
  });

  it('should have correct games table schema', async () => {
    const pool = dbHelper.getPool();

    // Verify games table has expected columns
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'games' 
      ORDER BY column_name
    `);

    const columns = result.rows.reduce((acc, row) => {
      acc[row.column_name] = {
        type: row.data_type,
        nullable: row.is_nullable === 'YES',
      };
      return acc;
    }, {});

    expect(columns.game_id).toEqual({ type: 'character varying', nullable: false });
    expect(columns.game_type).toEqual({ type: 'character varying', nullable: false });
    expect(columns.lifecycle).toEqual({ type: 'character varying', nullable: false });
    expect(columns.winner).toEqual({ type: 'character varying', nullable: true });
    expect(columns.state).toEqual({ type: 'jsonb', nullable: false });
    expect(columns.version).toEqual({ type: 'integer', nullable: false });
    expect(columns.created_at).toEqual({ type: 'timestamp without time zone', nullable: false });
    expect(columns.updated_at).toEqual({ type: 'timestamp without time zone', nullable: false });
  });

  it('should cleanup data between tests', async () => {
    const pool = dbHelper.getPool();

    // Insert some test data
    await pool.query(`
      INSERT INTO player_profiles (user_id, display_name) 
      VALUES ('test_user', 'Test User')
    `);

    // Verify data exists
    const result = await pool.query('SELECT COUNT(*) as count FROM player_profiles');
    expect(parseInt(result.rows[0].count)).toBe(1);

    // The afterEach cleanup should remove this data
    // This will be verified by the next test not seeing this data
  });

  it('should have clean tables after previous test cleanup', async () => {
    const pool = dbHelper.getPool();

    // Verify all tables are empty
    const result = await pool.query('SELECT COUNT(*) as count FROM player_profiles');
    expect(parseInt(result.rows[0].count)).toBe(0);
  });
});
