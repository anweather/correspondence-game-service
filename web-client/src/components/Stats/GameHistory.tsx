import React from 'react';
import type { GameState, GameHistoryFilters } from '../../types/game';
import styles from './GameHistory.module.css';

interface GameHistoryProps {
  games: GameState[];
  currentUserId: string;
  filters?: GameHistoryFilters;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  loading?: boolean;
  error?: string;
  onFilterChange?: (filters: GameHistoryFilters) => void;
  onPageChange?: (page: number) => void;
  onGameClick?: (gameId: string) => void;
}

export const GameHistory: React.FC<GameHistoryProps> = ({
  games,
  currentUserId,
  filters = {},
  pagination,
  loading = false,
  error,
  onFilterChange,
  onPageChange,
  onGameClick,
}) => {
  const formatGameType = (gameType: string): string => {
    return gameType
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getOpponentName = (game: GameState): string => {
    const opponent = game.players.find((p) => p.id !== currentUserId);
    return opponent?.name || 'Unknown';
  };

  const getGameResult = (game: GameState): 'Won' | 'Lost' | 'Draw' => {
    if (game.winner === null) return 'Draw';
    if (game.winner === currentUserId) return 'Won';
    return 'Lost';
  };

  const getGameName = (game: GameState): string => {
    if (game.metadata?.gameName) {
      return game.metadata.gameName as string;
    }
    return `${formatGameType(game.gameType)} Game`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const handleFilterChange = (key: keyof GameHistoryFilters, value: string) => {
    if (!onFilterChange) return;

    const newFilters = { ...filters };
    if (value === '') {
      delete newFilters[key];
    } else {
      newFilters[key] = value as any;
    }
    onFilterChange(newFilters);
  };

  const handleGameClick = (gameId: string) => {
    if (onGameClick) {
      onGameClick(gameId);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, gameId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleGameClick(gameId);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading game history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  if (!games || games.length === 0) {
    const hasFilters = Object.keys(filters).length > 0;
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          {hasFilters ? (
            <>
              <p>No games found matching your filters.</p>
              <p>Try adjusting your search criteria.</p>
            </>
          ) : (
            <>
              <p>You haven't played any games yet.</p>
              <p>Start a new game to see your history here!</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label htmlFor="gameTypeFilter">Game Type</label>
          <select
            id="gameTypeFilter"
            value={filters.gameType || ''}
            onChange={(e) => handleFilterChange('gameType', e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">All Games</option>
            <option value="tic-tac-toe">Tic Tac Toe</option>
            <option value="connect-four">Connect Four</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="statusFilter">Status</label>
          <select
            id="statusFilter"
            value={filters.lifecycle || ''}
            onChange={(e) => handleFilterChange('lifecycle', e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      <ul className={styles.gameList} role="list">
        {games.map((game) => {
          const result = getGameResult(game);
          const resultClass = result === 'Won' 
            ? styles.won 
            : result === 'Lost' 
            ? styles.lost 
            : styles.draw;

          return (
            <li key={game.gameId} className={styles.gameItem}>
              <div
                role="button"
                tabIndex={0}
                className={styles.gameCard}
                onClick={() => handleGameClick(game.gameId)}
                onKeyDown={(e) => handleKeyDown(e, game.gameId)}
              >
                <div className={styles.gameHeader}>
                  <h3 className={styles.gameName}>{getGameName(game)}</h3>
                  <span className={`${styles.result} ${resultClass}`}>
                    {result}
                  </span>
                </div>

                <div className={styles.gameDetails}>
                  <span className={styles.gameType}>
                    {formatGameType(game.gameType)}
                  </span>
                  <span className={styles.opponent}>vs {getOpponentName(game)}</span>
                  <span className={styles.turns}>
                    {game.moveHistory.length} turns
                  </span>
                  <span className={styles.date}>
                    {formatDate(game.updatedAt)}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {pagination && pagination.totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            onClick={() => onPageChange?.(pagination.page - 1)}
            disabled={pagination.page === 1}
            className={styles.paginationButton}
            aria-label="Previous page"
          >
            Previous
          </button>

          <span className={styles.pageInfo}>
            Page {pagination.page} of {pagination.totalPages}
          </span>

          <button
            onClick={() => onPageChange?.(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
            className={styles.paginationButton}
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
