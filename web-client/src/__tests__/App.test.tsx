import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

// Mock user for admin tests
let mockUserId = 'user-1';

// Mock Clerk
vi.mock('@clerk/clerk-react', () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SignedIn: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SignedOut: ({ children }: { children: React.ReactNode }) => null,
  SignInButton: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  UserButton: () => <button data-testid="user-button">User</button>,
  useUser: () => ({ 
    isSignedIn: true, 
    user: { id: mockUserId, primaryEmailAddress: { emailAddress: 'test@example.com' } },
    isLoaded: true,
  }),
  useSession: () => ({ session: { id: 'session-1' } }),
  useAuth: () => ({ getToken: vi.fn().mockResolvedValue('mock-token') }),
}));

// Mock GameClient
const mockGetGameTypes = vi.fn().mockResolvedValue([
  {
    type: 'tic-tac-toe',
    name: 'Tic Tac Toe',
    description: 'Classic game',
    minPlayers: 2,
    maxPlayers: 2,
  },
]);

const mockListGames = vi.fn().mockResolvedValue({ items: [] });
const mockGetOrCreatePlayerIdentity = vi.fn().mockResolvedValue({
  id: 'player-1',
  name: 'TestPlayer',
});
const mockGetKnownPlayers = vi.fn().mockResolvedValue({ players: [] });
const mockGetProfile = vi.fn().mockResolvedValue({
  userId: 'user-1',
  displayName: 'TestPlayer',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
const mockGetPlayerStats = vi.fn().mockResolvedValue({
  userId: 'user-1',
  totalGames: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  winRate: 0,
  totalTurns: 0,
  averageTurnsPerGame: 0,
});
const mockGetGameHistory = vi.fn().mockResolvedValue({
  items: [],
  total: 0,
  page: 1,
  pageSize: 10,
  totalPages: 0,
});

vi.mock('../api/gameClient', () => ({
  GameClient: class {
    getGameTypes = mockGetGameTypes;
    listGames = mockListGames;
    getOrCreatePlayerIdentity = mockGetOrCreatePlayerIdentity;
    getKnownPlayers = mockGetKnownPlayers;
    getProfile = mockGetProfile;
    getPlayerStats = mockGetPlayerStats;
    getGameHistory = mockGetGameHistory;
  },
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserId = 'user-1';
    // Reset environment variable
    import.meta.env.VITE_ADMIN_USER_IDS = '';
  });

  it('should render without crashing', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );
    expect(document.body).toBeTruthy();
  });

  describe('Route rendering', () => {
    it('should render AdminView when navigating to /admin', () => {
      // Set admin user to allow access
      mockUserId = 'admin-user-1';
      import.meta.env.VITE_ADMIN_USER_IDS = 'admin-user-1';

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <App />
        </MemoryRouter>
      );

      // AdminView should have a heading with "Admin View"
      expect(screen.getByRole('heading', { name: /admin view/i })).toBeInTheDocument();
    });

    it('should render PlayerView when navigating to /player', () => {
      render(
        <MemoryRouter initialEntries={['/player']}>
          <App />
        </MemoryRouter>
      );

      // PlayerView should have player-related content
      // Check for game setup elements (create/join game forms)
      expect(screen.getByText(/create new game/i)).toBeInTheDocument();
    });

    it('should render PlayerView by default at root path', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      );

      // Default route should show PlayerView with game setup
      expect(screen.getByText(/create new game/i)).toBeInTheDocument();
    });

    it('should render lobby view at /lobby', () => {
      render(
        <MemoryRouter initialEntries={['/lobby']}>
          <App />
        </MemoryRouter>
      );

      // Lobby view should be rendered - check for loading state
      expect(screen.getByText(/Loading games/i)).toBeInTheDocument();
    });

    it('should render profile view at /profile', () => {
      render(
        <MemoryRouter initialEntries={['/profile']}>
          <App />
        </MemoryRouter>
      );

      // Profile view should be rendered - check for unique content
      expect(screen.getByText(/Loading profile/i)).toBeInTheDocument();
    });

    it('should render stats view at /stats', async () => {
      render(
        <MemoryRouter initialEntries={['/stats']}>
          <App />
        </MemoryRouter>
      );

      // Stats view should be rendered - check for unique content
      // Since the component might be in loading state without playerId, check for either the heading or loading text
      await waitFor(() => {
        const hasHeading = screen.queryByRole('heading', { name: /Statistics/i });
        const hasLoading = screen.queryByText(/Loading statistics/i);
        expect(hasHeading || hasLoading).toBeTruthy();
      });
    });

    it('should render leaderboard view at /leaderboard', () => {
      render(
        <MemoryRouter initialEntries={['/leaderboard']}>
          <App />
        </MemoryRouter>
      );

      // Leaderboard view should be rendered - check for unique content using heading role
      expect(screen.getByRole('heading', { name: /Leaderboard/i })).toBeInTheDocument();
    });
  });

  describe('Header presence', () => {
    it('should display header on lobby view', () => {
      render(
        <MemoryRouter initialEntries={['/lobby']}>
          <App />
        </MemoryRouter>
      );

      // Header should be present with navigation
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should display header on profile view', () => {
      render(
        <MemoryRouter initialEntries={['/profile']}>
          <App />
        </MemoryRouter>
      );

      // Header should be present
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('should display header on stats view', () => {
      render(
        <MemoryRouter initialEntries={['/stats']}>
          <App />
        </MemoryRouter>
      );

      // Header should be present - check for navigation header specifically
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should display header on leaderboard view', () => {
      render(
        <MemoryRouter initialEntries={['/leaderboard']}>
          <App />
        </MemoryRouter>
      );

      // Header should be present - check for navigation header specifically
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should not display header on admin view', () => {
      // Set admin user to allow access
      mockUserId = 'admin-user-1';
      import.meta.env.VITE_ADMIN_USER_IDS = 'admin-user-1';

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <App />
        </MemoryRouter>
      );

      // Admin view should not have the player navigation header (Header component)
      // It has its own AuthHeader, but not the player Header with navigation
      const navLinks = screen.queryByText(/my games/i);
      expect(navLinks).not.toBeInTheDocument();
    });
  });

  describe('Admin route protection', () => {
    it('should allow access to admin view for authorized users', async () => {
      mockUserId = 'admin-user-1';
      import.meta.env.VITE_ADMIN_USER_IDS = 'admin-user-1,admin-user-2';

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <App />
        </MemoryRouter>
      );

      // Admin view should be accessible
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /admin view/i })).toBeInTheDocument();
      });
    });

    it('should redirect unauthorized users from admin view', async () => {
      mockUserId = 'regular-user';
      import.meta.env.VITE_ADMIN_USER_IDS = 'admin-user-1,admin-user-2';

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <App />
        </MemoryRouter>
      );

      // Should redirect to player view
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: /admin view/i })).not.toBeInTheDocument();
        expect(screen.getByText(/create new game/i)).toBeInTheDocument();
      });
    });

    it('should show error message when unauthorized user tries to access admin', async () => {
      mockUserId = 'regular-user';
      import.meta.env.VITE_ADMIN_USER_IDS = 'admin-user-1';

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <App />
        </MemoryRouter>
      );

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/unauthorized/i)).toBeInTheDocument();
      });
    });
  });

  describe('Context providers', () => {
    it('should wrap routes with AdminProvider for admin view', () => {
      // Set admin user to allow access
      mockUserId = 'admin-user-1';
      import.meta.env.VITE_ADMIN_USER_IDS = 'admin-user-1';

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <App />
        </MemoryRouter>
      );

      // AdminProvider should be present - verify by checking AdminView renders
      expect(screen.getByRole('heading', { name: /admin view/i })).toBeInTheDocument();
    });

    it('should wrap routes with PlayerProvider for player view', () => {
      render(
        <MemoryRouter initialEntries={['/player']}>
          <App />
        </MemoryRouter>
      );

      // PlayerProvider should be present - verify by checking PlayerView renders
      expect(screen.getByText(/create new game/i)).toBeInTheDocument();
    });

    it('should wrap new routes with PlayerProvider', () => {
      render(
        <MemoryRouter initialEntries={['/lobby']}>
          <App />
        </MemoryRouter>
      );

      // PlayerProvider should be present for lobby - check for unique content using heading role
      expect(screen.getByRole('heading', { name: /Lobby/i })).toBeInTheDocument();
    });
  });
});
