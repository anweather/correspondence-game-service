import { useEffect, useMemo, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { GameList } from '../components/GameList/GameList';
import { GameDetail } from '../components/GameDetail/GameDetail';
import { Modal, AuthHeader } from '../components/common';
import { MoveInput } from '../components/MoveInput/MoveInput';
import type { GameFilter } from '../context/AdminContext';
import styles from './AdminView.module.css';

/**
 * AdminView component
 * Main view for administrators to manage and monitor games
 */
export function AdminView() {
  const {
    games,
    selectedGame,
    impersonatedPlayer,
    filter,
    loading,
    error,
    gameTypes,
    loadGames,
    selectGame,
    createTestGame,
    addTestPlayer,
    impersonatePlayer,
    submitMove,
    deleteGame,
    setFilter,
  } = useAdmin();

  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showCreateGameModal, setShowCreateGameModal] = useState(false);
  const [selectedGameType, setSelectedGameType] = useState<string>('');

  // Load games on mount
  useEffect(() => {
    loadGames();
  }, [loadGames]);

  // Set default game type when game types are loaded
  useEffect(() => {
    if (gameTypes.size > 0 && !selectedGameType) {
      const availableTypes = Array.from(gameTypes.keys());
      setSelectedGameType(availableTypes[0] || 'tic-tac-toe');
    }
  }, [gameTypes, selectedGameType]);

  // Filter games based on selected filter
  const filteredGames = useMemo(() => {
    if (filter === 'all') {
      return games;
    }
    if (filter === 'active') {
      return games.filter((game) => game.lifecycle === 'active');
    }
    if (filter === 'completed') {
      return games.filter((game) => game.lifecycle === 'completed');
    }
    return games;
  }, [games, filter]);

  const handleFilterChange = (newFilter: GameFilter) => {
    setFilter(newFilter);
  };

  const handleRefresh = () => {
    loadGames();
    if (selectedGame) {
      selectGame(selectedGame.gameId);
    }
  };

  const handleCreateGame = () => {
    setShowCreateGameModal(true);
  };

  const handleConfirmCreateGame = async () => {
    await createTestGame(selectedGameType);
    setShowCreateGameModal(false);
  };

  const handleSelectGame = async (gameId: string) => {
    await selectGame(gameId);
  };

  const handleDeleteGame = async (gameId: string) => {
    if (window.confirm('Are you sure you want to delete this game?')) {
      await deleteGame(gameId);
    }
  };

  const handleAddPlayer = async (playerName: string) => {
    await addTestPlayer(playerName);
  };

  const handleImpersonate = (playerId: string) => {
    impersonatePlayer(playerId);
  };

  const handleSubmitMove = async (move: any) => {
    await submitMove(move);
  };

  return (
    <div className={styles.adminView}>
      {/* Header */}
      <AuthHeader title="Admin View">
        <button
          className={styles.refreshButton}
          onClick={handleRefresh}
          disabled={loading}
          aria-label="Refresh"
        >
          Refresh
        </button>
        <button
          className={styles.createButton}
          onClick={handleCreateGame}
          disabled={loading}
          aria-label="Create game"
        >
          Create Game
        </button>
      </AuthHeader>

      {/* Filter Controls */}
      <div className={styles.filterControls}>
        <button
          className={`${styles.filterButton} ${filter === 'all' ? styles.active : ''}`}
          onClick={() => handleFilterChange('all')}
          aria-label="All"
        >
          All
        </button>
        <button
          className={`${styles.filterButton} ${filter === 'active' ? styles.active : ''}`}
          onClick={() => handleFilterChange('active')}
          aria-label="Active"
        >
          Active
        </button>
        <button
          className={`${styles.filterButton} ${filter === 'completed' ? styles.active : ''}`}
          onClick={() => handleFilterChange('completed')}
          aria-label="Completed"
        >
          Completed
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      {/* Main Content */}
      <div className={styles.content}>
        {/* Sidebar with Game List */}
        <aside className={styles.sidebar}>
          <GameList
            games={filteredGames}
            onSelect={handleSelectGame}
            onDelete={handleDeleteGame}
          />
        </aside>

        {/* Main area with Game Detail */}
        <main className={styles.main}>
          {selectedGame ? (
            <GameDetail
              game={selectedGame}
              showAdminControls={true}
              onRefresh={() => selectGame(selectedGame.gameId)}
              currentPlayerId={impersonatedPlayer || undefined}
              onMakeMoveClick={
                selectedGame.lifecycle === 'active' && impersonatedPlayer
                  ? () => setShowMoveModal(true)
                  : undefined
              }
              impersonatedPlayer={impersonatedPlayer}
              onImpersonate={handleImpersonate}
              onAddPlayer={handleAddPlayer}
              maxPlayers={gameTypes.get(selectedGame.gameType)?.maxPlayers}
            />
          ) : (
            <div className={styles.emptyState}>
              <p>Select a game to view details</p>
            </div>
          )}
        </main>
      </div>

      {/* Create Game Modal */}
      {showCreateGameModal && (
        <Modal
          isOpen={showCreateGameModal}
          onClose={() => setShowCreateGameModal(false)}
          title="Create New Game"
        >
          <div className={styles.createGameModalContent}>
            <label htmlFor="gameTypeSelect" className={styles.label}>
              Select Game Type:
            </label>
            <select
              id="gameTypeSelect"
              className={styles.gameTypeSelect}
              value={selectedGameType}
              onChange={(e) => setSelectedGameType(e.target.value)}
            >
              {Array.from(gameTypes.entries()).map(([type, info]) => (
                <option key={type} value={type}>
                  {type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} ({info.maxPlayers} players)
                </option>
              ))}
            </select>
            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowCreateGameModal(false)}
              >
                Cancel
              </button>
              <button
                className={styles.confirmButton}
                onClick={handleConfirmCreateGame}
                disabled={loading}
              >
                Create Game
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Move Input Modal */}
      {showMoveModal && selectedGame && selectedGame.lifecycle === 'active' && impersonatedPlayer && (
        <Modal
          isOpen={showMoveModal}
          onClose={() => setShowMoveModal(false)}
          title="Make Move"
          variant="rightPanel"
        >
          <div className={styles.moveModalContent}>
            <MoveInput
              gameType={selectedGame.gameType}
              gameState={selectedGame}
              playerId={impersonatedPlayer}
              enabled={true}
              onSubmit={async (move) => {
                await handleSubmitMove(move);
                setShowMoveModal(false);
              }}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
