import type { GameState } from '../../types/game';
import styles from './GameList.module.css';

export interface GameListProps {
  games: GameState[];
  onSelect: (gameId: string) => void;
  onDelete: (gameId: string) => void;
}

export function GameList({ games, onSelect, onDelete }: GameListProps) {
  if (games.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No games found</p>
      </div>
    );
  }

  return (
    <div className={styles.gameList}>
      {games.map((game) => (
        <GameListItem
          key={game.gameId}
          game={game}
          onSelect={onSelect}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

interface GameListItemProps {
  game: GameState;
  onSelect: (gameId: string) => void;
  onDelete: (gameId: string) => void;
}

function GameListItem({ game, onSelect, onDelete }: GameListItemProps) {
  const handleClick = () => {
    onSelect(game.gameId);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(game.gameId);
  };

  const currentPlayer = game.players[game.currentPlayerIndex];
  const turnNumber = game.moveHistory.length;
  const maxPlayers = 2; // Default for most games

  return (
    <div className={styles.gameCard} onClick={handleClick}>
      <div className={styles.gameHeader}>
        <h3 className={styles.gameId}>{game.gameId}</h3>
        <button
          className={styles.deleteButton}
          onClick={handleDelete}
          aria-label="Delete game"
        >
          Delete
        </button>
      </div>
      <div className={styles.gameInfo}>
        <div className={styles.infoRow}>
          <span className={styles.label}>Type:</span>
          <span className={styles.value}>{game.gameType}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.label}>Players:</span>
          <span className={styles.value}>
            {game.players.length}/{maxPlayers}
          </span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.label}>Status:</span>
          <span className={styles.value}>{game.lifecycle}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.label}>Turn:</span>
          <span className={styles.value}>
            {turnNumber}
            {currentPlayer && ` (${currentPlayer.name})`}
          </span>
        </div>
      </div>
    </div>
  );
}
