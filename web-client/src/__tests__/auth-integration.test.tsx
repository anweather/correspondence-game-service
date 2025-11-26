import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameClient } from '../api/gameClient';

describe('Web Client Auth Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Clerk Provider Setup', () => {
    it('should require VITE_CLERK_PUBLISHABLE_KEY environment variable', () => {
      // This test verifies that the environment variable is expected
      // In main.tsx, we check for VITE_CLERK_PUBLISHABLE_KEY
      const envKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
      
      // In test environment, this might not be set, but the code should handle it
      // The actual validation happens at runtime in main.tsx
      expect(typeof envKey).toBe('string');
    });
  });

  describe('Authenticated API Requests', () => {
    it('should include Clerk token in Authorization header when authenticated', async () => {
      const mockToken = 'mock_clerk_token_123';
      const mockGetToken = vi.fn().mockResolvedValue(mockToken);

      // Create a GameClient with the mock getToken function
      const client = new GameClient('/api', mockGetToken);

      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ items: [], total: 0, page: 1, pageSize: 10 }),
      });

      // Make a request
      await client.listGames();

      // Verify fetch was called with Authorization header
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/games',
        expect.objectContaining({
          headers: expect.any(Headers),
        })
      );

      // Get the headers from the call
      const callArgs = (global.fetch as any).mock.calls[0];
      const headers = callArgs[1].headers as Headers;
      expect(headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
    });

    it('should not include Authorization header when not authenticated', async () => {
      const mockGetToken = vi.fn().mockResolvedValue(null);

      // Create a GameClient with the mock getToken function
      const client = new GameClient('/api', mockGetToken);

      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ items: [], total: 0, page: 1, pageSize: 10 }),
      });

      // Make a request
      await client.listGames();

      // Verify fetch was called without Authorization header
      const callArgs = (global.fetch as any).mock.calls[0];
      const headers = callArgs[1].headers as Headers;
      expect(headers.get('Authorization')).toBeNull();
    });

    it('should handle token expiration gracefully', async () => {
      const mockGetToken = vi.fn().mockResolvedValue('expired_token');

      // Create a GameClient with the mock getToken function
      const client = new GameClient('/api', mockGetToken);

      // Mock fetch to return 401 Unauthorized
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: { message: 'Authentication token expired' } }),
      });

      // Make a request and expect it to throw
      await expect(client.listGames()).rejects.toThrow('Authentication token expired');
    });
  });

  describe('Unauthenticated State', () => {
    it('should handle unauthenticated requests without token', async () => {
      const mockGetToken = vi.fn().mockResolvedValue(null);
      const client = new GameClient('/api', mockGetToken);

      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ items: [], total: 0, page: 1, pageSize: 10 }),
      });

      // Make a request
      await client.listGames();

      // Verify no Authorization header was added
      const callArgs = (global.fetch as any).mock.calls[0];
      const headers = callArgs[1].headers as Headers;
      expect(headers.get('Authorization')).toBeNull();
    });

    it('should handle authenticated requests with token', async () => {
      const mockToken = 'valid_clerk_token';
      const mockGetToken = vi.fn().mockResolvedValue(mockToken);
      const client = new GameClient('/api', mockGetToken);

      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ items: [], total: 0, page: 1, pageSize: 10 }),
      });

      // Make a request
      await client.listGames();

      // Verify Authorization header was added
      const callArgs = (global.fetch as any).mock.calls[0];
      const headers = callArgs[1].headers as Headers;
      expect(headers.get('Authorization')).toBe(`Bearer ${mockToken}`);
    });
  });

  describe('GameClient Token Integration', () => {
    it('should call getToken before each API request', async () => {
      const mockGetToken = vi.fn().mockResolvedValue('token_123');
      const client = new GameClient('/api', mockGetToken);

      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ items: [], total: 0, page: 1, pageSize: 10 }),
      });

      // Make multiple requests
      await client.listGames();
      await client.getGameTypes();

      // Verify getToken was called for each request
      expect(mockGetToken).toHaveBeenCalledTimes(2);
    });

    it('should work without getToken function (backwards compatibility)', async () => {
      const client = new GameClient('/api');

      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ items: [], total: 0, page: 1, pageSize: 10 }),
      });

      // Make a request
      await client.listGames();

      // Should work without errors
      expect(global.fetch).toHaveBeenCalled();
      
      // Verify no Authorization header was added
      const callArgs = (global.fetch as any).mock.calls[0];
      const headers = callArgs[1].headers as Headers;
      expect(headers.get('Authorization')).toBeNull();
    });
  });
});
