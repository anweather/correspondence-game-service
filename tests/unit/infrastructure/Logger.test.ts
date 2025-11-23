/**
 * Tests for Logger
 */

import { Logger, initializeLogger, getLogger } from '../../../src/infrastructure/logging/Logger';

describe('Logger', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Log levels', () => {
    it('should log info messages when level is info', () => {
      const logger = new Logger('info', 'json');
      logger.info('test message');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(logOutput.level).toBe('info');
      expect(logOutput.message).toBe('test message');
    });

    it('should not log debug messages when level is info', () => {
      const logger = new Logger('info', 'json');
      logger.debug('test message');

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log debug messages when level is debug', () => {
      const logger = new Logger('debug', 'json');
      logger.debug('test message');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    });

    it('should log warn messages when level is info', () => {
      const logger = new Logger('info', 'json');
      logger.warn('test message');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(logOutput.level).toBe('warn');
    });

    it('should log error messages to console.error', () => {
      const logger = new Logger('info', 'json');
      logger.error('test message');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const logOutput = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(logOutput.level).toBe('error');
    });
  });

  describe('JSON format', () => {
    it('should output JSON format when configured', () => {
      const logger = new Logger('info', 'json');
      logger.info('test message', { key: 'value' });

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(logOutput.timestamp).toBeDefined();
      expect(logOutput.level).toBe('info');
      expect(logOutput.message).toBe('test message');
      expect(logOutput.context).toEqual({ key: 'value' });
    });

    it('should not include context when not provided', () => {
      const logger = new Logger('info', 'json');
      logger.info('test message');

      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(logOutput.context).toBeUndefined();
    });
  });

  describe('Pretty format', () => {
    it('should output pretty format when configured', () => {
      const logger = new Logger('info', 'pretty');
      logger.info('test message');

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain('INFO');
      expect(logOutput).toContain('test message');
      expect(logOutput).toMatch(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]/);
    });

    it('should include context in pretty format', () => {
      const logger = new Logger('info', 'pretty');
      logger.info('test message', { key: 'value' });

      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain('{"key":"value"}');
    });
  });

  describe('Child logger', () => {
    it('should include parent context in all log messages', () => {
      const logger = new Logger('info', 'json');
      const childLogger = logger.child({ requestId: 'req-123' });

      childLogger.info('test message');

      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(logOutput.context.requestId).toBe('req-123');
    });

    it('should merge additional context with parent context', () => {
      const logger = new Logger('info', 'json');
      const childLogger = logger.child({ requestId: 'req-123' });

      childLogger.info('test message', { userId: 'user-456' });

      const logOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(logOutput.context.requestId).toBe('req-123');
      expect(logOutput.context.userId).toBe('user-456');
    });
  });

  describe('Global logger instance', () => {
    it('should initialize and retrieve global logger', () => {
      const logger = initializeLogger('info', 'json');
      const retrievedLogger = getLogger();

      expect(retrievedLogger).toBe(logger);
    });

    it('should throw error when getting logger before initialization', () => {
      // Reset the singleton by creating a new module context
      jest.resetModules();
      const { getLogger: freshGetLogger } = require('../../../src/infrastructure/logging/Logger');

      expect(() => freshGetLogger()).toThrow(
        'Logger has not been initialized. Call initializeLogger() first.'
      );
    });
  });
});
