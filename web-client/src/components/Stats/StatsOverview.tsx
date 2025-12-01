import React from 'react';
import type { PlayerStats } from '../../types/game';
import styles from './StatsOverview.module.css';

interface StatsOverviewProps {
  stats?: PlayerStats;
  gameTypeStats?: PlayerStats[];
  loading?: boolean;
  error?: string;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  stats,
  gameTypeStats,
  loading,
  error,
}) => {
  // Format game type name for display
  const formatGameType = (gameType: string): string => {
    return gameType
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Format number with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  // Format win rate as percentage
  const formatWinRate = (rate: number): string => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.statsOverview}>
        <p>Loading statistics...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.statsOverview}>
        <p className={styles.error}>{error}</p>
      </div>
    );
  }

  // No stats available
  if (!stats) {
    return (
      <div className={styles.statsOverview}>
        <p>No statistics available</p>
      </div>
    );
  }

  // Check if player has no games
  const hasNoGames = stats.totalGames === 0;

  return (
    <div className={styles.statsOverview}>
      <h2>{stats.gameType ? formatGameType(stats.gameType) : 'Overall'} Statistics</h2>

      {hasNoGames ? (
        <div className={styles.noGames}>
          <p>No games played yet</p>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Total Games</span>
              <span className={styles.statValue}>0</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Win Rate</span>
              <span className={styles.statValue}>0.0%</span>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Total Games</span>
              <span className={styles.statValue}>{formatNumber(stats.totalGames)}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Wins</span>
              <span className={styles.statValue}>{formatNumber(stats.wins)}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Losses</span>
              <span className={styles.statValue}>{formatNumber(stats.losses)}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Draws</span>
              <span className={styles.statValue}>{formatNumber(stats.draws)}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Win Rate</span>
              <span className={styles.statValue}>{formatWinRate(stats.winRate)}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Total Turns</span>
              <span className={styles.statValue}>{formatNumber(stats.totalTurns)}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Avg Turns/Game</span>
              <span className={styles.statValue}>
                {stats.averageTurnsPerGame.toFixed(1)}
              </span>
            </div>
          </div>

          {gameTypeStats && gameTypeStats.length > 0 && (
            <div className={styles.gameTypeBreakdown}>
              <h3>By Game Type</h3>
              <div className={styles.gameTypeList}>
                {gameTypeStats.map((gameStats) => (
                  <div key={gameStats.gameType || 'overall'} className={styles.gameTypeCard}>
                    <h4>{gameStats.gameType ? formatGameType(gameStats.gameType) : 'Overall'}</h4>
                    <div className={styles.gameTypeStats}>
                      <span>
                        {formatNumber(gameStats.totalGames)} games
                      </span>
                      <span>
                        {formatNumber(gameStats.wins)} wins
                      </span>
                      <span>
                        {formatWinRate(gameStats.winRate)} win rate
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
