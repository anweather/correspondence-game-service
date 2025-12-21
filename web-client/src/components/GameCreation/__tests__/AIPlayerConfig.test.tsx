import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AIPlayerConfig } from '../AIPlayerConfig';
import type { AIStrategy } from '../../../types/game';

// Mock the useAIStrategies hook
vi.mock('../../../hooks/useAIStrategies', () => ({
  useAIStrategies: vi.fn()
}));

import { useAIStrategies } from '../../../hooks/useAIStrategies';

const mockUseAIStrategies = vi.mocked(useAIStrategies);

const mockStrategies: AIStrategy[] = [
  {
    id: 'perfect-play',
    name: 'Perfect Play',
    description: 'Plays optimally using strategic rules',
    difficulty: 'hard'
  },
  {
    id: 'easy',
    name: 'Easy',
    description: 'Makes random valid moves - perfect for beginners',
    difficulty: 'easy'
  }
];

describe('AIPlayerConfig', () => {
  const mockOnAIPlayersChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAIStrategies.mockReturnValue({
      strategies: mockStrategies,
      loading: false,
      error: null,
      refetch: vi.fn()
    });
  });

  it('should render AI support indicator when strategies are available', () => {
    render(
      <AIPlayerConfig
        gameType="tic-tac-toe"
        maxPlayers={2}
        currentPlayerCount={1}
        onAIPlayersChange={mockOnAIPlayersChange}
      />
    );

    expect(screen.getByText('Add AI Players')).toBeInTheDocument();
    expect(screen.getByText('✓ AI Supported')).toBeInTheDocument();
  });

  it('should not render when no strategies are available', () => {
    mockUseAIStrategies.mockReturnValue({
      strategies: [],
      loading: false,
      error: null,
      refetch: vi.fn()
    });

    const { container } = render(
      <AIPlayerConfig
        gameType="tic-tac-toe"
        maxPlayers={2}
        currentPlayerCount={1}
        onAIPlayersChange={mockOnAIPlayersChange}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should show loading state', () => {
    mockUseAIStrategies.mockReturnValue({
      strategies: [],
      loading: true,
      error: null,
      refetch: vi.fn()
    });

    render(
      <AIPlayerConfig
        gameType="tic-tac-toe"
        maxPlayers={2}
        currentPlayerCount={1}
        onAIPlayersChange={mockOnAIPlayersChange}
      />
    );

    expect(screen.getByText('Loading AI options...')).toBeInTheDocument();
  });

  it('should show error state', () => {
    mockUseAIStrategies.mockReturnValue({
      strategies: [],
      loading: false,
      error: 'Failed to load strategies',
      refetch: vi.fn()
    });

    render(
      <AIPlayerConfig
        gameType="tic-tac-toe"
        maxPlayers={2}
        currentPlayerCount={1}
        onAIPlayersChange={mockOnAIPlayersChange}
      />
    );

    expect(screen.getByText('Error loading AI options: Failed to load strategies')).toBeInTheDocument();
  });

  it('should enable AI configuration when checkbox is checked', async () => {
    render(
      <AIPlayerConfig
        gameType="tic-tac-toe"
        maxPlayers={2}
        currentPlayerCount={1}
        onAIPlayersChange={mockOnAIPlayersChange}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(screen.getByText('Number of AI Players')).toBeInTheDocument();
      expect(screen.getByText('AI Player 1')).toBeInTheDocument();
    });
  });

  it('should call onAIPlayersChange when AI players are configured', async () => {
    render(
      <AIPlayerConfig
        gameType="tic-tac-toe"
        maxPlayers={2}
        currentPlayerCount={1}
        onAIPlayersChange={mockOnAIPlayersChange}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(mockOnAIPlayersChange).toHaveBeenCalledWith([
        expect.objectContaining({
          name: 'AI Player 1',
          strategyId: 'perfect-play',
          difficulty: 'hard'
        })
      ]);
    });
  });

  it('should show warning when max players reached', () => {
    render(
      <AIPlayerConfig
        gameType="tic-tac-toe"
        maxPlayers={2}
        currentPlayerCount={2}
        onAIPlayersChange={mockOnAIPlayersChange}
      />
    );

    expect(screen.getByText('Maximum players reached. Cannot add AI players.')).toBeInTheDocument();
  });

  it('should show game setup preview', async () => {
    render(
      <AIPlayerConfig
        gameType="tic-tac-toe"
        maxPlayers={4}
        currentPlayerCount={1}
        onAIPlayersChange={mockOnAIPlayersChange}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(screen.getByText('Game Setup Preview')).toBeInTheDocument();
      expect(screen.getByText('Human Players: 1')).toBeInTheDocument();
      expect(screen.getByText('AI Players: 1')).toBeInTheDocument();
      expect(screen.getByText('Total: 2 / 4')).toBeInTheDocument();
    });
  });
});