import { useState, useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { GameDetail } from '../components/GameDetail/GameDetail';
import { MoveInput } from '../components/MoveInput/MoveInput';
import type { MoveInput as MoveInputType, GameState } from '../types/game';
import styles from './PlayerView.module.css';

/**
 * PlayerView component
 * Main view for players to create, join, and play games
 */
export function PlayerView() {
  const {
    currentGame,
    playerId,
    playerName,
    loading,
    error,
    login,
    logout,
    getKnownPlayerNames,
    createGame,
    joinGame,
    loadGame,
    submitMove,
    refreshGame,
    listAvailableGames,
    listMyGames,
  } = usePlayer();

  const [name, setName] = useState('');
  const [gameId, setGameId] = useState('');
  const [availableGames, setAvailableGames] = useState<GameState[]>([]);
  const [myGames, setMyGames] = useState<GameState[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [knownPlayers, setKnownPlayers] = useState<string[]>([]);
  const isInitialMount = useRef(true);

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
    if (!playerName || currentGame) {
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
      // Auto-load game from URL
      loadGame(gameIdParam);
    }
  }, [playerName, currentGame, loadGame]);

  // Load available games and my games when logged in
  useEffect(() => {
    if (playerName && !currentGame) {
      const loadGames = async () => {
        setLoadingGames(true);
        const [available, mine] = await Promise.all([
          listAvailableGames(),
          listMyGames(),
        ]);
        setAvailableGames(available);
        setMyGames(mine);
        setLoadingGames(false);
      };
      loadGames();
    }
  }, [playerName, currentGame, listAvailableGames, listMyGames]);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      await login(name.trim());
      setName('');
    }
  };

  const handleLogout = () => {
    logout();
    // Clear URL parameters from hash
    window.history.replaceState({}, '', `${window.location.pathname}#/player`);
  };

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    await createGame('tic-tac-toe');
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

  // Show login screen if not logged in
  if (!playerName) {
    return (
      <div className={styles.playerView}>
        <header className={styles.header}>
          <h1>Welcome to Async Boardgame</h1>
        </header>

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        <div className={styles.loginContainer}>
          <div className={styles.loginSection}>
            <h2>Enter Your Name</h2>
            <p className={styles.loginDescription}>
              Your identity will be saved across sessions
            </p>
            <form onSubmit={handleLogin} className={styles.form}>
              {knownPlayers.length > 0 && (
                <div className={styles.formGroup}>
                  <label htmlFor="known-players">Select Previous Name</label>
                  <select
                    id="known-players"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    className={styles.select}
                  >
                    <option value="">-- Select a name --</option>
                    {knownPlayers.map((playerName) => (
                      <option key={playerName} value={playerName}>
                        {playerName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className={styles.formGroup}>
                <label htmlFor="login-name">
                  {knownPlayers.length > 0 ? 'Or Enter New Name' : 'Your Name'}
                </label>
                <input
                  id="login-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  disabled={loading}
                  required
                  autoFocus={knownPlayers.length === 0}
                />
              </div>
              <button
                type="submit"
                className={styles.button}
                disabled={loading || !name.trim()}
              >
                {loading ? 'Loading...' : 'Continue'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Show game setup screen if no game is loaded
  if (!currentGame) {
    return (
      <div className={styles.playerView}>
        <header className={styles.header}>
          <h1>Welcome, {playerName}</h1>
          <button
            className={styles.logoutButton}
            onClick={handleLogout}
            aria-label="Logout"
          >
            Logout
          </button>
        </header>

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        <div className={styles.setupContainer}>
          {myGames.length > 0 && (
            <div className={styles.myGamesSection}>
              <h2>My Games</h2>
              <div className={styles.gamesList}>
                {myGames.map((game) => (
                  <div
                    key={game.gameId}
                    className={styles.gameCard}
                    onClick={() => loadGame(game.gameId)}
                  >
                    <div className={styles.gameCardHeader}>
                      <strong>{game.gameType}</strong>
                      <span className={styles.gameStatus}>{game.lifecycle}</span>
                    </div>
                    <div className={styles.gameCardBody}>
                      <div>Players: {game.players.map(p => p.name).join(', ')}</div>
                      <div className={styles.gameId}>ID: {game.gameId.substring(0, 8)}...</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.setupSection}>
            <h2>Create New Game</h2>
            <form onSubmit={handleCreateGame} className={styles.form}>
              <button
                type="submit"
                className={styles.button}
                disabled={loading}
              >
                Create Tic-Tac-Toe Game
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

  // Generate shareable link
  const shareLink = `${window.location.origin}${window.location.pathname}#/player?gameId=${currentGame.gameId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    // Could add a toast notification here
  };

  return (
    <div className={styles.playerView}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Welcome, {playerName}</h1>
          <button
            className={styles.logoutButton}
            onClick={handleLogout}
            aria-label="Logout"
          >
            Logout
          </button>
        </div>
        <div className={styles.headerRight}>
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
      </header>

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
        />
        <MoveInput
          gameType={currentGame.gameType}
          gameState={currentGame}
          playerId={playerId || ''}
          enabled={isPlayerTurn}
          onSubmit={handleSubmitMove}
        />
      </main>
    </div>
  );
}
