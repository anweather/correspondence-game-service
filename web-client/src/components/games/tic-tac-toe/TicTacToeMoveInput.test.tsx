import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '../../../test/test-utils';
import { TicTacToeMoveInput } from './TicTacToeMoveInput';
import type { GameState } from '../../../types/game';

const mockGameState: GameState = {
  gameId: 'game-123',
  gameType: 'tic-tac-toe',
  lifecycle: 'active',
  players: [
    { id: 'player-1', name: 'Alice', joinedAt: '2024-01-01T00:00:00Z' },
    { id: 'player-2', name: 'Bob', joinedAt: '2024-01-01T00:01:00Z' }
  ],
  currentPlayerIndex: 0,
  phase: 'playing',
  board: {
    spaces: [
      { id: '0-0', position: { x: 0, y: 0 }, tokens: [] },
      { id: '0-1', position: { x: 0, y: 1 }, tokens: [] },
      { id: '0-2', position: { x: 0, y: 2 }, tokens: [] },
      { id: '1-0', position: { x: 1, y: 0 }, tokens: [] },
      { id: '1-1', position: { x: 1, y: 1 }, tokens: [] },
      { id: '1-2', position: { x: 1, y: 2 }, tokens: [] },
      { id: '2-0', position: { x: 2, y: 0 }, tokens: [] },
      { id: '2-1', position: { x: 2, y: 1 }, tokens: [] },
      { id: '2-2', position: { x: 2, y: 2 }, tokens: [] }
    ],
    metadata: {}
  },
  moveHistory: [],
  metadata: {},
  version: 1,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

const mockGameStateWithMoves: GameState = {
  ...mockGameState,
  board: {
    spaces: [
      { id: '0-0', position: { x: 0, y: 0 }, tokens: [{ id: 'token-1', type: 'X', ownerId: 'player-1' }] },
      { id: '0-1', position: { x: 0, y: 1 }, tokens: [] },
      { id: '0-2', position: { x: 0, y: 2 }, tokens: [] },
      { id: '1-0', position: { x: 1, y: 0 }, tokens: [] },
      { id: '1-1', position: { x: 1, y: 1 }, tokens: [{ id: 'token-2', type: 'O', ownerId: 'player-2' }] },
      { id: '1-2', position: { x: 1, y: 2 }, tokens: [] },
      { id: '2-0', position: { x: 2, y: 0 }, tokens: [] },
      { id: '2-1', position: { x: 2, y: 1 }, tokens: [] },
      { id: '2-2', position: { x: 2, y: 2 }, tokens: [] }
    ],
    metadata: {}
  }
};

describe('TicTacToeMoveInput', () => {
  it('should render a 3x3 grid', () => {
    render(
      <TicTacToeMoveInput
        gameState={mockGameState}
        onMoveChange={vi.fn()}
      />
    );

    // Should have 9 cells (3x3 grid)
    const cells = screen.getAllByRole('button');
    expect(cells).toHaveLength(9);
  });

  it('should render empty cells as clickable buttons', () => {
    render(
      <TicTacToeMoveInput
        gameState={mockGameState}
        onMoveChange={vi.fn()}
      />
    );

    const cells = screen.getAllByRole('button');
    cells.forEach(cell => {
      expect(cell).not.toBeDisabled();
      expect(cell).toHaveTextContent('');
    });
  });

  it('should call onMoveChange when a cell is clicked', () => {
    const handleMoveChange = vi.fn();
    render(
      <TicTacToeMoveInput
        gameState={mockGameState}
        onMoveChange={handleMoveChange}
      />
    );

    const cells = screen.getAllByRole('button');
    cells[0].click();

    expect(handleMoveChange).toHaveBeenCalledTimes(1);
    expect(handleMoveChange).toHaveBeenCalledWith({
      playerId: '',
      timestamp: expect.any(String),
      action: 'place',
      parameters: { x: 0, y: 0 }
    });
  });

  it('should call onMoveChange with correct coordinates for different cells', () => {
    const handleMoveChange = vi.fn();
    render(
      <TicTacToeMoveInput
        gameState={mockGameState}
        onMoveChange={handleMoveChange}
      />
    );

    const cells = screen.getAllByRole('button');
    
    // Click center cell (1, 1)
    cells[4].click();
    expect(handleMoveChange).toHaveBeenCalledWith({
      playerId: '',
      timestamp: expect.any(String),
      action: 'place',
      parameters: { x: 1, y: 1 }
    });

    // Click bottom-right cell (2, 2)
    cells[8].click();
    expect(handleMoveChange).toHaveBeenCalledWith({
      playerId: '',
      timestamp: expect.any(String),
      action: 'place',
      parameters: { x: 2, y: 2 }
    });
  });

  it('should disable cells that already have tokens', () => {
    render(
      <TicTacToeMoveInput
        gameState={mockGameStateWithMoves}
        onMoveChange={vi.fn()}
      />
    );

    const cells = screen.getAllByRole('button');
    
    // Cell (0, 0) has a token - should be disabled
    expect(cells[0]).toBeDisabled();
    
    // Cell (1, 1) has a token - should be disabled
    expect(cells[4]).toBeDisabled();
    
    // Empty cells should not be disabled
    expect(cells[1]).not.toBeDisabled();
    expect(cells[2]).not.toBeDisabled();
  });

  it('should display token symbols in occupied cells', () => {
    render(
      <TicTacToeMoveInput
        gameState={mockGameStateWithMoves}
        onMoveChange={vi.fn()}
      />
    );

    const cells = screen.getAllByRole('button');
    
    // Cell (0, 0) has X
    expect(cells[0]).toHaveTextContent('X');
    
    // Cell (1, 1) has O
    expect(cells[4]).toHaveTextContent('O');
    
    // Empty cells should be empty
    expect(cells[1]).toHaveTextContent('');
  });

  it('should not call onMoveChange when clicking a disabled cell', () => {
    const handleMoveChange = vi.fn();
    render(
      <TicTacToeMoveInput
        gameState={mockGameStateWithMoves}
        onMoveChange={handleMoveChange}
      />
    );

    const cells = screen.getAllByRole('button');
    
    // Click occupied cell
    cells[0].click();
    
    expect(handleMoveChange).not.toHaveBeenCalled();
  });

  it('should highlight selected cell', async () => {
    render(
      <TicTacToeMoveInput
        gameState={mockGameState}
        onMoveChange={vi.fn()}
      />
    );

    const cells = screen.getAllByRole('button');
    
    // Click a cell
    cells[0].click();
    
    // Wait for the state update and re-render
    await waitFor(() => {
      expect(cells[0].className).toMatch(/selected/);
    });
  });

  it('should clear previous selection when clicking a new cell', async () => {
    render(
      <TicTacToeMoveInput
        gameState={mockGameState}
        onMoveChange={vi.fn()}
      />
    );

    const cells = screen.getAllByRole('button');
    
    // Click first cell
    cells[0].click();
    await waitFor(() => {
      expect(cells[0].className).toMatch(/selected/);
    });
    
    // Click second cell
    cells[1].click();
    await waitFor(() => {
      expect(cells[0].className).not.toMatch(/selected/);
      expect(cells[1].className).toMatch(/selected/);
    });
  });

  it('should render cells in correct grid order', () => {
    render(
      <TicTacToeMoveInput
        gameState={mockGameState}
        onMoveChange={vi.fn()}
      />
    );

    const cells = screen.getAllByRole('button');
    
    // Verify grid structure by checking data attributes or aria-labels
    expect(cells[0]).toHaveAttribute('data-x', '0');
    expect(cells[0]).toHaveAttribute('data-y', '0');
    
    expect(cells[4]).toHaveAttribute('data-x', '1');
    expect(cells[4]).toHaveAttribute('data-y', '1');
    
    expect(cells[8]).toHaveAttribute('data-x', '2');
    expect(cells[8]).toHaveAttribute('data-y', '2');
  });
});
