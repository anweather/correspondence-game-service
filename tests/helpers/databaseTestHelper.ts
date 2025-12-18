/**
 * Database Test Helper
 * Provides utilities for setting up and tearing down test databases
 * Uses testcontainers to spin up real PostgreSQL instances
 */

import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { DatabaseMigrator } from '@infrastructure/persistence/DatabaseMigrator';
import path from 'path';

export class DatabaseTestHelper {
  private container: StartedPostgreSqlContainer | null = null;
  private pool: Pool | null = null;

  /**
   * Start a PostgreSQL container and run migrations
   */
  async setup(): Promise<{ connectionString: string; pool: Pool }> {
    // Start PostgreSQL container
    console.log('Starting PostgreSQL container...');
    this.container = await new PostgreSqlContainer('postgres:16-alpine')
      .withExposedPorts(5432)
      .withStartupTimeout(120000) // 2 minutes
      .start();

    const connectionString = this.container.getConnectionUri();
    console.log('PostgreSQL container started');

    // Create connection pool
    this.pool = new Pool({
      connectionString,
      max: 10,
    });

    // Run migrations
    console.log('Running database migrations...');
    const migrationsDir = path.join(__dirname, '../../src/infrastructure/persistence/migrations');
    const migrator = new DatabaseMigrator(this.pool, migrationsDir);
    await migrator.applyMigrations();
    console.log('Migrations completed');

    return { connectionString, pool: this.pool };
  }

  /**
   * Clean up all data from tables (but keep schema)
   */
  async cleanup(): Promise<void> {
    if (!this.pool) return;

    await this.pool.query('TRUNCATE TABLE turn_notifications CASCADE');
    await this.pool.query('TRUNCATE TABLE game_invitations CASCADE');
    await this.pool.query('TRUNCATE TABLE games CASCADE');
    await this.pool.query('TRUNCATE TABLE player_profiles CASCADE');
    await this.pool.query('TRUNCATE TABLE player_identities CASCADE');
  }

  /**
   * Tear down the database and container
   */
  async teardown(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }

    if (this.container) {
      console.log('Stopping PostgreSQL container...');
      await this.container.stop();
      this.container = null;
      console.log('PostgreSQL container stopped');
    }
  }

  /**
   * Get the current pool (for direct queries in tests)
   */
  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database not set up. Call setup() first.');
    }
    return this.pool;
  }
}

/**
 * Create a shared database helper for test suites
 * Use this in describe blocks with beforeAll/afterAll
 */
export function createSharedDatabaseHelper() {
  const helper = new DatabaseTestHelper();
  let connectionString: string;
  let pool: Pool;

  beforeAll(async () => {
    const setup = await helper.setup();
    connectionString = setup.connectionString;
    pool = setup.pool;
  }, 120000); // 2 minute timeout for container startup

  afterAll(async () => {
    await helper.teardown();
  }, 30000); // 30 second timeout for cleanup

  afterEach(async () => {
    await helper.cleanup();
  });

  return {
    getConnectionString: () => connectionString,
    getPool: () => pool,
  };
}
