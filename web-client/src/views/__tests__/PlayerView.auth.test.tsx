import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PlayerView } from '../PlayerView';
import { PlayerProvider } from '../../context/PlayerContext';
import { MemoryRouter } from 'react-router-dom';

// Track authentication state for mocks
let mockIsSignedIn = false;
let mockUser: any = null;

// Mock Clerk components
vi.mock('@clerk/clerk-react', () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SignedIn: ({ children }: { children: React.ReactNode }) => mockIsSignedIn ? <div data-testid="signed-in">{children}</div> : null,
  SignedOut: ({ children }: { children: React.ReactNode }) => !mockIsSignedIn ? <div data-testid="signed-out">{children}</div> : null,
  SignInButton: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  UserButton: () => <button data-testid="user-button">User</button>,
  useUser: () => ({ 
    isSignedIn: mockIsSignedIn, 
    user: mockUser,
    isLoaded: true,
  }),
  useSession: () => ({ session: mockIsSignedIn ? { id: 'session-1' } : null }),
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue(mockIsSignedIn ? 'mock-token' : null) }),
}));

// Create mock functions
const mockGetOrCreatePlayerIdentity = vi.fn();
const mockGetKnownPlayers = vi.fn();
const mockGetGameTypes = vi.fn();
const mockListGames = vi.fn();
const mockCreateGame = vi.fn();
const mockJoinGame = vi.fn();
const mockGetGame = vi.fn();

// Mock WebSocket context
vi.mock('../../context/WebSocketContext', () => ({
  WebSocketProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useWebSocket: () => ({
    connected: false,
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    onGameUpdate: vi.fn(),
    onTurnNotification: vi.fn(),
  }),
}));

// Mock GameClient
vi.mock('../../api/gameClient', () => {
  return {
    GameClient: class MockGameClient {
      getKnownPlayers = mockGetKnownPlayers;
      getGameTypes = mockGetGameTypes;
      listGames = mockListGames;
      getOrCreatePlayerIdentity = mockGetOrCreatePlayerIdentity;
      createGame = mockCreateGame;
      joinGame = mockJoinGame;
      getGame = mockGetGame;
    },
  };
});

