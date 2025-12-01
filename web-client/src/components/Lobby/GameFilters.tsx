import type { GameLifecycle } from '../../types/game';
import styles from './GameFilters.module.css';

export interface GameFiltersState {
  gameType?: string;
  playerCount?: string;
  lifecycle?: GameLifecycle;
  search: string;
}

export interface GameFiltersProps {
  filters: GameFiltersState;
  onFilterChange: (filters: GameFiltersState) => void;
}

export function GameFilters({ filters, onFilterChange }: GameFiltersProps) {
  const handleGameTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onFilterChange({
      ...filters,
      gameType: value === '' ? undefined : value,
    });
  };

  const handlePlayerCountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onFilterChange({
      ...filters,
      playerCount: value === '' ? undefined : value,
    });
  };

  const handleLifecycleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onFilterChange({
      ...filters,
      lifecycle: value === '' ? undefined : (value as GameLifecycle),
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({
      ...filters,
      search: e.target.value,
    });
  };

  return (
    <div className={styles.filters}>
      <div className={styles.filterGroup}>
        <label htmlFor="gameType" className={styles.label}>
          Game Type
        </label>
        <select
          id="gameType"
          className={styles.select}
          value={filters.gameType || ''}
          onChange={handleGameTypeChange}
        >
          <option value="">All Types</option>
          <option value="tic-tac-toe">Tic-Tac-Toe</option>
          <option value="connect-four">Connect Four</option>
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label htmlFor="playerCount" className={styles.label}>
          Players
        </label>
        <select
          id="playerCount"
          className={styles.select}
          value={filters.playerCount || ''}
          onChange={handlePlayerCountChange}
        >
          <option value="">Any</option>
          <option value="2">2 Players</option>
          <option value="3">3 Players</option>
          <option value="4">4 Players</option>
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label htmlFor="status" className={styles.label}>
          Status
        </label>
        <select
          id="status"
          className={styles.select}
          value={filters.lifecycle || ''}
          onChange={handleLifecycleChange}
        >
          <option value="">All</option>
          <option value="waiting_for_players">Waiting for Players</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label htmlFor="search" className={styles.visuallyHidden}>
          Search
        </label>
        <input
          id="search"
          type="text"
          className={styles.searchInput}
          placeholder="Search games..."
          value={filters.search}
          onChange={handleSearchChange}
        />
      </div>
    </div>
  );
}
