import { useState, useEffect, useRef } from 'react';
import { SignedIn, SignedOut, useUser, useAuth } from '@clerk/clerk-react';
import { usePlayer } from '../context/PlayerContext';
import { useWebSocket } from '../context/WebSocketContext';
import { GameDetail } from '../components/GameDetail/GameDetail';
import { MoveInput } from '../components/MoveInput/MoveInput';
import { Modal } from '../components/common';
import { GameClient } from '../api/gameClient';
import type { MoveInput as MoveInputType, GameState } from '../types/game';
import styles from './PlayerView.module.css';

/**
 * PlayerView component
 * Main view for players to create, join, and play games
 */
export function PlayerView() {
  const { user, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const {
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
  } = usePlayer();

  // WebSocket integration
  const { connected, subscribe, unsubscribe, onGameUpdate, onTurnNotification } = useWebSocket();

  const [name, setName] = useState('');
  const [gameId, setGameId] = useState('');
  const [selectedGameType, setSelectedGameType] = useState('');
  const [gameName, setGameName] = useState('');
  const [gameDescription, setGameDescription] = useState('');
  const [availableGames, setAvailableGames] = useState<GameState[]>([]);
  const [myGames, setMyGames] = useState<GameState[]>([]);
  const [gameTypes, setGameTypes] = useState<Array<{ type: string; name: string; description: string }>>([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [knownPlayers, setKnownPlayers] = useState<string[]>([]);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [availablePlayers, setAvailablePlayers] = useState<Array<{ userId: string; displayName: string }>>([]);
  const isInitialMount = useRef(true);

  // Create GameClient instance for invitation functionality
  const gameClient = useRef<GameClient | null>(null);
  if (!gameClient.current) {
    gameClient.current = new GameClient('/api', getToken);
  }

  // Automatically login when user signs in with Clerk
  useEffect(() => {
    if (isSignedIn && user && !playerName && !loading) {
      // Priority: username → full name → first name → email → fallback
      let name = 'Player';
      
      if (user.username) {
        name = user.username;
      } else if (user.firstName && user.lastName) {
        name = `${user.firstName} ${user.lastName}`;
      } else if (user.firstName) {
        name = user.firstName;
      } else if (user.emailAddresses && user.emailAddresses[0]?.emailAddress) {
        name = user.emailAddresses[0].emailAddress;
      }
      
      login(name);
    }
  }, [isSignedIn, user, playerName, loading, login]);

  // Automatically logout when user signs out through Clerk
  useEffect(() => {
    if (!isSignedIn && playerName) {
      // User signed out through Clerk, clear local state
      logout();
      // Clear URL parameters from hash
      window.history.replaceState({}, '', `${window.location.pathname}#/player`);
    }
  }, [isSignedIn, playerName, logout]);

  // Update URL when game changes (for bookmarking and refresh)
  useEffect(() => {
    // Skip URL updates on initial mount to preserve deep link
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (currentGame) {
      // Add gameId to hash when a game is loaded
      // Format: /#/player?gameId=abc123
      const newHash = `#/player?gameId=${currentGame.gameId}`;
      window.history.replaceState({}, '', `${window.location.pathname}${newHash}`);
    } else {
      // Clear gameId from hash when no game is loaded
      const newHash = '#/player';
      window.history.replaceState({}, '', `${window.location.pathname}${newHash}`);
    }
  }, [currentGame]);

  // Handle deep linking - check URL hash parameters
  useEffect(() => {
    // Only attempt to load from URL if logged in and no game loaded
    if (!playerName || currentGame || loading) {
      return;
    }

    // Parse query params from hash (after #/player)
    const hash = window.location.hash;
    const queryStart = hash.indexOf('?');
    
    if (queryStart === -1) {
      return; // No query params in hash
    }

    const queryString = hash.substring(queryStart + 1);
    const params = new URLSearchParams(queryString);
    const gameIdParam = params.get('gameId');
    
    if (gameIdParam) {
      console.log('Deep linking: Loading game from URL:', gameIdParam);
      // Auto-load game from URL
      loadGame(gameIdParam);
    }
  }, [playerName, currentGame, loading, loadGame]);

  // Load available games, my games, and game types when logged in
  useEffect(() => {
    if (playerName && !currentGame) {
      const loadGames = async () => {
        setLoadingGames(true);
        const [available, mine, types] = await Promise.all([
          listAvailableGames(),
          listMyGames(),
          getAvailableGameTypes(),
        ]);
        setAvailableGames(available);
        setMyGames(mine);
        setGameTypes(types);
        // Set default game type to first available
        if (types.length > 0 && !selectedGameType) {
          setSelectedGameType(types[0].type);
        }
        setLoadingGames(false);
      };
      loadGames();
    }
  }, [playerName, currentGame, listAvailableGames, listMyGames, getAvailableGameTypes, selectedGameType]);

  // Load known player names when login screen is shown
  useEffect(() => {
    if (!playerName) {
      const loadKnownPlayers = async () => {
        const players = await getKnownPlayerNames();
        setKnownPlayers(players);
      };
      loadKnownPlayers();
    }
  }, [playerName, getKnownPlayerNames]);

  // Load available players when game is loaded
  useEffect(() => {
    if (currentGame && gameClient.current) {
      const loadAvailablePlayers = async () => {
        try {
          // Get all players
          const allPlayers = await gameClient.current!.listAllPlayers();
          
          // Filter out players who are already in the current game
          const currentPlayerIds = currentGame.players.map(p => p.id);
          const available = allPlayers.filter(p => !currentPlayerIds.includes(p.userId));
          
          setAvailablePlayers(available);
        } catch (err) {
          console.error('Failed to load available players:', err);
          // Don't set error state, just log it - invitation feature is optional
        }
      };
      loadAvailablePlayers();
    }
  }, [currentGame]);

  // WebSocket subscription management
  useEffect(() => {
    if (currentGame) {
      // Subscribe to game updates
      subscribe(currentGame.gameId);

      // Register callback for game updates
      onGameUpdate((updatedGameState: GameState) => {
        // Only update if it's for the current game
        if (updatedGameState.gameId === currentGame.gameId) {
          // Refresh the game to get the latest state
          refreshGame();
        }
      });

      // Register callback for turn notifications
      onTurnNotification((gameId: string) => {
        // Only handle notifications for the current game
        if (gameId === currentGame.gameId) {
          // Refresh the game to get the latest state
          refreshGame();
        }
      });

      // Cleanup: unsubscribe when game changes or component unmounts
      return () => {
        unsubscribe(currentGame.gameId);
      };
    }
  }, [currentGame, subscribe, unsubscribe, onGameUpdate, onTurnNotification, refreshGame]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      await login(name.trim());
      setName('');
    }
  };

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGameType && gameName.trim()) {
      await createGame(selectedGameType, {
        gameName: gameName.trim(),
        gameDescription: gameDescription.trim(),
      });
      // Clear form after successful creation
      setGameName('');
      setGameDescription('');
    }
  };

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (gameId.trim()) {
      // Extract gameId from URL if a full URL was pasted
      let extractedGameId = gameId.trim();
      
      // Check if it's a URL with gameId parameter
      if (extractedGameId.includes('gameId=')) {
        try {
          // Handle both regular query params and hash-based params
          if (extractedGameId.includes('#')) {
            // Hash-based URL: /#/player?gameId=abc123
            const hashPart = extractedGameId.split('#')[1];
            if (hashPart && hashPart.includes('?')) {
              const queryString = hashPart.split('?')[1];
              const params = new URLSearchParams(queryString);
              const paramGameId = params.get('gameId');
              if (paramGameId) {
                extractedGameId = paramGameId;
              }
            }
          } else {
            // Regular query params: ?gameId=abc123
            const url = new URL(extractedGameId.startsWith('http') ? extractedGameId : `http://localhost${extractedGameId}`);
            const params = new URLSearchParams(url.search);
            const paramGameId = params.get('gameId');
            if (paramGameId) {
              extractedGameId = paramGameId;
            }
          }
        } catch {
          // If URL parsing fails, use the original value
        }
      }
      
      await joinGame(extractedGameId);
    }
  };

  const handleSubmitMove = async (move: MoveInputType) => {
    await submitMove(move);
  };

  const handleRefresh = () => {
    refreshGame();
  };

  const handleInvite = async (playerIds: string[]) => {
    if (!currentGame || !gameClient.current) {
      throw new Error('No game loaded');
    }

    try {
      // Send invitations to all selected players
      await Promise.all(
        playerIds.map(playerId => 
          gameClient.current!.createInvitation(currentGame.gameId, playerId)
        )
      );
      
      // Optionally refresh the game to see if any players joined
      // For now, we'll just let the invitation be sent
    } catch (err) {
      // Re-throw the error so GameDetail can handle it
      throw err;
    }
  };

  // Show login screen if not logged in
  // Only show loading message for truly new users (no cached profile)
  if (!playerName) {
    // If user has a cached profile, don't show anything - just wait for playerName to load
    // This prevents the flash of loading screen for returning users
    if (!isNewUser) {
      return null; // Or return a minimal loading indicator if preferred
    }

    return (
      <div className={styles.playerView}>
        <SignedOut>
          <div className={styles.authPrompt}>
            <h2>Please sign in to continue</h2>
            <p>Sign in with your preferred provider to create and join games.</p>
          </div>
        </SignedOut>

        <SignedIn>
          {error && (
            <div className={styles.error} role="alert">
              {error}
            </div>
          )}

          <div className={styles.loginContainer}>
            <div className={styles.loginSection}>
              {/* Only show loading message for new users without cached profile */}
              {loading ? (
                <>
                  <h2>Setting up your account...</h2>
                  <p className={styles.loginDescription}>
                    Please wait while we create your player profile.
                  </p>
                </>
              ) : (
                <>
                  <h2>Welcome!</h2>
                  <p className={styles.loginDescription}>
                    We're setting up your account. This will only take a moment.
                  </p>
                </>
              )}
            </div>
          </div>
        </SignedIn>
      </div>
    );
  }

  // Show game setup screen if no game is loaded
  if (!currentGame) {
    return (
      <div className={styles.playerView}>
        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        {/* Welcome message with display name */}
        <div className={styles.welcomeMessage}>
          <h1>Welcome, {displayName || playerName}!</h1>
        </div>

        <div className={styles.setupContainer}>
          {myGames.length > 0 && (
            <div className={styles.myGamesSection}>
              <h2>My Games</h2>
              <div className={styles.gamesList}>
                {myGames.map((game) => {
                  const gameName = (game.metadata as any)?.gameName || game.gameId;
                  const gameDescription = (game.metadata as any)?.gameDescription;
                  
                  return (
                    <div
                      key={game.gameId}
                      className={styles.gameCard}
                      onClick={() => loadGame(game.gameId)}
                    >
                      <div className={styles.gameCardHeader}>
                        <strong>{gameName}</strong>
                        <span className={styles.gameStatus}>{game.lifecycle}</span>
                      </div>
                      <div className={styles.gameCardBody}>
                        {gameDescription && (
                          <div className={styles.gameCardDescription}>{gameDescription}</div>
                        )}
                        <div>Type: {game.gameType}</div>
                        <div>Players: {game.players.map(p => p.name).join(', ')}</div>
                        <div className={styles.gameId}>ID: {game.gameId.substring(0, 8)}...</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className={styles.setupSection}>
            <h2>Create New Game</h2>
            <form onSubmit={handleCreateGame} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="game-type-select">Game Type</label>
                <select
                  id="game-type-select"
                  value={selectedGameType}
                  onChange={(e) => setSelectedGameType(e.target.value)}
                  disabled={loading || loadingGames}
                  className={styles.select}
                >
                  {gameTypes.map((type) => (
                    <option key={type.type} value={type.type}>
                      {type.name}
                    </option>
                  ))}
                </select>
                {gameTypes.find(t => t.type === selectedGameType)?.description && (
                  <p className={styles.gameDescription}>
                    {gameTypes.find(t => t.type === selectedGameType)?.description}
                  </p>
                )}
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="game-name-input">Game Name</label>
                <input
                  id="game-name-input"
                  type="text"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  placeholder="Enter a name for your game"
                  disabled={loading}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="game-description-input">Game Description (optional)</label>
                <textarea
                  id="game-description-input"
                  value={gameDescription}
                  onChange={(e) => setGameDescription(e.target.value)}
                  placeholder="Add a description (max 500 characters)"
                  disabled={loading}
                  maxLength={500}
                  rows={3}
                />
              </div>
              <button
                type="submit"
                className={styles.button}
                disabled={loading || !selectedGameType || !gameName.trim()}
              >
                Create Game
              </button>
            </form>
          </div>

          <div className={styles.divider}>
            <span>OR</span>
          </div>

          <div className={styles.setupSection}>
            <h2>Join Existing Game</h2>
            <form onSubmit={handleJoinGame} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="join-game-select">Select Game</label>
                <select
                  id="join-game-select"
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                  disabled={loading || loadingGames}
                  className={styles.select}
                >
                  <option value="">-- Select a game --</option>
                  {availableGames.map((game) => (
                    <option key={game.gameId} value={game.gameId}>
                      {game.gameId.substring(0, 8)}... ({game.gameType}, {game.players.length} players, {game.lifecycle})
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="join-game-id">Or enter Game ID manually</label>
                <input
                  id="join-game-id"
                  type="text"
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                  placeholder="Enter game ID or paste share link"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                className={styles.button}
                disabled={loading || !gameId.trim()}
              >
                Join Game
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Show game view if game is loaded
  const isPlayerTurn = Boolean(
    playerId && currentGame.players[currentGame.currentPlayerIndex]?.id === playerId
  );
  
  const canMakeMove = isPlayerTurn && currentGame.lifecycle === 'active';

  // Generate shareable link
  const shareLink = `${window.location.origin}${window.location.pathname}#/player?gameId=${currentGame.gameId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    // Could add a toast notification here
  };

  return (
    <div className={styles.playerView}>
      <div className={styles.gameActions}>
        <div className={styles.connectionStatus}>
          <span className={`${styles.connectionIndicator} ${connected ? styles.connected : styles.disconnected}`}>
            {connected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
        </div>
        <div className={styles.actionButtons}>
          <button
            className={styles.shareButton}
            onClick={handleCopyLink}
            aria-label="Copy share link"
            title="Copy shareable link"
          >
            📋 Share Link
          </button>
          <button
            className={styles.refreshButton}
            onClick={handleRefresh}
            disabled={loading}
            aria-label="Refresh"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      <main className={styles.content}>
        <GameDetail
          game={currentGame}
          showAdminControls={false}
          onRefresh={handleRefresh}
          currentPlayerId={playerId || undefined}
          onMakeMoveClick={currentGame.lifecycle === 'active' ? () => setShowMoveModal(true) : undefined}
          onInvite={handleInvite}
          availablePlayers={availablePlayers}
        />
        
        {currentGame.lifecycle !== 'active' && (
          <div className={styles.gameStatus}>
            {currentGame.lifecycle === 'waiting_for_players' && (
              <p>Waiting for more players to join before the game can start...</p>
            )}
            {currentGame.lifecycle === 'created' && (
              <p>Game created. Waiting for players to join...</p>
            )}
            {currentGame.lifecycle === 'completed' && (
              <p>Game completed!</p>
            )}
          </div>
        )}
      </main>

      {/* Move Input Modal */}
      {showMoveModal && currentGame.lifecycle === 'active' && (
        <Modal
          isOpen={showMoveModal}
          onClose={() => setShowMoveModal(false)}
          title="Make Your Move"
        >
          <div className={styles.moveModalContent}>
            <MoveInput
              gameType={currentGame.gameType}
              gameState={currentGame}
              playerId={playerId || ''}
              enabled={canMakeMove}
              onSubmit={async (move) => {
                await handleSubmitMove(move);
                setShowMoveModal(false);
              }}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
