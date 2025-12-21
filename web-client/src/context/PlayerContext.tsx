import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { GameClient } from '../api/gameClient';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useProfile } from '../hooks/useProfile';
import type { GameState, MoveInput, AIPlayerConfig, GameType } from '../types/game';

/**
 * Player context state
 */
interface PlayerContextState {
  currentGame: GameState | null;
  playerId: string | null;
  playerName: string | null;
  displayName: string | null;
  isNewUser: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Player context actions
 */
interface PlayerContextActions {
  login: (name: string) => Promise<void>;
  logout: () => void;
  getKnownPlayerNames: () => Promise<string[]>;
  getAvailableGameTypes: () => Promise<GameType[]>;
  createGame: (gameType: string, metadata?: { gameName?: string; gameDescription?: string; aiPlayers?: AIPlayerConfig[] }) => Promise<void>;
  joinGame: (gameId: string) => Promise<void>;
  loadGame: (gameId: string) => Promise<void>;
  submitMove: (move: MoveInput) => Promise<void>;
  refreshGame: () => Promise<void>;
  listAvailableGames: () => Promise<GameState[]>;
  listMyGames: () => Promise<GameState[]>;
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
  const { getToken } = useAuth();
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

  // Integrate profile management
  const { profile } = useProfile();

  const client = useMemo(() => new GameClient('/api', getToken), [getToken]);

  /**
   * Compute display name from profile or fall back to player name
   */
  const displayName = useMemo(() => {
    if (profile?.displayName) {
      return profile.displayName;
    }
    return playerName;
  }, [profile, playerName]);

  /**
   * Determine if this is a new user (no cached profile)
   */
  const isNewUser = useMemo(() => {
    // Check if we have a cached profile in localStorage
    try {
      const cached = localStorage.getItem('playerProfile');
      return !cached;
    } catch {
      return true;
    }
  }, []); // Empty dependency array - only check once on mount

  /**
   * Handle API errors with specific authentication error handling
   */
  const handleError = useCallback((err: unknown, defaultMessage: string): string => {
    if (err instanceof Error) {
      const message = err.message;
      
      // Check for authentication errors
      if (message.includes('Authentication required') || message.includes('401')) {
        return 'Authentication required. Please sign in to continue.';
      }
      
      // Check for token expiration
      if (message.includes('token expired') || message.includes('Token expired')) {
        return 'Your session has expired. Please sign in again.';
      }
      
      // Check for forbidden errors
      if (message.includes('Forbidden') || message.includes('403')) {
        return 'You do not have permission to perform this action.';
      }
      
      return message;
    }
    return defaultMessage;
  }, []);

  /**
   * Login with a player name (gets or creates player identity from backend)
   */
  const login = useCallback(
    async (name: string) => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        setError('Player name cannot be empty');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Get or create player identity from backend
        const identity = await client.getOrCreatePlayerIdentity(trimmedName);
        setPlayerName(identity.name);
        setPlayerId(identity.id);
      } catch (err) {
        const errorMessage = handleError(err, 'Failed to login');
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [client, setPlayerName, setPlayerId]
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
   * Get list of known player names from backend
   */
  const getKnownPlayerNames = useCallback(async (): Promise<string[]> => {
    try {
      const response = await client.getKnownPlayers();
      return response.players.map(p => p.name);
    } catch (err) {
      console.error('Failed to get known players:', err);
      return [];
    }
  }, [client]);

  /**
   * Get available game types from backend
   */
  const getAvailableGameTypes = useCallback(async () => {
    try {
      return await client.getGameTypes();
    } catch (err) {
      console.error('Failed to get game types:', err);
      return [];
    }
  }, [client]);

  /**
   * Create a new game and join as the first player
   */
  const createGame = useCallback(
    async (gameType: string, metadata?: { gameName?: string; gameDescription?: string; aiPlayers?: AIPlayerConfig[] }) => {
      if (!playerId) {
        setError('Please login first');
        return;
      }

      // Use display name if available, otherwise fall back to player name
      const nameToUse = displayName || playerName;
      if (!nameToUse) {
        setError('Please login first');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Create the game with metadata including AI players
        const gameConfig = {
          gameName: metadata?.gameName,
          gameDescription: metadata?.gameDescription,
          aiPlayers: metadata?.aiPlayers && metadata.aiPlayers.length > 0 ? metadata.aiPlayers : undefined,
        };
        
        const newGame = await client.createGame(gameType, gameConfig);
        
        // Join as the first player using existing player ID and display name
        const joinedGame = await client.joinGame(newGame.gameId, {
          id: playerId,
          name: nameToUse,
          joinedAt: new Date().toISOString(),
        });

        setCurrentGameId(joinedGame.gameId);
        setCurrentGame(joinedGame);
      } catch (err) {
        const errorMessage = handleError(err, 'Failed to create game');
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [client, displayName, playerName, playerId, setCurrentGameId, handleError]
  );

  /**
   * Join an existing game
   */
  const joinGame = useCallback(
    async (gameId: string) => {
      if (!playerId) {
        setError('Please login first');
        return;
      }

      // Use display name if available, otherwise fall back to player name
      const nameToUse = displayName || playerName;
      if (!nameToUse) {
        setError('Please login first');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Join using existing player ID and display name
        const joinedGame = await client.joinGame(gameId, {
          id: playerId,
          name: nameToUse,
          joinedAt: new Date().toISOString(),
        });

        setCurrentGameId(joinedGame.gameId);
        setCurrentGame(joinedGame);
      } catch (err) {
        const errorMessage = handleError(err, 'Failed to join game');
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [client, displayName, playerName, playerId, setCurrentGameId, handleError]
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
        const errorMessage = handleError(err, 'Failed to load game');
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [client, setCurrentGameId, handleError]
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
        const errorMessage = handleError(err, 'Failed to submit move');
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [client, currentGame, playerId, handleError]
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
      const errorMessage = handleError(err, 'Failed to refresh game');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [client, currentGame, handleError]);

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

  /**
   * List games for the current player
   */
  const listMyGames = useCallback(async (): Promise<GameState[]> => {
    if (!playerId) {
      return [];
    }
    try {
      const response = await client.listGames({ playerId });
      return response.items;
    } catch (err) {
      console.error('Failed to list my games:', err);
      return [];
    }
  }, [client, playerId]);

  const value: PlayerContextType = {
    currentGame,
    playerId,
    playerName,
    displayName,
    isNewUser,
    loading,
    error,
    login,
    logout,
    getKnownPlayerNames,
    getAvailableGameTypes,
    createGame,
    joinGame,
    loadGame,
    submitMove,
    refreshGame,
    listAvailableGames,
    listMyGames,
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
