import { useState } from 'react';
import { GameState, Move } from '../../types/game';
import { Button } from '../common/Button';
import { TicTacToeMoveInput } from './TicTacToeMoveInput';
import styles from './MoveInput.module.css';

export interface MoveInputProps {
  gameType: string;
  gameState: GameState;
  playerId: string;
  enabled: boolean;
  onSubmit: (move: Move) => Promise<void>;
}

export function MoveInput({
  gameType,
  gameState,
  playerId,
  enabled,
  onSubmit
}: MoveInputProps) {
  const [pendingMove, setPendingMove] = useState<Move | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!pendingMove || !enabled) return;

    setSubmitting(true);
    try {
      await onSubmit(pendingMove);
      setPendingMove(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoveChange = (move: Move) => {
    setPendingMove(move);
  };

  if (!enabled) {
    return (
      <div className={styles.moveInput}>
        <h3>Make Your Move</h3>
        <p className={styles.notYourTurn}>Not your turn</p>
      </div>
    );
  }

  // Render game-specific input component based on gameType
  const renderGameInput = () => {
    switch (gameType) {
      case 'tic-tac-toe':
        return (
          <TicTacToeMoveInput
            gameState={gameState}
            onMoveChange={handleMoveChange}
          />
        );
      default:
        return <p>Game type "{gameType}" is not supported yet.</p>;
    }
  };

  return (
    <div className={styles.moveInput}>
      <h3>Make Your Move</h3>
      <div className={styles.inputArea}>
        {renderGameInput()}
      </div>
      <Button
        onClick={handleSubmit}
        disabled={!pendingMove || submitting}
        loading={submitting}
      >
        Submit Move
      </Button>
    </div>
  );
}
