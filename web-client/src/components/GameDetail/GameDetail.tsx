import { useMemo, useState } from 'react';
import type { GameState } from '../../types/game';
import { InviteModal } from '../Invitations';
import styles from './GameDetail.module.css';

interface GameDetailProps {
  game: GameState;
  showAdminControls?: boolean;
  onRefresh?: () => void;
  currentPlayerId?: string;
  onMakeMoveClick?: () => void;
  impersonatedPlayer?: string | null;
  onImpersonate?: (playerId: string) => void;
  onAddPlayer?: (playerName: string) => Promise<void>;
  maxPlayers?: number;
  onInvite?: (playerIds: string[]) => Promise<void>;
  availablePlayers?: Array<{ userId: string; displayName: string }>;
}

export function GameDetail({ 
  game, 
  showAdminControls = false, 
  onRefresh,
  currentPlayerId,
  onMakeMoveClick,
  impersonatedPlayer,
  onImpersonate,
  onAddPlayer,
  maxPlayers,
  onInvite,
  availablePlayers = []
}: GameDetailProps) {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const boardSvgUrl = useMemo(() => {
    // Add version as cache-busting parameter to force image reload
    return `/api/games/${game.gameId}/board.svg?v=${game.version}`;
  }, [game.gameId, game.version]);

  const currentPlayer = game.players[game.currentPlayerIndex];
  const isCurrentPlayerTurn = currentPlayerId && currentPlayer?.id === currentPlayerId;
  const isCompleted = game.lifecycle === 'completed';
  const winner = game.winner !== undefined && game.winner !== null 
    ? game.players.find(p => p.id === game.winner) 
    : null;
  const isDraw = isCompleted && game.winner === null;

  // Use provided maxPlayers or default to 2 if not available
  const effectiveMaxPlayers = maxPlayers ?? 2;
  const isGameFull = game.players.length >= effectiveMaxPlayers;

  const handleAddPlayer = async () => {
    if (!onAddPlayer) return;
    
    const trimmedName = newPlayerName.trim();
    if (!trimmedName) {
      return;
    }

    setIsAdding(true);
    try {
      await onAddPlayer(trimmedName);
      setNewPlayerName('');
    } finally {
      setIsAdding(false);
    }
  };

  const handleImpersonate = (playerId: string) => {
    if (onImpersonate) {
      onImpersonate(playerId);
    }
  };

  const handleInviteClick = () => {
    setIsInviteModalOpen(true);
    setInviteError(null);
  };

  const handleInviteClose = () => {
    setIsInviteModalOpen(false);
    setInviteError(null);
  };

  const handleInviteSubmit = async (playerIds: string[]) => {
    if (!onInvite) return;

    setInviteLoading(true);
    setInviteError(null);

    try {
      await onInvite(playerIds);
      setIsInviteModalOpen(false);
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : 'Failed to send invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  // Check if current player is a participant in the game
  const isParticipant = currentPlayerId && game.players.some(p => p.id === currentPlayerId);
  
  // Show invite button only for participants in non-completed games
  const showInviteButton = onInvite && isParticipant && game.lifecycle !== 'completed';

  // Extract game name and description from metadata
  const gameName = (game.metadata as any)?.gameName || game.gameId;
  const gameDescription = (game.metadata as any)?.gameDescription;

  return (
    <div className={styles.gameDetail}>
      {/* Game Metadata */}
      <div className={styles.metadata}>
        <h2>{gameName}</h2>
        {gameDescription && (
          <p className={styles.gameDescription}>{gameDescription}</p>
        )}
        <div className={styles.gameIdDisplay}>
          <span className={styles.label}>Game ID:</span>
          <span className={styles.value}>{game.gameId}</span>
        </div>
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
        {isCompleted && winner && (
          <div className={styles.winnerBanner}>
            <span className={styles.winnerText}>🏆 {winner.name} wins!</span>
          </div>
        )}
        {isDraw && (
          <div className={styles.drawBanner}>
            <span className={styles.drawText}>Game ended in a draw</span>
          </div>
        )}
        {isCompleted && !winner && !isDraw && (
          <div className={styles.completedBanner}>
            <span className={styles.completedText}>🏁 Game Complete</span>
          </div>
        )}
        {currentPlayerId && game.lifecycle === 'active' && (
          <div className={styles.turnIndicator}>
            {isCurrentPlayerTurn ? (
              <span className={styles.yourTurn}>Your turn</span>
            ) : (
              <span className={styles.waiting}>Waiting for {currentPlayer?.name}</span>
            )}
          </div>
        )}
        <div className={styles.actionButtons}>
          {showInviteButton && (
            <button
              className={styles.inviteButton}
              onClick={handleInviteClick}
              aria-label="Invite player"
            >
              Invite Player
            </button>
          )}
        </div>
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
            {game.players.map((player, index) => {
              const isImpersonated = showAdminControls && impersonatedPlayer === player.id;
              return (
                <li 
                  key={player.id}
                  className={`${styles.player} ${index === game.currentPlayerIndex ? styles.currentTurn : ''} ${isImpersonated ? styles.impersonated : ''}`}
                >
                  <div className={styles.playerInfo}>
                    <span className={styles.playerNumber}>{index + 1}.</span>
                    <span className={styles.playerName}>{player.name}</span>
                    <span className={styles.playerId}>({player.id})</span>
                    {isImpersonated && (
                      <span className={styles.activeIndicator}>Active</span>
                    )}
                  </div>
                  {showAdminControls && onImpersonate && (
                    <button
                      className={styles.impersonateButton}
                      onClick={() => handleImpersonate(player.id)}
                      aria-label={`Impersonate ${player.name}`}
                    >
                      Impersonate
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        
        {/* Add Player Form (Admin Only) */}
        {showAdminControls && onAddPlayer && !isGameFull && (
          <div className={styles.addPlayerForm}>
            <input
              type="text"
              className={styles.playerInput}
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="New player name"
              disabled={isAdding}
            />
            <button
              className={styles.addButton}
              onClick={handleAddPlayer}
              disabled={isAdding}
              aria-label="Add player"
            >
              {isAdding ? 'Adding...' : 'Add Player'}
            </button>
          </div>
        )}

        {showAdminControls && isGameFull && game.lifecycle !== 'completed' && (
          <p className={styles.gameFull}>Game is full ({game.players.length}/{effectiveMaxPlayers} players)</p>
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

      {/* Invite Modal */}
      {onInvite && (
        <InviteModal
          isOpen={isInviteModalOpen}
          gameId={game.gameId}
          onClose={handleInviteClose}
          onInvite={handleInviteSubmit}
          availablePlayers={availablePlayers}
          loading={inviteLoading}
          error={inviteError}
        />
      )}
    </div>
  );
}
