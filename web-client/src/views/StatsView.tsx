import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { StatsOverview } from '../components/Stats/StatsOverview';
import { GameHistory } from '../components/Stats/GameHistory';
import { usePlayer } from '../context/PlayerContext';
import { GameClient } from '../api/gameClient';
import type { PlayerStats, GameState, GameHistoryFilters } from '../types/game';
import styles from './StatsView.module.css';

export const StatsView: React.FC = () => {
  const { playerId } = usePlayer();
  const { getToken } = useAuth();
  const gameClient = useMemo(() => {
    return new GameClient('/api', getToken);
  }, [getToken]);
  
  const [stats, setStats] = useState<PlayerStats | undefined>(undefined);
  const [gameHistory, setGameHistory] = useState<GameState[]>([]);
  const [selectedGameType, setSelectedGameType] = useState<string>('');
  const [historyFilters, setHistoryFilters] = useState<GameHistoryFilters>({});
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  });
  
  const [statsLoading, setStatsLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Fetch player stats
  const fetchStats = async (gameType?: string) => {
    if (!playerId) return;
    
    setStatsLoading(true);
    setStatsError(null);
    
    try {
      const data = await gameClient.getPlayerStats(gameType || undefined);
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setStatsError('Failed to load statistics');
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch game history
  const fetchGameHistory = async (filters: GameHistoryFilters) => {
    if (!playerId) return;
    
    setHistoryLoading(true);
    setHistoryError(null);
    
    try {
      const response = await gameClient.getGameHistory(filters);
      setGameHistory(response.items);
      setPagination({
        page: response.page,
        pageSize: response.pageSize,
        total: response.total,
        totalPages: response.totalPages,
      });
    } catch (error) {
      console.error('Failed to fetch game history:', error);
      setHistoryError('Failed to load game history');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (playerId) {
      fetchStats();
      fetchGameHistory({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  // Handle game type filter change
  const handleGameTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const gameType = event.target.value;
    setSelectedGameType(gameType);
    
    // Update filters
    const newFilters: GameHistoryFilters = { ...historyFilters };
    if (gameType) {
      newFilters.gameType = gameType;
    } else {
      delete newFilters.gameType;
    }
    setHistoryFilters(newFilters);
    
    // Fetch new data
    fetchStats(gameType || undefined);
    fetchGameHistory(newFilters);
  };

  // Handle history filter change
  const handleHistoryFilterChange = (filters: GameHistoryFilters) => {
    setHistoryFilters(filters);
    fetchGameHistory(filters);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    const newFilters = { ...historyFilters, page };
    setHistoryFilters(newFilters);
    fetchGameHistory(newFilters);
  };

  // Handle retry
  const handleRetry = () => {
    fetchStats(selectedGameType || undefined);
    fetchGameHistory(historyFilters);
  };

  // Loading state
  const isLoading = statsLoading || historyLoading;

  if (isLoading && !stats && (!gameHistory || gameHistory.length === 0)) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading statistics...</div>
      </div>
    );
  }

  // Don't render if no playerId
  if (!playerId) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Statistics</h1>
        
        <div className={styles.filterSection}>
          <label htmlFor="gameTypeFilter">Filter by Game Type</label>
          <select
            id="gameTypeFilter"
            value={selectedGameType}
            onChange={handleGameTypeChange}
            className={styles.filterSelect}
          >
            <option value="">All Games</option>
            <option value="tic-tac-toe">Tic Tac Toe</option>
            <option value="connect-four">Connect Four</option>
          </select>
        </div>
      </header>

      {statsError && (
        <div className={styles.errorSection}>
          <p className={styles.error}>{statsError}</p>
          <button onClick={handleRetry} className={styles.retryButton}>
            Retry
          </button>
        </div>
      )}

      <div className={styles.content}>
        <section className={styles.overviewSection}>
          <StatsOverview
            stats={stats}
            loading={statsLoading}
            error={statsError || undefined}
          />
        </section>

        <section className={styles.historySection}>
          <h2>Game History</h2>
          <GameHistory
            games={gameHistory}
            currentUserId={playerId}
            filters={historyFilters}
            pagination={pagination.totalPages > 1 ? pagination : undefined}
            loading={historyLoading}
            error={historyError || undefined}
            onFilterChange={handleHistoryFilterChange}
            onPageChange={handlePageChange}
          />
        </section>
      </div>
    </div>
  );
};
