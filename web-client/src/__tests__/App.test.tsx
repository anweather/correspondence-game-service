import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

// Mock Clerk
vi.mock('@clerk/clerk-react', () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SignedIn: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SignedOut: ({ children }: { children: React.ReactNode }) => null,
  SignInButton: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  UserButton: () => <button data-testid="user-button">User</button>,
  useUser: () => ({ 
    isSignedIn: true, 
    user: { id: 'user-1', primaryEmailAddress: { emailAddress: 'test@example.com' } },
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

vi.mock('../api/gameClient', () => ({
  GameClient: class {
    getGameTypes = mockGetGameTypes;
    listGames = mockListGames;
    getOrCreatePlayerIdentity = mockGetOrCreatePlayerIdentity;
    getKnownPlayers = mockGetKnownPlayers;
  },
}));

describe('App', () => {
  it('should render without crashing', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );
    expect(document.body).toBeTruthy();
  });

  it('should render AdminView when navigating to /admin', () => {
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

  it('should wrap routes with AdminProvider for admin view', () => {
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
});
