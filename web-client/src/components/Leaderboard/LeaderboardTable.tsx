import type { LeaderboardEntry } from '../../types/game';
import styles from './LeaderboardTable.module.css';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[] | undefined;
  currentUserId?: string;
  loading?: boolean;
  error?: string;
}

/**
 * LeaderboardTable Component
 * Displays a ranked list of players with their statistics
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
export function LeaderboardTable({
  entries,
  currentUserId,
  loading = false,
  error,
}: LeaderboardTableProps) {
  // Handle loading state
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading leaderboard...</div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  // Handle empty state
  if (!entries || entries.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>No players on the leaderboard yet.</div>
      </div>
    );
  }

  /**
   * Format win rate as percentage with 1 decimal place
   */
  const formatWinRate = (winRate: number): string => {
    return `${(winRate * 100).toFixed(1)}%`;
  };

  /**
   * Format large numbers with commas for readability
   */
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  return (
    <div className={styles.container}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Games</th>
            <th>Wins</th>
            <th>Losses</th>
            <th>Win Rate</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const isCurrentUser = currentUserId && entry.userId === currentUserId;
            const rowClassName = isCurrentUser
              ? `${styles.row} ${styles.currentUser}`
              : styles.row;

            return (
              <tr key={entry.userId} className={rowClassName}>
                <td className={styles.rank}>{entry.rank}</td>
                <td className={styles.player}>
                  {entry.displayName}
                  {isCurrentUser && <span className={styles.youBadge}> (You)</span>}
                </td>
                <td className={styles.stat}>{formatNumber(entry.totalGames)}</td>
                <td className={styles.stat}>{formatNumber(entry.wins)}</td>
                <td className={styles.stat}>{formatNumber(entry.losses)}</td>
                <td className={styles.stat}>{formatWinRate(entry.winRate)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
