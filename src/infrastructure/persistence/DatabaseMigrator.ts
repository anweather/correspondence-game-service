/**
 * Database migration manager
 * Applies SQL migration scripts in order and tracks applied migrations
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

export class DatabaseMigrator {
  private pool: Pool;
  private migrationsDir: string;

  constructor(pool: Pool, migrationsDir?: string) {
    this.pool = pool;
    this.migrationsDir = migrationsDir || path.join(__dirname, 'migrations');
  }

  /**
   * Applies all pending migrations in order
   * @throws Error if any migration fails
   */
  async applyMigrations(): Promise<void> {
    console.log('Starting database migrations...');

    try {
      // Ensure schema_migrations table exists
      await this.ensureMigrationsTable();

      // Get list of migration files
      const migrationFiles = this.getMigrationFiles();

      if (migrationFiles.length === 0) {
        console.log('No migration files found');
        return;
      }

      // Apply each migration in order
      for (const file of migrationFiles) {
        const version = this.extractVersion(file);
        const isApplied = await this.isMigrationApplied(version);

        if (isApplied) {
          console.log(`Migration ${version} already applied, skipping`);
          continue;
        }

        console.log(`Applying migration ${version}: ${file}`);
        await this.applyMigration(file, version);
        console.log(`Migration ${version} applied successfully`);
      }

      console.log('All migrations completed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Gets the current database schema version
   * @returns The highest applied migration version, or 0 if none applied
   */
  async getCurrentVersion(): Promise<number> {
    try {
      const result = await this.pool.query('SELECT MAX(version) as version FROM schema_migrations');
      return result.rows[0]?.version || 0;
    } catch (error) {
      // Table might not exist yet
      return 0;
    }
  }

  /**
   * Checks if a specific migration has been applied
   * @param version Migration version number
   * @returns true if migration is applied, false otherwise
   */
  async isMigrationApplied(version: number): Promise<boolean> {
    try {
      const result = await this.pool.query(
        'SELECT version FROM schema_migrations WHERE version = $1',
        [version]
      );
      return result.rows.length > 0;
    } catch (error) {
      // Table might not exist yet
      return false;
    }
  }

  /**
   * Ensures the schema_migrations table exists
   * This is needed for the first migration
   */
  private async ensureMigrationsTable(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;

    await this.pool.query(createTableSQL);
  }

  /**
   * Gets list of migration files sorted by version
   * @returns Array of migration filenames
   */
  private getMigrationFiles(): string[] {
    if (!fs.existsSync(this.migrationsDir)) {
      console.warn(`Migrations directory not found: ${this.migrationsDir}`);
      return [];
    }

    const files = fs.readdirSync(this.migrationsDir);
    const sqlFiles = files.filter((f) => f.endsWith('.sql'));

    // Sort by version number
    return sqlFiles.sort((a, b) => {
      const versionA = this.extractVersion(a);
      const versionB = this.extractVersion(b);
      return versionA - versionB;
    });
  }

  /**
   * Extracts version number from migration filename
   * Expected format: 001_description.sql
   * @param filename Migration filename
   * @returns Version number
   */
  private extractVersion(filename: string): number {
    const match = filename.match(/^(\d+)_/);
    if (!match) {
      throw new Error(`Invalid migration filename format: ${filename}`);
    }
    return parseInt(match[1], 10);
  }

  /**
   * Applies a single migration file
   * @param filename Migration filename
   * @param version Migration version number
   */
  private async applyMigration(filename: string, version: number): Promise<void> {
    const filePath = path.join(this.migrationsDir, filename);
    const sql = fs.readFileSync(filePath, 'utf-8');

    // Execute migration in a transaction
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Split SQL by semicolons and execute each statement
      // Note: This is a simple approach; for complex migrations, consider a more robust parser
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        // Skip the migration tracking insert as we'll do it separately
        if (statement.includes('INSERT INTO schema_migrations')) {
          continue;
        }
        await client.query(statement);
      }

      // Record migration as applied
      await client.query(
        'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING',
        [version]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
