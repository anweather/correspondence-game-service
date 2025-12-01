import type { GameState } from '../../types/game';
import styles from './GameCard.module.css';

export interface GameCardProps {
  game: GameState;
  onJoin: (gameId: string) => void;
  onClick: (gameId: string) => void;
}

export function GameCard({ game, onJoin, onClick }: GameCardProps) {
  const handleClick = () => {
    onClick(game.gameId);
  };

  const handleJoin = (e: React.MouseEvent) => {
    e.stopPropagation();
    onJoin(game.gameId);
  };

  const gameName = game.metadata?.gameName || game.gameId;
  const gameDescription = game.metadata?.gameDescription;
  const maxPlayers = 2; // Default for most games
  const isWaiting = game.lifecycle === 'waiting_for_players';
  const isFull = game.players.length >= maxPlayers;
  const isCompleted = game.lifecycle === 'completed';
  const canJoin = isWaiting && !isFull && !isCompleted;

  return (
    <div className={styles.gameCard} onClick={handleClick}>
      <div className={styles.gameHeader}>
        <h3 className={styles.gameName}>{gameName}</h3>
      </div>
      
      {gameDescription && (
        <p className={styles.gameDescription}>{gameDescription}</p>
      )}
      
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
      </div>
      
      <div className={styles.actions}>
        {canJoin && (
          <button
            className={styles.joinButton}
            onClick={handleJoin}
            aria-label="Join game"
          >
            Join Game
          </button>
        )}
        
        {isFull && !isCompleted && (
          <button
            className={styles.viewButton}
            onClick={handleJoin}
            aria-label="View game"
          >
            View Game
          </button>
        )}
      </div>
    </div>
  );
}
