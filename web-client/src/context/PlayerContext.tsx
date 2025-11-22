import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from 'react';
import type { ReactNode } from 'react';
import { GameClient } from '../api/gameClient';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { GameState, MoveInput } from '../types/game';

/**
 * Player context state
 */
interface PlayerContextState {
  currentGame: GameState | null;
  playerId: string | null;
  playerName: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Player context actions
 */
interface PlayerContextActions {
  login: (name: string) => void;
  logout: () => void;
  createGame: (gameType: string) => Promise<void>;
  joinGame: (gameId: string) => Promise<void>;
  loadGame: (gameId: string) => Promise<void>;
  submitMove: (move: MoveInput) => Promise<void>;
  refreshGame: () => Promise<void>;
  listAvailableGames: () => Promise<GameState[]>;
}

/**
 * Combined context type
 */
type PlayerContextType = PlayerContextState & PlayerContextActions;

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

/**
 * Player context provider props
 */
interface PlayerProviderProps {
  children: ReactNode;
}

/**
 * Player context provider component
 * Manages state for the player view including game participation and move submission
 */
export function PlayerProvider({ children }: PlayerProviderProps) {
  const [currentGame, setCurrentGame] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persist player identity in localStorage
  const [playerId, setPlayerId] = useLocalStorage<string | null>('player.id', null);
  const [playerName, setPlayerName] = useLocalStorage<string | null>('player.name', null);
  const [, setCurrentGameId] = useLocalStorage<string | null>(
    'player.currentGame',
    null
  );

  const client = useMemo(() => new GameClient(), []);

  /**
   * Login with a player name (simple session-based identity)
   */
  const login = useCallback(
    (name: string) => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        setError('Player name cannot be empty');
        return;
      }
      setPlayerName(trimmedName);
      setError(null);
    },
    [setPlayerName]
  );

  /**
   * Logout and clear player session
   */
  const logout = useCallback(() => {
    setPlayerName(null);
    setPlayerId(null);
    setCurrentGame(null);
    setCurrentGameId(null);
    setError(null);
  }, [setPlayerName, setPlayerId, setCurrentGameId]);

  /**
   * Create a new game and join as the first player
   */
  const createGame = useCallback(
    async (gameType: string) => {
      if (!playerName) {
        setError('Please login first');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Create the game
        const newGame = await client.createGame(gameType, {});

        // Generate unique player ID
        const newPlayerId = `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Join as the first player
        const joinedGame = await client.joinGame(newGame.gameId, {
          id: newPlayerId,
          name: playerName,
          joinedAt: new Date().toISOString(),
        });

        // Find the player that was just added
        const player = joinedGame.players.find((p) => p.id === newPlayerId);

        if (player) {
          setPlayerId(player.id);
          setCurrentGameId(joinedGame.gameId);
          setCurrentGame(joinedGame);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create game';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [client, playerName, setPlayerId, setCurrentGameId]
  );

  /**
   * Join an existing game
   */
  const joinGame = useCallback(
    async (gameId: string) => {
      if (!playerName) {
        setError('Please login first');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Generate unique player ID
        const newPlayerId = `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const joinedGame = await client.joinGame(gameId, {
          id: newPlayerId,
          name: playerName,
          joinedAt: new Date().toISOString(),
        });

        // Find the player that was just added
        const player = joinedGame.players.find((p) => p.id === newPlayerId);

        if (player) {
          setPlayerId(player.id);
          setCurrentGameId(joinedGame.gameId);
          setCurrentGame(joinedGame);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to join game';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [client, playerName, setPlayerId, setCurrentGameId]
  );

  /**
   * Load a game by ID
   */
  const loadGame = useCallback(
    async (gameId: string) => {
      setLoading(true);
      setError(null);
      try {
        const game = await client.getGame(gameId);
        setCurrentGame(game);
        setCurrentGameId(gameId);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load game';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [client, setCurrentGameId]
  );

  /**
   * Submit a move for the current player
   */
  const submitMove = useCallback(
    async (move: MoveInput) => {
      if (!currentGame) {
        setError('No game loaded');
        return;
      }

      if (!playerId) {
        setError('No player ID');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const updatedGame = await client.makeMove(
          currentGame.gameId,
          playerId,
          move,
          currentGame.version
        );

        setCurrentGame(updatedGame);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to submit move';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [client, currentGame, playerId]
  );

  /**
   * Refresh the current game state
   */
  const refreshGame = useCallback(async () => {
    if (!currentGame) {
      setError('No game to refresh');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const refreshedGame = await client.getGame(currentGame.gameId);
      setCurrentGame(refreshedGame);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh game';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [client, currentGame]);

  /**
   * List available games that can be joined
   */
  const listAvailableGames = useCallback(async (): Promise<GameState[]> => {
    try {
      const response = await client.listGames();
      return response.items;
    } catch (err) {
      console.error('Failed to list games:', err);
      return [];
    }
  }, [client]);

  const value: PlayerContextType = {
    currentGame,
    playerId,
    playerName,
    loading,
    error,
    login,
    logout,
    createGame,
    joinGame,
    loadGame,
    submitMove,
    refreshGame,
    listAvailableGames,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

/**
 * Hook to access player context
 * Must be used within PlayerProvider
 */
export function usePlayer(): PlayerContextType {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within PlayerProvider');
  }
  return context;
}
