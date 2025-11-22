import { useState } from 'react';
import type { GameState, MoveInput } from '../../../types/game';
import styles from '../../MoveInput/MoveInput.module.css';

export interface TicTacToeMoveInputProps {
  gameState: GameState;
  onMoveChange: (move: MoveInput) => void;
}

export function TicTacToeMoveInput({ gameState, onMoveChange }: TicTacToeMoveInputProps) {
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);

  const handleCellClick = (x: number, y: number) => {
    setSelectedCell({ x, y });
    
    const move: MoveInput = {
      action: 'place',
      parameters: { row: y, col: x }
    };
    
    onMoveChange(move);
  };

  const getCellContent = (x: number, y: number): string => {
    const space = gameState.board.spaces.find(
      s => s.position.x === x && s.position.y === y
    );
    
    if (space && space.tokens.length > 0) {
      return space.tokens[0].type;
    }
    
    return '';
  };

  const isCellOccupied = (x: number, y: number): boolean => {
    const space = gameState.board.spaces.find(
      s => s.position.x === x && s.position.y === y
    );
    
    return space ? space.tokens.length > 0 : false;
  };

  const isCellSelected = (x: number, y: number): boolean => {
    return selectedCell?.x === x && selectedCell?.y === y;
  };

  const renderCell = (x: number, y: number) => {
    const content = getCellContent(x, y);
    const occupied = isCellOccupied(x, y);
    const selected = isCellSelected(x, y);

    return (
      <button
        key={`${x}-${y}`}
        className={`${styles.cell} ${selected ? styles.selected : ''}`}
        onClick={() => handleCellClick(x, y)}
        disabled={occupied}
        data-x={x}
        data-y={y}
        type="button"
      >
        {content}
      </button>
    );
  };

  return (
    <div className={styles.ticTacToeGrid}>
      {[0, 1, 2].map(y => (
        <div key={y} className={styles.gridRow}>
          {[0, 1, 2].map(x => renderCell(x, y))}
        </div>
      ))}
    </div>
  );
}
