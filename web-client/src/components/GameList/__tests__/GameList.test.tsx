import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/test-utils';
import { GameList } from '../GameList';
import type { GameState } from '../../../types/game';

const mockGames: GameState[] = [
  {
    gameId: 'game-1',
    gameType: 'tic-tac-toe',
    lifecycle: 'active',
    players: [
      { id: 'p1', name: 'Alice', joinedAt: '2024-01-01T00:00:00Z' },
      { id: 'p2', name: 'Bob', joinedAt: '2024-01-01T00:01:00Z' },
    ],
    currentPlayerIndex: 0,
    phase: 'playing',
    board: { spaces: [], metadata: {} },
    moveHistory: [],
    metadata: {},
    version: 1,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    gameId: 'game-2',
    gameType: 'tic-tac-toe',
    lifecycle: 'active',
    players: [
      { id: 'p3', name: 'Charlie', joinedAt: '2024-01-02T00:00:00Z' },
      { id: 'p4', name: 'Diana', joinedAt: '2024-01-02T00:01:00Z' },
    ],
    currentPlayerIndex: 1,
    phase: 'playing',
    board: { spaces: [], metadata: {} },
    moveHistory: [
      { playerId: 'p3', timestamp: '2024-01-02T00:02:00Z', action: 'place', parameters: {} },
    ],
    metadata: {},
    version: 5,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:05:00Z',
  },
  {
    gameId: 'game-3',
    gameType: 'chess',
    lifecycle: 'active',
    players: [
      { id: 'p5', name: 'Eve', joinedAt: '2024-01-03T00:00:00Z' },
    ],
    currentPlayerIndex: 0,
    phase: 'waiting',
    board: { spaces: [], metadata: {} },
    moveHistory: [],
    metadata: {},
    version: 1,
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
  },
  {
    gameId: 'game-4',
    gameType: 'tic-tac-toe',
    lifecycle: 'completed',
    players: [
      { id: 'p6', name: 'Frank', joinedAt: '2024-01-04T00:00:00Z' },
      { id: 'p7', name: 'Grace', joinedAt: '2024-01-04T00:01:00Z' },
    ],
    currentPlayerIndex: 1,
    phase: 'finished',
    board: { spaces: [], metadata: {} },
    moveHistory: [
      { playerId: 'p6', timestamp: '2024-01-04T00:02:00Z', action: 'place', parameters: {} },
      { playerId: 'p7', timestamp: '2024-01-04T00:03:00Z', action: 'place', parameters: {} },
    ],
    metadata: {},
    version: 5,
    createdAt: '2024-01-04T00:00:00Z',
    updatedAt: '2024-01-04T00:05:00Z',
  },
];

describe('GameList', () => {
  it('should render list of games', () => {
    const onSelect = vi.fn();
    const onDelete = vi.fn();

    render(<GameList games={mockGames} onSelect={onSelect} onDelete={onDelete} />);

    expect(screen.getByText('game-1')).toBeInTheDocument();
    expect(screen.getByText('game-2')).toBeInTheDocument();
    expect(screen.getByText('game-3')).toBeInTheDocument();
  });

  it('should display game metadata for each game', () => {
    const onSelect = vi.fn();
    const onDelete = vi.fn();

    render(<GameList games={mockGames} onSelect={onSelect} onDelete={onDelete} />);

    // Check game type
    expect(screen.getAllByText(/tic-tac-toe/i)).toHaveLength(3);
    expect(screen.getByText(/chess/i)).toBeInTheDocument();

    // Check player count
    expect(screen.getAllByText(/2\/2/)).toHaveLength(3); // game-1, game-2, and game-4 have 2 players
    expect(screen.getByText(/1\/2/)).toBeInTheDocument(); // game-3 has 1 player

    // Check status
    expect(screen.getAllByText(/active/i)).toHaveLength(3);
    expect(screen.getByText(/completed/i)).toBeInTheDocument();
  });

  it('should display turn information', () => {
    const onSelect = vi.fn();
    const onDelete = vi.fn();

    render(<GameList games={mockGames} onSelect={onSelect} onDelete={onDelete} />);

    // Check turn numbers (based on move history length)
    // Text is split across elements, so we check for the number separately
    expect(screen.getByText(/0 \(Alice\)/)).toBeInTheDocument(); // game-1
    expect(screen.getByText(/1 \(Diana\)/)).toBeInTheDocument(); // game-2
  });

  it('should call onSelect when game is clicked', () => {
    const onSelect = vi.fn();
    const onDelete = vi.fn();

    render(<GameList games={mockGames} onSelect={onSelect} onDelete={onDelete} />);

    const gameCard = screen.getByText('game-1').closest('div');
    gameCard?.click();

    expect(onSelect).toHaveBeenCalledWith('game-1');
  });

  it('should call onDelete when delete button is clicked', () => {
    const onSelect = vi.fn();
    const onDelete = vi.fn();

    render(<GameList games={mockGames} onSelect={onSelect} onDelete={onDelete} />);

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    deleteButtons[0].click();

    expect(onDelete).toHaveBeenCalledWith('game-1');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('should not call onSelect when delete button is clicked', () => {
    const onSelect = vi.fn();
    const onDelete = vi.fn();

    render(<GameList games={mockGames} onSelect={onSelect} onDelete={onDelete} />);

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    deleteButtons[0].click();

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('should render empty state when no games provided', () => {
    const onSelect = vi.fn();
    const onDelete = vi.fn();

    render(<GameList games={[]} onSelect={onSelect} onDelete={onDelete} />);

    expect(screen.getByText(/no games/i)).toBeInTheDocument();
  });

  it('should not render game cards when empty', () => {
    const onSelect = vi.fn();
    const onDelete = vi.fn();

    render(<GameList games={[]} onSelect={onSelect} onDelete={onDelete} />);

    expect(screen.queryByText('game-1')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('should display current player name in turn info', () => {
    const onSelect = vi.fn();
    const onDelete = vi.fn();

    render(<GameList games={mockGames} onSelect={onSelect} onDelete={onDelete} />);

    // game-1: currentPlayerIndex = 0, so Alice's turn
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    
    // game-2: currentPlayerIndex = 1, so Diana's turn
    expect(screen.getByText(/Diana/)).toBeInTheDocument();
  });

  it('should handle games with no players gracefully', () => {
    const gameWithNoPlayers: GameState = {
      ...mockGames[0],
      gameId: 'game-empty',
      players: [],
    };

    const onSelect = vi.fn();
    const onDelete = vi.fn();

    render(<GameList games={[gameWithNoPlayers]} onSelect={onSelect} onDelete={onDelete} />);

    expect(screen.getByText('game-empty')).toBeInTheDocument();
    expect(screen.getByText(/0\/2/)).toBeInTheDocument();
  });

  it('should render multiple games in order', () => {
    const onSelect = vi.fn();
    const onDelete = vi.fn();

    render(<GameList games={mockGames} onSelect={onSelect} onDelete={onDelete} />);

    const gameIds = screen.getAllByText(/^game-\d+$/);
    expect(gameIds).toHaveLength(4);
    expect(gameIds[0]).toHaveTextContent('game-1');
    expect(gameIds[1]).toHaveTextContent('game-2');
    expect(gameIds[2]).toHaveTextContent('game-3');
    expect(gameIds[3]).toHaveTextContent('game-4');
    expect(gameIds[2]).toHaveTextContent('game-3');
  });
});
