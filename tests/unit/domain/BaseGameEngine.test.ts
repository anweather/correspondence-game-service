import { GameState, Player, Move, GameLifecycle } from '@domain/models';
import { BaseGameEngine, ValidationResult, BoardRenderData, GameConfig } from '@domain/interfaces';

/**
 * Concrete test implementation of BaseGameEngine for testing
 */
class TestGameEngine extends BaseGameEngine {
  getGameType(): string {
    return 'test-game';
  }

  getMinPlayers(): number {
    return 2;
  }

  getMaxPlayers(): number {
    return 4;
  }

  getDescription(): string {
    return 'Test game for unit testing';
  }

  initializeGame(players: Player[], _config: GameConfig): GameState {
    return {
      gameId: 'test-game-1',
      gameType: this.getGameType(),
      lifecycle: GameLifecycle.ACTIVE,
      players,
      currentPlayerIndex: 0,
      phase: 'main',
      board: { spaces: [], metadata: {} },
      moveHistory: [],
      metadata: {},
      winner: null,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  validateMove(_state: GameState, _playerId: string, _move: Move): ValidationResult {
    return { valid: true };
  }

  applyMove(state: GameState, _playerId: string, move: Move): GameState {
    return {
      ...state,
      moveHistory: [...state.moveHistory, move],
      version: state.version + 1,
      updatedAt: new Date(),
    };
  }

  renderBoard(_state: GameState): BoardRenderData {
    return {
      viewBox: { width: 100, height: 100 },
      spaces: [],
      layers: [],
    };
  }
}

describe('BaseGameEngine', () => {
  let engine: TestGameEngine;
  let testPlayers: Player[];
  let testState: GameState;

  beforeEach(() => {
    engine = new TestGameEngine();
    testPlayers = [
      { id: 'player-1', name: 'Alice', joinedAt: new Date() },
      { id: 'player-2', name: 'Bob', joinedAt: new Date() },
    ];
    testState = {
      gameId: 'game-1',
      gameType: 'test-game',
      lifecycle: GameLifecycle.ACTIVE,
      players: testPlayers,
      currentPlayerIndex: 0,
      phase: 'main',
      board: { spaces: [], metadata: {} },
      moveHistory: [],
      metadata: {},
      winner: null,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  describe('Default hook implementations (no-ops)', () => {
    it('should have onGameCreated as no-op by default', () => {
      expect(() => {
        engine.onGameCreated(testState, {});
      }).not.toThrow();
    });

    it('should have onPlayerJoined as no-op by default', () => {
      expect(() => {
        engine.onPlayerJoined(testState, 'player-3');
      }).not.toThrow();
    });

    it('should have onGameStarted as no-op by default', () => {
      expect(() => {
        engine.onGameStarted(testState);
      }).not.toThrow();
    });

    it('should have onGameEnded as no-op by default', () => {
      expect(() => {
        engine.onGameEnded(testState);
      }).not.toThrow();
    });

    it('should have beforeInitializeGame as no-op by default', () => {
      expect(() => {
        engine.beforeInitializeGame?.(testPlayers, {});
      }).not.toThrow();
    });

    it('should have afterInitializeGame as no-op by default', () => {
      expect(() => {
        engine.afterInitializeGame?.(testState);
      }).not.toThrow();
    });

    it('should have beforeValidateMove as no-op by default', () => {
      const move: Move = {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'test',
        parameters: {},
      };
      expect(() => {
        engine.beforeValidateMove?.(testState, 'player-1', move);
      }).not.toThrow();
    });

    it('should have afterValidateMove as no-op by default', () => {
      const move: Move = {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'test',
        parameters: {},
      };
      const result: ValidationResult = { valid: true };
      expect(() => {
        engine.afterValidateMove?.(testState, 'player-1', move, result);
      }).not.toThrow();
    });

    it('should have beforeApplyMove as no-op by default', () => {
      const move: Move = {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'test',
        parameters: {},
      };
      expect(() => {
        engine.beforeApplyMove?.(testState, 'player-1', move);
      }).not.toThrow();
    });

    it('should have afterApplyMove as no-op by default', () => {
      const move: Move = {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'test',
        parameters: {},
      };
      const newState = { ...testState, version: 2 };
      expect(() => {
        engine.afterApplyMove?.(testState, newState, move);
      }).not.toThrow();
    });

    it('should have beforeRenderBoard as no-op by default', () => {
      expect(() => {
        engine.beforeRenderBoard?.(testState);
      }).not.toThrow();
    });

    it('should have afterRenderBoard as no-op by default', () => {
      const renderData: BoardRenderData = {
        viewBox: { width: 100, height: 100 },
        spaces: [],
        layers: [],
      };
      expect(() => {
        engine.afterRenderBoard?.(testState, renderData);
      }).not.toThrow();
    });
  });

  describe('Utility methods', () => {
    it('should find player by id', () => {
      const player = engine.findPlayerById(testState, 'player-1');
      expect(player).toBeDefined();
      expect(player?.id).toBe('player-1');
      expect(player?.name).toBe('Alice');
    });

    it('should return undefined for non-existent player', () => {
      const player = engine.findPlayerById(testState, 'player-999');
      expect(player).toBeUndefined();
    });

    it('should check if player is in game', () => {
      expect(engine.isPlayerInGame(testState, 'player-1')).toBe(true);
      expect(engine.isPlayerInGame(testState, 'player-2')).toBe(true);
      expect(engine.isPlayerInGame(testState, 'player-999')).toBe(false);
    });

    it('should get current player', () => {
      const currentPlayer = engine.getCurrentPlayer(testState);
      expect(currentPlayer).toBe('player-1');
    });

    it('should get next player in sequence', () => {
      const nextPlayer = engine.getNextPlayer(testState);
      expect(nextPlayer).toBe('player-2');
    });

    it('should wrap around to first player after last player', () => {
      const stateAtLastPlayer = {
        ...testState,
        currentPlayerIndex: 1,
      };
      const nextPlayer = engine.getNextPlayer(stateAtLastPlayer);
      expect(nextPlayer).toBe('player-1');
    });

    it('should advance turn to next player', () => {
      const newState = engine.advanceTurn(testState);
      expect(newState.currentPlayerIndex).toBe(1);
    });

    it('should wrap turn index when advancing past last player', () => {
      const stateAtLastPlayer = {
        ...testState,
        currentPlayerIndex: 1,
      };
      const newState = engine.advanceTurn(stateAtLastPlayer);
      expect(newState.currentPlayerIndex).toBe(0);
    });

    it('should check if game is over (default: false)', () => {
      expect(engine.isGameOver(testState)).toBe(false);
    });

    it('should get winner (default: null)', () => {
      expect(engine.getWinner(testState)).toBeNull();
    });
  });

  describe('Abstract methods', () => {
    it('should require concrete implementation of getGameType', () => {
      expect(engine.getGameType()).toBe('test-game');
    });

    it('should require concrete implementation of getMinPlayers', () => {
      expect(engine.getMinPlayers()).toBe(2);
    });

    it('should require concrete implementation of getMaxPlayers', () => {
      expect(engine.getMaxPlayers()).toBe(4);
    });

    it('should require concrete implementation of getDescription', () => {
      expect(engine.getDescription()).toBe('Test game for unit testing');
    });

    it('should require concrete implementation of initializeGame', () => {
      const state = engine.initializeGame(testPlayers, {});
      expect(state).toBeDefined();
      expect(state.gameType).toBe('test-game');
      expect(state.players).toEqual(testPlayers);
    });

    it('should require concrete implementation of validateMove', () => {
      const move: Move = {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'test',
        parameters: {},
      };
      const result = engine.validateMove(testState, 'player-1', move);
      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
    });

    it('should require concrete implementation of applyMove', () => {
      const move: Move = {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'test',
        parameters: {},
      };
      const newState = engine.applyMove(testState, 'player-1', move);
      expect(newState).toBeDefined();
      expect(newState.moveHistory).toHaveLength(1);
    });

    it('should require concrete implementation of renderBoard', () => {
      const renderData = engine.renderBoard(testState);
      expect(renderData).toBeDefined();
      expect(renderData.viewBox).toBeDefined();
      expect(renderData.spaces).toBeDefined();
      expect(renderData.layers).toBeDefined();
    });
  });
});
