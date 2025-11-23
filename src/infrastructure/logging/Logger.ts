/**
 * Structured logging service
 * Supports JSON format for production and pretty format for development
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private minLevel: LogLevel;
  private format: 'json' | 'pretty';

  constructor(minLevel: LogLevel = 'info', format: 'json' | 'pretty' = 'json') {
    this.minLevel = minLevel;
    this.format = format;
  }

  /**
   * Checks if a log level should be logged based on minimum level
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
  }

  /**
   * Formats a log entry based on the configured format
   */
  private formatLog(entry: LogEntry): string {
    if (this.format === 'json') {
      return JSON.stringify(entry);
    }

    // Pretty format for development
    const timestamp = new Date(entry.timestamp).toISOString().replace('T', ' ').substring(0, 19);
    const level = entry.level.toUpperCase().padEnd(5);
    const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    return `[${timestamp}] ${level}: ${entry.message}${contextStr}`;
  }

  /**
   * Logs a message at the specified level
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && { context }),
    };

    const formatted = this.formatLog(entry);

    // Write to appropriate stream
    if (level === 'error') {
      console.error(formatted);
    } else {
      console.log(formatted);
    }
  }

  /**
   * Logs a debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * Logs an info message
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * Logs a warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * Logs an error message
   */
  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  /**
   * Creates a child logger with additional context
   */
  child(context: LogContext): ChildLogger {
    return new ChildLogger(this, context);
  }
}

/**
 * Child logger that includes additional context in all log messages
 */
export class ChildLogger {
  constructor(
    private parent: Logger,
    private context: LogContext
  ) {}

  debug(message: string, additionalContext?: LogContext): void {
    this.parent.debug(message, { ...this.context, ...additionalContext });
  }

  info(message: string, additionalContext?: LogContext): void {
    this.parent.info(message, { ...this.context, ...additionalContext });
  }

  warn(message: string, additionalContext?: LogContext): void {
    this.parent.warn(message, { ...this.context, ...additionalContext });
  }

  error(message: string, additionalContext?: LogContext): void {
    this.parent.error(message, { ...this.context, ...additionalContext });
  }
}

// Singleton logger instance
let loggerInstance: Logger | null = null;

/**
 * Initializes the global logger instance
 */
export function initializeLogger(minLevel: LogLevel, format: 'json' | 'pretty'): Logger {
  loggerInstance = new Logger(minLevel, format);
  return loggerInstance;
}

/**
 * Gets the global logger instance
 * @throws Error if logger has not been initialized
 */
export function getLogger(): Logger {
  if (!loggerInstance) {
    throw new Error('Logger has not been initialized. Call initializeLogger() first.');
  }
  return loggerInstance;
}
