/**
 * Tests for requestIdMiddleware
 */

import { Request, Response, NextFunction } from 'express';
import { requestIdMiddleware } from '../../../../src/adapters/rest/requestIdMiddleware';

describe('requestIdMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      setHeader: jest.fn(),
    };
    mockNext = jest.fn();
  });

  it('should generate a request ID when not provided', () => {
    requestIdMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockRequest.requestId).toBeDefined();
    expect(mockRequest.requestId).toMatch(/^req-[a-f0-9]{16}$/);
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-Id', mockRequest.requestId);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should use provided request ID from headers', () => {
    mockRequest.headers = {
      'x-request-id': 'custom-req-id',
    };

    requestIdMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockRequest.requestId).toBe('custom-req-id');
    expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-Id', 'custom-req-id');
    expect(mockNext).toHaveBeenCalled();
  });

  it('should generate unique request IDs for different requests', () => {
    const mockRequest1: Partial<Request> = { headers: {} };
    const mockRequest2: Partial<Request> = { headers: {} };
    const mockResponse1: Partial<Response> = { setHeader: jest.fn() };
    const mockResponse2: Partial<Response> = { setHeader: jest.fn() };

    requestIdMiddleware(mockRequest1 as Request, mockResponse1 as Response, mockNext);
    requestIdMiddleware(mockRequest2 as Request, mockResponse2 as Response, mockNext);

    expect(mockRequest1.requestId).toBeDefined();
    expect(mockRequest2.requestId).toBeDefined();
    expect(mockRequest1.requestId).not.toBe(mockRequest2.requestId);
  });
});
