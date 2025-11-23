/**
 * Database connection utility with connection pooling
 */

import { Pool, PoolConfig, PoolClient } from 'pg';
import { getLogger } from '../logging/Logger';

export interface DatabaseConnectionConfig {
  connectionString: string;
  poolSize: number;
}

export class DatabaseConnection {
  private pool: Pool;
  private isConnected: boolean = false;

  constructor(config: DatabaseConnectionConfig) {
    const poolConfig: PoolConfig = {
      connectionString: config.connectionString,
      max: config.poolSize,
      idleTimeoutMillis: 10000, // 10 seconds
      connectionTimeoutMillis: 30000, // 30 seconds
    };

    this.pool = new Pool(poolConfig);

    // Set up error handler for the pool
    this.pool.on('error', (err) => {
      const logger = getLogger();
      logger.error('Unexpected error on idle database client', {
        error: err.message,
        stack: err.stack,
      });
    });
  }

  /**
   * Establishes connection to the database with retry logic
   * @param maxRetries Maximum number of connection attempts
   * @param retryDelay Initial delay between retries in milliseconds
   * @throws Error if connection fails after all retries
   */
  async connect(maxRetries: number = 5, retryDelay: number = 1000): Promise<void> {
    const logger = getLogger();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info('Attempting database connection', {
          attempt,
          maxRetries,
        });

        // Test the connection
        const client = await this.pool.connect();
        await client.query('SELECT 1');
        client.release();

        this.isConnected = true;
        logger.info('Database connection established successfully');
        return;
      } catch (error) {
        lastError = error as Error;
        logger.error('Database connection attempt failed', {
          attempt,
          maxRetries,
          error: lastError.message,
        });

        if (attempt < maxRetries) {
          const delay = retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          logger.info('Retrying database connection', { delayMs: delay });
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    const errorMessage = `Failed to connect to database after ${maxRetries} attempts: ${lastError?.message}`;
    logger.error('Database connection failed after all retries', {
      maxRetries,
      error: lastError?.message,
    });
    throw new Error(errorMessage);
  }

  /**
   * Performs a health check on the database connection
   * @returns true if database is healthy, false otherwise
   */
  async healthCheck(): Promise<boolean> {
    const logger = getLogger();

    if (!this.isConnected) {
      logger.warn('Database health check failed: not connected');
      return false;
    }

    try {
      const client = await this.pool.connect();
      const startTime = Date.now();
      await client.query('SELECT 1');
      const responseTime = Date.now() - startTime;
      client.release();

      logger.debug('Database health check passed', { responseTimeMs: responseTime });
      return true;
    } catch (error) {
      logger.error('Database health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Gets a client from the connection pool
   * @returns A database client
   */
  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  /**
   * Executes a query using the connection pool
   * @param text SQL query text
   * @param params Query parameters
   * @returns Query result
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async query(text: string, params?: any[]) {
    return this.pool.query(text, params);
  }

  /**
   * Gets the underlying pool instance
   * @returns The pg Pool instance
   */
  getPool(): Pool {
    return this.pool;
  }

  /**
   * Closes all connections in the pool
   */
  async close(): Promise<void> {
    const logger = getLogger();
    logger.info('Closing database connections');
    await this.pool.end();
    this.isConnected = false;
    logger.info('Database connections closed');
  }

  /**
   * Checks if the database is connected
   */
  isHealthy(): boolean {
    return this.isConnected;
  }

  /**
   * Helper method to sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
