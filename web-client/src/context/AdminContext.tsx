import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from 'react';
import type { ReactNode } from 'react';
import { GameClient } from '../api/gameClient';
import type { GameState } from '../types/game';

/**
 * Filter options for game list
 */
export type GameFilter = 'all' | 'active' | 'completed';

/**
 * Admin context state
 */
interface AdminContextState {
  games: GameState[];
  selectedGame: GameState | null;
  impersonatedPlayer: string | null;
  filter: GameFilter;
  loading: boolean;
  error: string | null;
}

/**
 * Admin context actions
 */
interface AdminContextActions {
  loadGames: () => Promise<void>;
  selectGame: (gameId: string) => Promise<void>;
  createTestGame: (gameType: string) => Promise<void>;
  addTestPlayer: (playerName: string) => Promise<void>;
  impersonatePlayer: (playerId: string | null) => void;
  deleteGame: (gameId: string) => Promise<void>;
  setFilter: (filter: GameFilter) => void;
}

/**
 * Combined context type
 */
type AdminContextType = AdminContextState & AdminContextActions;

const AdminContext = createContext<AdminContextType | undefined>(undefined);

/**
 * Admin context provider props
 */
interface AdminProviderProps {
  children: ReactNode;
}

/**
 * Admin context provider component
 * Manages state for the admin view including game list, selection, and player impersonation
 */
export function AdminProvider({ children }: AdminProviderProps) {
  const [games, setGames] = useState<GameState[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameState | null>(null);
  const [impersonatedPlayer, setImpersonatedPlayer] = useState<string | null>(null);
  const [filter, setFilter] = useState<GameFilter>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const client = useMemo(() => new GameClient(), []);

  /**
   * Load all games from the API
   */
  const loadGames = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await client.listGames();
      setGames(response.items);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load games';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [client]);

  /**
   * Select and load a specific game
   */
  const selectGame = useCallback(
    async (gameId: string) => {
      setLoading(true);
      setError(null);
      try {
        const game = await client.getGame(gameId);
        setSelectedGame(game);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load game';
        setError(errorMessage);
        setSelectedGame(null);
      } finally {
        setLoading(false);
      }
    },
    [client]
  );

  /**
   * Create a new test game and join as the first player
   */
  const createTestGame = useCallback(
    async (gameType: string) => {
      setLoading(true);
      setError(null);
      try {
        // Create the game
        const newGame = await client.createGame(gameType, {});

        // Join as the first player (Admin)
        const joinedGame = await client.joinGame(newGame.gameId, {
          id: '', // Server will generate
          name: 'Admin',
          joinedAt: new Date().toISOString(),
        });

        setSelectedGame(joinedGame);
        
        // Refresh the games list
        await loadGames();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create game';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [client, loadGames]
  );

  /**
   * Add a test player to the currently selected game
   */
  const addTestPlayer = useCallback(
    async (playerName: string) => {
      if (!selectedGame) {
        setError('No game selected');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const updatedGame = await client.joinGame(selectedGame.gameId, {
          id: '', // Server will generate
          name: playerName,
          joinedAt: new Date().toISOString(),
        });

        setSelectedGame(updatedGame);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to add player';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [client, selectedGame]
  );

  /**
   * Set the currently impersonated player
   */
  const impersonatePlayer = useCallback((playerId: string | null) => {
    setImpersonatedPlayer(playerId);
  }, []);

  /**
   * Delete a game
   */
  const deleteGame = useCallback(
    async (gameId: string) => {
      setLoading(true);
      setError(null);
      try {
        await client.deleteGame(gameId);

        // Remove from games list
        setGames((prevGames) => prevGames.filter((game) => game.gameId !== gameId));

        // Clear selected game if it was deleted
        if (selectedGame?.gameId === gameId) {
          setSelectedGame(null);
          setImpersonatedPlayer(null);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete game';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [client, selectedGame]
  );

  /**
   * Set the game filter
   */
  const handleSetFilter = useCallback((newFilter: GameFilter) => {
    setFilter(newFilter);
  }, []);

  const value: AdminContextType = {
    games,
    selectedGame,
    impersonatedPlayer,
    filter,
    loading,
    error,
    loadGames,
    selectGame,
    createTestGame,
    addTestPlayer,
    impersonatePlayer,
    deleteGame,
    setFilter: handleSetFilter,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

/**
 * Hook to access admin context
 * Must be used within AdminProvider
 */
export function useAdmin(): AdminContextType {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within AdminProvider');
  }
  return context;
}