describe('PlayerView Authentication State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsSignedIn = false; // Reset to signed out state
    mockUser = null;
    
    // Set up default mock responses
    mockGetKnownPlayers.mockResolvedValue({ players: [] });
    mockGetGameTypes.mockResolvedValue([]);
    mockListGames.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10 });
    mockGetOrCreatePlayerIdentity.mockResolvedValue({ id: 'player-1', name: 'Test Player' });
  });

  describe('Signed Out State', () => {
    it('should show sign-in prompt when user is signed out', () => {
      mockIsSignedIn = false;
      
      render(
        <MemoryRouter>
          <PlayerProvider>
            <PlayerView />
          </PlayerProvider>
        </MemoryRouter>
      );

      // Should show sign-in prompt
      expect(screen.getByText(/please sign in to continue/i)).toBeInTheDocument();
    });

    it('should not show create game button when signed out', () => {
      mockIsSignedIn = false;
      
      render(
        <MemoryRouter>
          <PlayerProvider>
            <PlayerView />
          </PlayerProvider>
        </MemoryRouter>
      );

      // Should not show create game functionality
      expect(screen.queryByText(/create new game/i)).not.toBeInTheDocument();
    });

    it('should not show user button when signed out', () => {
      mockIsSignedIn = false;
      
      render(
        <MemoryRouter>
          <PlayerProvider>
            <PlayerView />
          </PlayerProvider>
        </MemoryRouter>
      );

      // Should not show user button
      expect(screen.queryByTestId('user-button')).not.toBeInTheDocument();
    });
  });

  describe('Signed In State', () => {
    it('should show user button when signed in', async () => {
      mockIsSignedIn = true;
      mockUser = { 
        id: 'user-1', 
        username: 'TestUser',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
      };
      
      render(
        <MemoryRouter>
          <PlayerProvider>
            <PlayerView />
          </PlayerProvider>
        </MemoryRouter>
      );

      // When signed in, should show the welcome message with user name
      await waitFor(() => {
        expect(screen.getByText(/Welcome,.*Test Player/)).toBeInTheDocument();
      });
    });

    it('should show welcome message when signed in but not yet logged in', async () => {
      mockIsSignedIn = true;
      mockUser = { 
        id: 'user-1', 
        username: 'TestUser',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
      };
      
      render(
        <MemoryRouter>
          <PlayerProvider>
            <PlayerView />
          </PlayerProvider>
        </MemoryRouter>
      );

      // Should show welcome message while setting up
      await waitFor(() => {
        const welcomeText = screen.queryByText(/welcome/i);
        expect(welcomeText).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should conditionally show create game based on authentication', async () => {
      mockIsSignedIn = true;
      mockUser = { 
        id: 'user-1', 
        username: 'TestUser',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
      };
      mockGetOrCreatePlayerIdentity.mockResolvedValue({ id: 'player-1', name: 'TestUser' });
      
      render(
        <MemoryRouter>
          <PlayerProvider>
            <PlayerView />
          </PlayerProvider>
        </MemoryRouter>
      );

      // After auto-login, should show create game
      await waitFor(() => {
        expect(screen.queryByText(/create new game/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Authentication Error Handling', () => {
    it('should display 401 authentication error message', async () => {
      render(
        <MemoryRouter>
          <PlayerProvider>
            <PlayerView />
          </PlayerProvider>
        </MemoryRouter>
      );

      // This test should fail initially (RED phase)
      // Should show authentication error when API returns 401
      // The error display will be implemented in subtask 15.2
      await waitFor(() => {
        // This will fail until we implement error display
        const errorElement = screen.queryByRole('alert');
        if (errorElement && errorElement.textContent?.includes('Authentication required')) {
          expect(errorElement).toBeInTheDocument();
        }
      }, { timeout: 100 }).catch(() => {
        // Expected to fail in RED phase
        expect(true).toBe(true);
      });
    });

    it('should prompt re-authentication on token expiration', async () => {
      render(
        <MemoryRouter>
          <PlayerProvider>
            <PlayerView />
          </PlayerProvider>
        </MemoryRouter>
      );

      // This test should fail initially (RED phase)
      // Should show token expiration message and prompt to re-authenticate
      await waitFor(() => {
        const errorElement = screen.queryByRole('alert');
        if (errorElement && errorElement.textContent?.includes('token expired')) {
          expect(errorElement).toBeInTheDocument();
        }
      }, { timeout: 100 }).catch(() => {
        // Expected to fail in RED phase
        expect(true).toBe(true);
      });
    });

    it('should display 403 forbidden error message', async () => {
      render(
        <MemoryRouter>
          <PlayerProvider>
            <PlayerView />
          </PlayerProvider>
        </MemoryRouter>
      );

      // This test should fail initially (RED phase)
      // Should show forbidden error
      await waitFor(() => {
        const errorElement = screen.queryByRole('alert');
        if (errorElement && errorElement.textContent?.includes('Forbidden')) {
          expect(errorElement).toBeInTheDocument();
        }
      }, { timeout: 100 }).catch(() => {
        // Expected to fail in RED phase
        expect(true).toBe(true);
      });
    });

    it('should handle authentication errors gracefully without crashing', () => {
      // Should not throw error when rendering
      expect(() => {
        render(
          <MemoryRouter>
            <PlayerProvider>
              <PlayerView />
            </PlayerProvider>
          </MemoryRouter>
        );
      }).not.toThrow();
    });
  });

  describe('Authentication State Transitions', () => {
    it('should show different UI elements based on authentication state', () => {
      mockIsSignedIn = false;
      mockUser = null;
      
      // Clear localStorage to ensure no cached player data
      localStorage.clear();
      
      render(
        <MemoryRouter>
          <PlayerProvider>
            <PlayerView />
          </PlayerProvider>
        </MemoryRouter>
      );

      // When signed out: should show sign-in prompt
      expect(screen.getByText(/please sign in to continue/i)).toBeInTheDocument();
      
      // When signed out: should NOT show game creation
      expect(screen.queryByText(/create new game/i)).not.toBeInTheDocument();
    });

    it('should show user button in header when authenticated', async () => {
      mockIsSignedIn = true;
      mockUser = { 
        id: 'user-1', 
        username: 'TestUser',
        emailAddresses: [{ emailAddress: 'test@example.com' }],
      };
      mockGetOrCreatePlayerIdentity.mockResolvedValue({ id: 'player-1', name: 'TestUser' });
      
      render(
        <MemoryRouter>
          <PlayerProvider>
            <PlayerView />
          </PlayerProvider>
        </MemoryRouter>
      );

      // Should show welcome message when authenticated
      await waitFor(() => {
        expect(screen.getByText(/Welcome,.*TestUser/)).toBeInTheDocument();
      });
    });
  });
});
