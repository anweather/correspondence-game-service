import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { GameClient } from '../api/gameClient';
import type { GameState, MoveInput, AIPlayerConfig } from '../types/game';

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
  gameTypes: Map<string, { maxPlayers: number }>;
}

/**
 * Admin context actions
 */
interface AdminContextActions {
  loadGames: () => Promise<void>;
  selectGame: (gameId: string) => Promise<void>;
  createTestGame: (gameType: string, aiPlayers?: AIPlayerConfig[]) => Promise<void>;
  addTestPlayer: (playerName: string) => Promise<void>;
  impersonatePlayer: (playerId: string | null) => void;
  submitMove: (move: MoveInput) => Promise<void>;
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
  const { getToken } = useAuth();
  const [games, setGames] = useState<GameState[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameState | null>(null);
  const [impersonatedPlayer, setImpersonatedPlayer] = useState<string | null>(null);
  const [filter, setFilter] = useState<GameFilter>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameTypes, setGameTypes] = useState<Map<string, { maxPlayers: number }>>(new Map());

  const client = useMemo(() => new GameClient('/api', getToken), [getToken]);

  /**
   * Load game types on mount
   */
  useEffect(() => {
    const loadGameTypes = async () => {
      try {
        const types = await client.getGameTypes();
        const typesMap = new Map(
          types.map((type) => [type.type, { maxPlayers: type.maxPlayers }])
        );
        setGameTypes(typesMap);
      } catch (err) {
        console.error('Failed to load game types:', err);
      }
    };
    loadGameTypes();
  }, [client]);

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
    async (gameType: string, aiPlayers?: AIPlayerConfig[]) => {
      setLoading(true);
      setError(null);
      try {
        // Create the game with AI players if provided
        const newGame = await client.createGame(gameType, {
          aiPlayers: aiPlayers && aiPlayers.length > 0 ? aiPlayers : undefined,
        });

        // Join as the first player (Admin)
        const playerId = `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const joinedGame = await client.joinGame(newGame.gameId, {
          id: playerId,
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
        // Generate unique player ID
        const playerId = `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const updatedGame = await client.joinGame(selectedGame.gameId, {
          id: playerId,
          name: playerName,
          joinedAt: new Date().toISOString(),
        });

        setSelectedGame(updatedGame);
        
        // Refresh the games list to show updated player count
        await loadGames();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to add player';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [client, selectedGame, loadGames]
  );

  /**
   * Set the currently impersonated player
   */
  const impersonatePlayer = useCallback((playerId: string | null) => {
    setImpersonatedPlayer(playerId);
  }, []);

  /**
   * Submit a move as the impersonated player
   */
  const submitMove = useCallback(
    async (move: MoveInput) => {
      if (!selectedGame) {
        setError('No game selected');
        return;
      }

      if (!impersonatedPlayer) {
        setError('No player impersonated');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const updatedGame = await client.makeMove(
          selectedGame.gameId,
          impersonatedPlayer,
          move,
          selectedGame.version
        );

        setSelectedGame(updatedGame);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to submit move';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [client, selectedGame, impersonatedPlayer]
  );

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
    gameTypes,
    loadGames,
    selectGame,
    createTestGame,
    addTestPlayer,
    impersonatePlayer,
    submitMove,
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
