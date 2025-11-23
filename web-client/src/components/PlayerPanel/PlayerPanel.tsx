import { useState } from 'react';
import type { GameState, MoveInput } from '../../types/game';
import { MoveInput as MoveInputComponent } from '../MoveInput/MoveInput';
import styles from './PlayerPanel.module.css';

/**
 * Props for PlayerPanel component
 */
export interface PlayerPanelProps {
  game: GameState;
  impersonatedPlayer: string | null;
  onImpersonate: (playerId: string) => void;
  onAddPlayer: (playerName: string) => Promise<void>;
  onSubmitMove: (move: MoveInput) => Promise<void>;
  maxPlayers?: number;
}

/**
 * PlayerPanel component
 * Displays list of players with impersonation controls and add player form
 */
export function PlayerPanel({
  game,
  impersonatedPlayer,
  onImpersonate,
  onAddPlayer,
  onSubmitMove,
  maxPlayers,
}: PlayerPanelProps) {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Use provided maxPlayers or default to 2 if not available
  const effectiveMaxPlayers = maxPlayers ?? 2;
  const isGameFull = game.players.length >= effectiveMaxPlayers;

  const handleAddPlayer = async () => {
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
    onImpersonate(playerId);
  };

  return (
    <div className={styles.playerPanel}>
      <h3>Player Impersonation</h3>

      {game.players.length === 0 ? (
        <p className={styles.emptyState}>No players in this game yet.</p>
      ) : (
        <ul className={styles.playerList}>
          {game.players.map((player) => {
            const isImpersonated = player.id === impersonatedPlayer;

            return (
              <li
                key={player.id}
                className={isImpersonated ? styles.impersonated : ''}
              >
                <div className={styles.playerInfo}>
                  <span className={styles.playerName}>{player.name}</span>
                  <span className={styles.playerId}>({player.id})</span>
                  {isImpersonated && (
                    <span className={styles.activeIndicator}>Active</span>
                  )}
                </div>
                <button
                  className={styles.impersonateButton}
                  onClick={() => handleImpersonate(player.id)}
                  aria-label={`Impersonate ${player.name}`}
                >
                  Impersonate
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!isGameFull && (
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

      {isGameFull && game.lifecycle !== 'completed' && (
        <p className={styles.gameFull}>Game is full ({game.players.length}/{effectiveMaxPlayers} players)</p>
      )}
    </div>
  );
}
