import { useState, useEffect } from 'react';
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
    createGame,
    joinGame,
    submitMove,
    refreshGame,
    listAvailableGames,
  } = usePlayer();

  const [name, setName] = useState('');
  const [gameId, setGameId] = useState('');
  const [availableGames, setAvailableGames] = useState<GameState[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);

  // Load available games when component mounts
  useEffect(() => {
    const loadGames = async () => {
      setLoadingGames(true);
      const games = await listAvailableGames();
      setAvailableGames(games);
      setLoadingGames(false);
    };
    loadGames();
  }, [listAvailableGames]);

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      await createGame('tic-tac-toe', name.trim());
    }
  };

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && gameId.trim()) {
      await joinGame(gameId.trim(), name.trim());
    }
  };

  const handleSubmitMove = async (move: MoveInputType) => {
    await submitMove(move);
  };

  const handleRefresh = () => {
    refreshGame();
  };

  // Show game setup screen if no game is loaded
  if (!currentGame) {
    return (
      <div className={styles.playerView}>
        <header className={styles.header}>
          <h1>Player View</h1>
        </header>

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        <div className={styles.setupContainer}>
          <div className={styles.setupSection}>
            <h2>Create New Game</h2>
            <form onSubmit={handleCreateGame} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="create-name">Your Name</label>
                <input
                  id="create-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  disabled={loading}
                  required
                />
              </div>
              <button
                type="submit"
                className={styles.button}
                disabled={loading || !name.trim()}
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
                <label htmlFor="join-name">Your Name</label>
                <input
                  id="join-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  disabled={loading}
                  required
                />
              </div>
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
                      {game.gameId} ({game.gameType}, {game.players.length} players, {game.lifecycle})
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
                  placeholder="Enter game ID"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                className={styles.button}
                disabled={loading || !name.trim() || !gameId.trim()}
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

  return (
    <div className={styles.playerView}>
      <header className={styles.header}>
        <h1>Welcome, {playerName}</h1>
        <button
          className={styles.refreshButton}
          onClick={handleRefresh}
          disabled={loading}
          aria-label="Refresh"
        >
          Refresh
        </button>
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
