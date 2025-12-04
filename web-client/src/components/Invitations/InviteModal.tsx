import { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import styles from './InviteModal.module.css';

export interface InviteModalProps {
  isOpen: boolean;
  gameId: string;
  onClose: () => void;
  onInvite: (playerIds: string[]) => void;
  availablePlayers: Array<{ userId: string; displayName: string }>;
  loading?: boolean;
  error?: string | null;
}

export function InviteModal({
  isOpen,
  gameId,
  onClose,
  onInvite,
  availablePlayers,
  loading = false,
  error = null,
}: InviteModalProps) {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedPlayerIds(new Set());
      setSearchQuery('');
    }
  }, [isOpen]);

  const handlePlayerToggle = (userId: string) => {
    setSelectedPlayerIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleInvite = () => {
    const playerIds = Array.from(selectedPlayerIds);
    onInvite(playerIds);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Filter players based on search query
  const filteredPlayers = availablePlayers.filter((player) =>
    player.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasSelection = selectedPlayerIds.size > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite Player to Game">
      <div className={styles.container}>
        {/* Search input */}
        <div className={styles.searchContainer}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search players..."
            value={searchQuery}
            onChange={handleSearchChange}
            disabled={loading}
          />
        </div>

        {/* Error message */}
        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        {/* Player list */}
        <div className={styles.playerList}>
          {loading ? (
            <div className={styles.loadingState}>Loading players...</div>
          ) : availablePlayers.length === 0 ? (
            <div className={styles.emptyState}>No players available to invite</div>
          ) : filteredPlayers.length === 0 ? (
            <div className={styles.emptyState}>No players found matching "{searchQuery}"</div>
          ) : (
            filteredPlayers.map((player) => {
              const isSelected = selectedPlayerIds.has(player.userId);
              return (
                <button
                  key={player.userId}
                  type="button"
                  className={`${styles.playerButton} ${isSelected ? styles.selected : ''}`}
                  onClick={() => handlePlayerToggle(player.userId)}
                  disabled={loading}
                >
                  <span className={styles.playerName}>{player.displayName}</span>
                  {isSelected && (
                    <span className={styles.checkmark} aria-label="Selected">
                      ✓
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Action buttons */}
        <div className={styles.buttonGroup}>
          <Button
            type="button"
            variant="primary"
            onClick={handleInvite}
            disabled={!hasSelection || loading}
            loading={loading}
          >
            {loading ? 'Loading...' : 'Send Invite'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
