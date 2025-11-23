import { memo, useCallback, useMemo } from 'react';
import type { GameState, MoveInput } from '../types';
import type { ConnectFourMetadata } from '../../shared/types';
import styles from './ConnectFourMoveInput.module.css';

export interface ConnectFourMoveInputProps {
  gameState: GameState<ConnectFourMetadata>;
  onMoveChange: (move: MoveInput) => void;
  disabled?: boolean;
}

const COLUMNS = [0, 1, 2, 3, 4, 5, 6] as const;

export const ConnectFourMoveInput = memo(function ConnectFourMoveInput({ 
  gameState, 
  onMoveChange, 
  disabled = false 
}: ConnectFourMoveInputProps) {
  const board = gameState.metadata.board;

  /**
   * Check if a column is full
   */
  const isColumnFull = useCallback((column: number): boolean => {
    // Column is full if the top row (row 0) is occupied
    return board[0][column] !== null;
  }, [board]);

  /**
   * Handle column button click
   */
  const handleColumnClick = useCallback((column: number) => {
    if (disabled || isColumnFull(column)) {
      return;
    }

    const move: MoveInput = {
      action: 'drop',
      parameters: { column }
    };

    onMoveChange(move);
  }, [disabled, isColumnFull, onMoveChange]);

  /**
   * Memoize column button states
   */
  const columnStates = useMemo(() => {
    return COLUMNS.map(column => ({
      column,
      isFull: isColumnFull(column),
      isDisabled: disabled || isColumnFull(column)
    }));
  }, [disabled, isColumnFull]);

  return (
    <div className={styles.connectFourInput} role="group" aria-label="Connect Four column selection">
      <div className={styles.columnButtons}>
        {columnStates.map(({ column, isFull, isDisabled }) => (
          <button
            key={column}
            data-testid={`column-${column}`}
            className={styles.columnButton}
            onClick={() => handleColumnClick(column)}
            disabled={isDisabled}
            type="button"
            aria-label={`Drop disc in column ${column + 1}${isFull ? ' (full)' : ''}`}
            aria-disabled={isDisabled}
          >
            ↓
          </button>
        ))}
      </div>
    </div>
  );
});
