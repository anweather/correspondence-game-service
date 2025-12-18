/**
 * Configuration service that loads and validates environment variables
 */

export interface DatabaseConfig {
  url: string | null;
  poolSize: number;
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'pretty';
}

export interface AuthConfig {
  enabled: boolean;
  clerk: {
    publishableKey: string;
    secretKey: string;
  };
}

export interface AppConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  database: DatabaseConfig;
  logging: LoggingConfig;
  auth: AuthConfig;
  adminUserIds: string[];
}

class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Loads and validates environment variables
 * @throws {ConfigurationError} If required environment variables are missing or invalid
 */
export function loadConfig(): AppConfig {
  // Validate and load PORT
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new ConfigurationError(
      `Invalid PORT: ${process.env.PORT}. Must be a number between 1 and 65535.`
    );
  }

  // Validate and load NODE_ENV
  const nodeEnv = (process.env.NODE_ENV || 'development') as AppConfig['nodeEnv'];
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    throw new ConfigurationError(
      `Invalid NODE_ENV: ${process.env.NODE_ENV}. Must be 'development', 'production', or 'test'.`
    );
  }

  // Validate and load DATABASE_URL (optional - falls back to in-memory storage)
  const databaseUrl = process.env.DATABASE_URL || null;

  // Validate DATABASE_URL format if provided (basic check)
  if (
    databaseUrl &&
    !databaseUrl.startsWith('postgresql://') &&
    !databaseUrl.startsWith('postgres://')
  ) {
    throw new ConfigurationError(
      `Invalid DATABASE_URL format: ${databaseUrl}. Must start with 'postgresql://' or 'postgres://'.`
    );
  }

  // Validate and load DB_POOL_SIZE
  const poolSize = process.env.DB_POOL_SIZE ? parseInt(process.env.DB_POOL_SIZE, 10) : 10;
  if (isNaN(poolSize) || poolSize < 1 || poolSize > 100) {
    throw new ConfigurationError(
      `Invalid DB_POOL_SIZE: ${process.env.DB_POOL_SIZE}. Must be a number between 1 and 100.`
    );
  }

  // Validate and load LOG_LEVEL
  const logLevel = (process.env.LOG_LEVEL || 'info') as LoggingConfig['level'];
  if (!['debug', 'info', 'warn', 'error'].includes(logLevel)) {
    throw new ConfigurationError(
      `Invalid LOG_LEVEL: ${process.env.LOG_LEVEL}. Must be 'debug', 'info', 'warn', or 'error'.`
    );
  }

  // Determine log format based on NODE_ENV
  const logFormat: LoggingConfig['format'] = nodeEnv === 'production' ? 'json' : 'pretty';

  // Validate and load authentication configuration
  const authEnabled = process.env.AUTH_ENABLED === 'true';
  const clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY || '';
  const clerkSecretKey = process.env.CLERK_SECRET_KEY || '';

  // Validate Clerk keys when authentication is enabled
  if (authEnabled) {
    if (!clerkPublishableKey) {
      throw new ConfigurationError('CLERK_PUBLISHABLE_KEY is required when AUTH_ENABLED is true');
    }
    if (!clerkSecretKey) {
      throw new ConfigurationError('CLERK_SECRET_KEY is required when AUTH_ENABLED is true');
    }
  }

  // Load admin user IDs from environment variable
  const adminUserIdsString = process.env.ADMIN_USER_IDS || '';
  const adminUserIds = adminUserIdsString
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

  return {
    port,
    nodeEnv,
    database: {
      url: databaseUrl,
      poolSize,
    },
    logging: {
      level: logLevel,
      format: logFormat,
    },
    auth: {
      enabled: authEnabled,
      clerk: {
        publishableKey: clerkPublishableKey,
        secretKey: clerkSecretKey,
      },
    },
    adminUserIds,
  };
}

/**
 * Validates configuration at startup
 * Logs configuration (excluding sensitive data) and fails fast if invalid
 */
export function validateAndLogConfig(): AppConfig {
  try {
    const config = loadConfig();

    // Configuration loaded successfully

    return config;
  } catch (error) {
    if (error instanceof ConfigurationError) {
      console.error('Configuration Error:', error.message);
      console.error('\nPlease check your environment variables and try again.');
      process.exit(1);
    }
    throw error;
  }
}
