import { useMemo } from 'react';
import type { GameState } from '../../types/game';
import styles from './GameDetail.module.css';

interface GameDetailProps {
  game: GameState;
  showAdminControls?: boolean;
  onRefresh?: () => void;
  currentPlayerId?: string;
  onMakeMoveClick?: () => void;
}

export function GameDetail({ 
  game, 
  showAdminControls = false, 
  onRefresh,
  currentPlayerId,
  onMakeMoveClick
}: GameDetailProps) {
  const boardSvgUrl = useMemo(() => {
    // Add version as cache-busting parameter to force image reload
    return `/api/games/${game.gameId}/board.svg?v=${game.version}`;
  }, [game.gameId, game.version]);

  const currentPlayer = game.players[game.currentPlayerIndex];
  const isCurrentPlayerTurn = currentPlayerId && currentPlayer?.id === currentPlayerId;

  return (
    <div className={styles.gameDetail}>
      {/* Game Metadata */}
      <div className={styles.metadata}>
        <h2>Game: {game.gameId}</h2>
        <div className={styles.metadataGrid}>
          <div className={styles.metadataItem}>
            <span className={styles.label}>Type:</span>
            <span className={styles.value}>{game.gameType}</span>
          </div>
          <div className={styles.metadataItem}>
            <span className={styles.label}>Status:</span>
            <span className={styles.value}>{game.lifecycle}</span>
          </div>
          <div className={styles.metadataItem}>
            <span className={styles.label}>Turn:</span>
            <span className={styles.value}>
              {game.moveHistory.length} ({currentPlayer?.name || 'Unknown'}'s turn)
            </span>
          </div>
        </div>
        {currentPlayerId && (
          <div className={styles.turnIndicator}>
            {isCurrentPlayerTurn ? (
              <span className={styles.yourTurn}>Your turn</span>
            ) : (
              <span className={styles.waiting}>Waiting for {currentPlayer?.name}</span>
            )}
          </div>
        )}
        {onRefresh && (
          <button 
            className={styles.refreshButton} 
            onClick={onRefresh}
            aria-label="Refresh game"
          >
            Refresh
          </button>
        )}
      </div>

      {/* Board Display */}
      <div className={styles.boardContainer}>
        <img 
          src={boardSvgUrl} 
          alt="Game board" 
          className={styles.boardImage}
        />
        {onMakeMoveClick && game.lifecycle === 'active' && (
          <button
            className={`${styles.makeMoveButton} ${isCurrentPlayerTurn ? styles.enabled : styles.disabled}`}
            onClick={onMakeMoveClick}
            disabled={!isCurrentPlayerTurn}
            aria-label={isCurrentPlayerTurn ? 'Make your move' : 'Not your turn'}
          >
            {isCurrentPlayerTurn ? '🎯 Make Move' : '⏳ Waiting...'}
          </button>
        )}
      </div>

      {/* Player List */}
      <div className={styles.playerList}>
        <h3>Players</h3>
        {game.players.length === 0 ? (
          <p className={styles.emptyState}>No players yet</p>
        ) : (
          <ul className={styles.players}>
            {game.players.map((player, index) => (
              <li 
                key={player.id}
                className={`${styles.player} ${index === game.currentPlayerIndex ? styles.currentTurn : ''}`}
              >
                <span className={styles.playerNumber}>{index + 1}.</span>
                <span className={styles.playerName}>{player.name}</span>
                <span className={styles.playerId}>({player.id})</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Move History */}
      <div className={styles.moveHistory}>
        <h3>Move History</h3>
        {game.moveHistory.length === 0 ? (
          <p className={styles.emptyState}>No moves yet</p>
        ) : (
          <ul className={styles.moves}>
            {game.moveHistory.map((move, index) => {
              const player = game.players.find(p => p.id === move.playerId);
              return (
                <li key={index} className={styles.move}>
                  <span className={styles.moveNumber}>Turn {index + 1}:</span>
                  <span className={styles.movePlayer}>{player?.name || 'Unknown'}</span>
                  <span className={styles.moveAction}>{move.action}</span>
                  <span className={styles.moveParameters}>
                    {Object.entries(move.parameters).map(([key, value]) => (
                      <span key={key}>{key}: {value}</span>
                    )).reduce((prev, curr) => <>{prev}, {curr}</>)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Admin Controls */}
      {showAdminControls && (
        <div className={styles.adminControls}>
          <h3>Admin Controls</h3>
          <p>Admin controls placeholder</p>
        </div>
      )}
    </div>
  );
}
