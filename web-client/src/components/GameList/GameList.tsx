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
  const isCompleted = game.lifecycle === 'completed';
  const winner = game.winner !== undefined && game.winner !== null 
    ? game.players.find(p => p.id === game.winner) 
    : null;
  const isDraw = isCompleted && game.winner === null;

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
          <span className={`${styles.value} ${isCompleted ? styles.completedStatus : ''}`}>
            {isCompleted ? '🏁 Completed' : game.lifecycle}
          </span>
        </div>
        {isCompleted && winner && (
          <div className={styles.winnerRow}>
            <span className={styles.label}>Winner:</span>
            <span className={styles.winnerValue}>🏆 {winner.name}</span>
          </div>
        )}
        {isDraw && (
          <div className={styles.drawRow}>
            <span className={styles.label}>Result:</span>
            <span className={styles.drawValue}>Draw</span>
          </div>
        )}
        {!isCompleted && (
          <div className={styles.infoRow}>
            <span className={styles.label}>Turn:</span>
            <span className={styles.value}>
              {turnNumber}
              {currentPlayer && ` (${currentPlayer.name})`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
