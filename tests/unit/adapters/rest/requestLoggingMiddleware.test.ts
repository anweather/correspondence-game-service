/**
 * Tests for requestLoggingMiddleware
 */

import { Request, Response, NextFunction } from 'express';
import { requestLoggingMiddleware } from '../../../../src/adapters/rest/requestLoggingMiddleware';
import { initializeLogger, getLogger } from '../../../../src/infrastructure/logging/Logger';

describe('requestLoggingMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let loggerInfoSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    // Initialize logger for tests
    initializeLogger('info', 'json');
    const logger = getLogger();
    loggerInfoSpy = jest.spyOn(logger, 'info').mockImplementation();
    loggerWarnSpy = jest.spyOn(logger, 'warn').mockImplementation();

    mockRequest = {
      requestId: 'req-123',
      method: 'GET',
      path: '/api/games',
      query: {},
    };

    const eventHandlers: { [key: string]: () => void } = {};
    mockResponse = {
      statusCode: 200,
      on: jest.fn((event: string, handler: () => void) => {
        eventHandlers[event] = handler;
        return mockResponse as Response;
      }),
    };
    // Store event handlers for later triggering
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mockResponse as any)._eventHandlers = eventHandlers;

    mockNext = jest.fn();
  });

  afterEach(() => {
    loggerInfoSpy.mockRestore();
    loggerWarnSpy.mockRestore();
  });

  it('should log request start', () => {
    requestLoggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(loggerInfoSpy).toHaveBeenCalledWith('HTTP request started', {
      requestId: 'req-123',
      method: 'GET',
      path: '/api/games',
      query: {},
    });
    expect(mockNext).toHaveBeenCalled();
  });

  it('should log successful request completion', () => {
    requestLoggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    // Trigger the finish event
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finishHandler = (mockResponse as any)._eventHandlers['finish'];
    finishHandler();

    expect(loggerInfoSpy).toHaveBeenCalledTimes(2); // start + completion
    const completionCall = loggerInfoSpy.mock.calls[1];
    expect(completionCall[0]).toBe('HTTP request completed');
    expect(completionCall[1]).toMatchObject({
      requestId: 'req-123',
      method: 'GET',
      path: '/api/games',
      statusCode: 200,
    });
    expect(completionCall[1].duration).toBeGreaterThanOrEqual(0);
  });

  it('should log failed request with warn level', () => {
    mockResponse.statusCode = 404;
    requestLoggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    // Trigger the finish event
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finishHandler = (mockResponse as any)._eventHandlers['finish'];
    finishHandler();

    expect(loggerWarnSpy).toHaveBeenCalledTimes(1);
    const completionCall = loggerWarnSpy.mock.calls[0];
    expect(completionCall[0]).toBe('HTTP request completed');
    expect(completionCall[1]).toMatchObject({
      requestId: 'req-123',
      statusCode: 404,
    });
  });

  it('should log server error with warn level', () => {
    mockResponse.statusCode = 500;
    requestLoggingMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    // Trigger the finish event
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finishHandler = (mockResponse as any)._eventHandlers['finish'];
    finishHandler();

    expect(loggerWarnSpy).toHaveBeenCalledTimes(1);
    expect(loggerWarnSpy.mock.calls[0][1].statusCode).toBe(500);
  });
});
