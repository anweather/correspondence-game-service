/**
 * Tests for ConnectFourMoveInput component
 * Following TDD approach: Red-Green-Refactor
 */

/**
 * Tests for ConnectFourMoveInput component
 * Following TDD approach: Red-Green-Refactor
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConnectFourMoveInput } from '../components/ConnectFourMoveInput';
import type { GameState, MoveInput } from '../types';
import type { ConnectFourMetadata } from '../../shared/types';

/**
 * Helper function to create a test game state
 */
function createTestGameState(overrides?: Partial<GameState<ConnectFourMetadata>>): GameState<ConnectFourMetadata> {
  const emptyBoard = Array(6).fill(null).map(() => Array(7).fill(null));
  
  return {
    gameId: 'test-game-1',
    gameType: 'connect-four',
    lifecycle: 'active',
    players: [
      { id: 'player-1', name: 'Player 1', joinedAt: '2024-01-01T00:00:00Z' },
      { id: 'player-2', name: 'Player 2', joinedAt: '2024-01-01T00:00:00Z' }
    ],
    currentPlayerIndex: 0,
    phase: 'playing',
    board: {
      spaces: [],
      metadata: {}
    },
    moveHistory: [],
    metadata: {
      board: emptyBoard
    },
    version: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides
  };
}

describe('ConnectFourMoveInput - UI Structure', () => {
  it('should render 7 column buttons', () => {
    const gameState = createTestGameState();
    const onMoveChange = vi.fn();

    render(<ConnectFourMoveInput gameState={gameState} onMoveChange={onMoveChange} />);

    // Should have 7 buttons, one for each column
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(7);
  });

  it('should have buttons with correct labels/indices', () => {
    const gameState = createTestGameState();
    const onMoveChange = vi.fn();

    render(<ConnectFourMoveInput gameState={gameState} onMoveChange={onMoveChange} />);

    // Check that buttons are labeled 0-6 or 1-7 (we'll use 0-6 for column indices)
    for (let col = 0; col < 7; col++) {
      const button = screen.getByTestId(`column-${col}`);
      expect(button).toBeInTheDocument();
    }
  });
});

describe('ConnectFourMoveInput - Button States', () => {
  // Feature: connect-four, Property 25: Full columns disable UI buttons
  it('should disable buttons for full columns', () => {
    // Create a board with column 3 completely filled
    const fullColumnBoard = Array(6).fill(null).map(() => Array(7).fill(null));
    for (let row = 0; row < 6; row++) {
      fullColumnBoard[row][3] = 'red';
    }

    const gameState = createTestGameState({
      metadata: {
        board: fullColumnBoard
      }
    });
    const onMoveChange = vi.fn();

    render(<ConnectFourMoveInput gameState={gameState} onMoveChange={onMoveChange} />);

    // Column 3 button should be disabled
    const column3Button = screen.getByTestId('column-3');
    expect(column3Button).toBeDisabled();

    // Other columns should not be disabled
    for (let col = 0; col < 7; col++) {
      if (col !== 3) {
        const button = screen.getByTestId(`column-${col}`);
        expect(button).not.toBeDisabled();
      }
    }
  });

  // Feature: connect-four, Property 26: UI disables buttons when not player's turn
  it('should disable all buttons when not player\'s turn', () => {
    const gameState = createTestGameState();
    const onMoveChange = vi.fn();

    // Render with disabled prop set to true (simulating not player's turn)
    render(<ConnectFourMoveInput gameState={gameState} onMoveChange={onMoveChange} disabled={true} />);

    // All buttons should be disabled
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toBeDisabled();
    });
  });

  it('should enable buttons when it is player\'s turn and columns are not full', () => {
    const gameState = createTestGameState();
    const onMoveChange = vi.fn();

    render(<ConnectFourMoveInput gameState={gameState} onMoveChange={onMoveChange} disabled={false} />);

    // All buttons should be enabled
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).not.toBeDisabled();
    });
  });
});

describe('ConnectFourMoveInput - Interactions', () => {
  // Feature: connect-four, Property 27: UI submits correct column on click
  it('should submit correct column number when button is clicked', () => {
    const gameState = createTestGameState();
    const onMoveChange = vi.fn();

    render(<ConnectFourMoveInput gameState={gameState} onMoveChange={onMoveChange} />);

    // Click column 4
    const column4Button = screen.getByTestId('column-4');
    column4Button.click();

    // Should call onMoveChange with correct move
    expect(onMoveChange).toHaveBeenCalledWith({
      action: 'drop',
      parameters: { column: 4 }
    });
  });

  it('should submit correct column for each button', () => {
    const gameState = createTestGameState();
    const onMoveChange = vi.fn();

    render(<ConnectFourMoveInput gameState={gameState} onMoveChange={onMoveChange} />);

    // Test each column
    for (let col = 0; col < 7; col++) {
      onMoveChange.mockClear();
      const button = screen.getByTestId(`column-${col}`);
      button.click();

      expect(onMoveChange).toHaveBeenCalledWith({
        action: 'drop',
        parameters: { column: col }
      });
    }
  });

  it('should have hover effects on buttons', () => {
    const gameState = createTestGameState();
    const onMoveChange = vi.fn();

    render(<ConnectFourMoveInput gameState={gameState} onMoveChange={onMoveChange} />);

    // Check that buttons have a class (CSS modules will hash it)
    const button = screen.getByTestId('column-0');
    expect(button.className).toBeTruthy();
    expect(button.className).toContain('columnButton');
  });
});
