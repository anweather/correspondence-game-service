import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameCard } from '../components/Lobby/GameCard';
import { GameFilters, type GameFiltersState } from '../components/Lobby/GameFilters';
import { GameClient } from '../api/gameClient';
import type { GameState } from '../types/game';
import styles from './LobbyView.module.css';

export function LobbyView() {
  const navigate = useNavigate();
  const [games, setGames] = useState<GameState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<GameFiltersState>({
    gameType: undefined,
    playerCount: undefined,
    lifecycle: 'waiting_for_players', // Default to waiting_for_players to hide completed games
    search: '',
  });

  const gameClient = useMemo(() => new GameClient(), []);

  const loadGames = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await gameClient.listGames({});
      setGames(response.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGames();
  }, []);

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      // Filter by game type
      if (filters.gameType && game.gameType !== filters.gameType) {
        return false;
      }

      // Filter by lifecycle/status
      if (filters.lifecycle && game.lifecycle !== filters.lifecycle) {
        return false;
      }

      // Filter by player count
      if (filters.playerCount) {
        const count = parseInt(filters.playerCount, 10);
        if (game.players.length !== count) {
          return false;
        }
      }

      // Filter by search text
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const gameName = game.metadata?.gameName?.toLowerCase() || '';
        const gameDescription = game.metadata?.gameDescription?.toLowerCase() || '';
        const gameType = game.gameType.toLowerCase();
        
        if (
          !gameName.includes(searchLower) &&
          !gameDescription.includes(searchLower) &&
          !gameType.includes(searchLower)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [games, filters]);

  const handleFilterChange = (newFilters: GameFiltersState) => {
    setFilters(newFilters);
  };

  const handleJoinGame = async (gameId: string) => {
    try {
      setError(null);
      await gameClient.joinGame(gameId);
      // Navigate to the game after successful join
      navigate(`/game/${gameId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join game');
    }
  };

  const handleGameClick = (gameId: string) => {
    // Navigate to player view with gameId parameter
    navigate(`/?gameId=${gameId}`);
  };

  const handleRetry = () => {
    loadGames();
  };



  if (loading) {
    return (
      <div className={styles.lobbyView}>
        <div className={styles.header}>
          <h1>Lobby</h1>
        </div>
        <div className={styles.loading}>
          <p>Loading games...</p>
        </div>
      </div>
    );
  }

  if (error && games.length === 0) {
    return (
      <div className={styles.lobbyView}>
        <div className={styles.header}>
          <h1>Lobby</h1>
        </div>
        <div className={styles.error} role="alert">
          <p>Failed to load games: {error}</p>
          <button
            className={styles.retryButton}
            onClick={handleRetry}
            aria-label="Retry"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.lobbyView}>
      <div className={styles.header}>
        <h1>Lobby</h1>
      </div>

      {error && (
        <div className={styles.errorBanner} role="alert">
          {error}
        </div>
      )}

      <div className={styles.content}>
        <GameFilters
          filters={filters}
          onFilterChange={handleFilterChange}
        />

        {filteredGames.length === 0 ? (
          <div className={styles.emptyState}>
            {games.length === 0 ? (
              <p>No games available. Create a new game to get started!</p>
            ) : (
              <p>No games match your filters. Try adjusting your search criteria.</p>
            )}
          </div>
        ) : (
          <div className={styles.gameGrid}>
            {filteredGames.map((game) => (
              <article key={game.gameId}>
                <GameCard
                  game={game}
                  onJoin={handleJoinGame}
                  onClick={handleGameClick}
                />
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
