import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { GameClient } from '../api/gameClient';
import { usePlayer } from '../context/PlayerContext';
import { LeaderboardTable } from '../components/Leaderboard/LeaderboardTable';
import type { LeaderboardEntry, PaginatedResult } from '../types/game';
import styles from './LeaderboardView.module.css';

/**
 * Leaderboard View - Global player rankings
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 16.1, 16.2, 16.3, 16.4, 16.5
 */
export function LeaderboardView() {
  const { getToken } = useAuth();
  const { playerId } = usePlayer();
  const [leaderboard, setLeaderboard] = useState<PaginatedResult<LeaderboardEntry> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameType, setGameType] = useState<string>('');
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const gameClient = new GameClient('/api', getToken);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await gameClient.getLeaderboard(
        gameType || undefined,
        { page, pageSize }
      );
      setLeaderboard(data);
      // Sync page state with response if different
      if (data.page !== page) {
        setPage(data.page);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [gameType, page]);

  const handleGameTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setGameType(e.target.value);
    setPage(1); // Reset to first page when filter changes
  };

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (leaderboard && page < leaderboard.totalPages) {
      setPage(page + 1);
    }
  };

  const handleRetry = () => {
    fetchLeaderboard();
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <h1>Leaderboard</h1>
        <div className={styles.loading}>Loading leaderboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <h1>Leaderboard</h1>

        <div className={styles.filters}>
          <label htmlFor="gameTypeFilter">
            Filter by game type:
            <select
              id="gameTypeFilter"
              value={gameType}
              onChange={handleGameTypeChange}
              className={styles.select}
            >
              <option value="">All Games</option>
              <option value="tic-tac-toe">Tic-Tac-Toe</option>
              <option value="connect-four">Connect Four</option>
            </select>
          </label>
        </div>

        <div className={styles.error}>
          <p>Failed to load leaderboard: {error}</p>
          <button onClick={handleRetry} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isEmpty = !leaderboard || leaderboard.items.length === 0;

  return (
    <div className={styles.container}>
      <h1>Leaderboard</h1>

      <div className={styles.filters}>
        <label htmlFor="gameTypeFilter">
          Filter by game type:
          <select
            id="gameTypeFilter"
            value={gameType}
            onChange={handleGameTypeChange}
            className={styles.select}
          >
            <option value="">All Games</option>
            <option value="tic-tac-toe">Tic-Tac-Toe</option>
            <option value="connect-four">Connect Four</option>
          </select>
        </label>
      </div>

      {isEmpty ? (
        <div className={styles.empty}>
          <p>No players on the leaderboard yet.</p>
          <p>Be the first to play and earn your spot!</p>
        </div>
      ) : (
        <>
          <LeaderboardTable
            entries={leaderboard.items}
            currentUserId={playerId || undefined}
          />

          {leaderboard.totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                onClick={handlePreviousPage}
                disabled={page === 1}
                className={styles.paginationButton}
              >
                Previous
              </button>
              <span className={styles.pageInfo}>
                Page {page} of {leaderboard.totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={page === leaderboard.totalPages}
                className={styles.paginationButton}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
