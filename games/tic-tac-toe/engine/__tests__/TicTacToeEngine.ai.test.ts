import { TicTacToeEngine } from '../TicTacToeEngine';
import { AIPlayer } from '@domain/models/AIPlayer';

/**
 * Unit tests for TicTacToeEngine AI Integration
 */
describe('TicTacToeEngine AI Integration', () => {
  let engine: TicTacToeEngine;

  beforeEach(() => {
    engine = new TicTacToeEngine();
  });

  describe('AI Support', () => {
    it('should support AI players', () => {
      expect(engine.supportsAI()).toBe(true);
    });

    it('should provide AI strategies', () => {
      const strategies = engine.getAIStrategies();
      
      expect(strategies).toBeDefined();
      expect(Array.isArray(strategies)).toBe(true);
      expect(strategies.length).toBeGreaterThanOrEqual(2);

      // Should have perfect play and easy strategies
      const strategyIds = strategies.map(s => s.id);
      expect(strategyIds).toContain('perfect-play');
      expect(strategyIds).toContain('easy');
    });

    it('should have correct strategy metadata', () => {
      const strategies = engine.getAIStrategies();
      
      for (const strategy of strategies) {
        expect(strategy.id).toBeDefined();
        expect(typeof strategy.id).toBe('string');
        expect(strategy.id.length).toBeGreaterThan(0);

        expect(strategy.name).toBeDefined();
        expect(typeof strategy.name).toBe('string');
        expect(strategy.name.length).toBeGreaterThan(0);

        expect(strategy.description).toBeDefined();
        expect(typeof strategy.description).toBe('string');
        expect(strategy.description.length).toBeGreaterThan(0);

        expect(typeof strategy.generateMove).toBe('function');
      }
    });

    it('should provide a default AI strategy', () => {
      const defaultStrategy = engine.getDefaultAIStrategy();
      
      expect(defaultStrategy).toBeDefined();
      expect(defaultStrategy.id).toBe('perfect-play');
      expect(defaultStrategy.name).toBe('Perfect Play');
      expect(defaultStrategy.difficulty).toBe('hard');
    });

    it('should include default strategy in available strategies', () => {
      const strategies = engine.getAIStrategies();
      const defaultStrategy = engine.getDefaultAIStrategy();
      
      const foundDefault = strategies.find(s => s.id === defaultStrategy.id);
      expect(foundDefault).toBeDefined();
      expect(foundDefault?.name).toBe(defaultStrategy.name);
    });
  });

  describe('AI Player Creation', () => {
    it('should create AI player with default strategy', () => {
      const aiPlayer = engine.createAIPlayer('Test AI');
      
      expect(aiPlayer).toBeInstanceOf(AIPlayer);
      expect(aiPlayer.name).toBe('Test AI');
      expect(aiPlayer.gameType).toBe('tic-tac-toe');
      expect(aiPlayer.strategyId).toBe('perfect-play'); // Default strategy
      expect(aiPlayer.difficulty).toBe('hard');
      expect(aiPlayer.id).toBeDefined();
      expect(typeof aiPlayer.id).toBe('string');
      expect(aiPlayer.id.length).toBeGreaterThan(0);
    });

    it('should create AI player with specified strategy', () => {
      const aiPlayer = engine.createAIPlayer('Easy AI', 'easy');
      
      expect(aiPlayer.name).toBe('Easy AI');
      expect(aiPlayer.strategyId).toBe('easy');
      expect(aiPlayer.difficulty).toBe('easy');
    });

    it('should create AI player with specified difficulty', () => {
      const aiPlayer = engine.createAIPlayer('Hard AI', undefined, 'hard');
      
      expect(aiPlayer.name).toBe('Hard AI');
      expect(aiPlayer.difficulty).toBe('hard');
      // Should use perfect-play strategy for hard difficulty
      expect(aiPlayer.strategyId).toBe('perfect-play');
    });

    it('should prefer difficulty-based strategy selection', () => {
      const easyAI = engine.createAIPlayer('Easy AI', undefined, 'easy');
      expect(easyAI.strategyId).toBe('easy');
      
      const hardAI = engine.createAIPlayer('Hard AI', undefined, 'hard');
      expect(hardAI.strategyId).toBe('perfect-play');
    });

    it('should prioritize explicit strategy over difficulty', () => {
      // Explicitly request perfect-play even with easy difficulty
      const aiPlayer = engine.createAIPlayer('Mixed AI', 'perfect-play', 'easy');
      
      expect(aiPlayer.strategyId).toBe('perfect-play');
      expect(aiPlayer.difficulty).toBe('easy'); // Difficulty is preserved
    });

    it('should throw error for unknown strategy', () => {
      expect(() => {
        engine.createAIPlayer('Invalid AI', 'unknown-strategy');
      }).toThrow("AI strategy 'unknown-strategy' not found for Tic-Tac-Toe");
    });

    it('should generate unique IDs for different AI players', () => {
      const ai1 = engine.createAIPlayer('AI 1');
      const ai2 = engine.createAIPlayer('AI 2');
      
      expect(ai1.id).not.toBe(ai2.id);
    });

    it('should create AI players with correct timestamps', () => {
      const beforeCreation = new Date();
      const aiPlayer = engine.createAIPlayer('Time Test AI');
      const afterCreation = new Date();
      
      expect(aiPlayer.createdAt).toBeInstanceOf(Date);
      expect(aiPlayer.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(aiPlayer.createdAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    });
  });

  describe('Strategy Registration', () => {
    it('should register perfect-play strategy correctly', () => {
      const strategies = engine.getAIStrategies();
      const perfectPlay = strategies.find(s => s.id === 'perfect-play');
      
      expect(perfectPlay).toBeDefined();
      expect(perfectPlay?.name).toBe('Perfect Play');
      expect(perfectPlay?.difficulty).toBe('hard');
      expect(perfectPlay?.description).toContain('optimal');
    });

    it('should register easy strategy correctly', () => {
      const strategies = engine.getAIStrategies();
      const easy = strategies.find(s => s.id === 'easy');
      
      expect(easy).toBeDefined();
      expect(easy?.name).toBe('Easy');
      expect(easy?.difficulty).toBe('easy');
      expect(easy?.description).toContain('random');
    });

    it('should not allow external modification of strategies array', () => {
      const strategies1 = engine.getAIStrategies();
      const strategies2 = engine.getAIStrategies();
      
      // Should return different array instances (copies)
      expect(strategies1).not.toBe(strategies2);
      
      // But with same content
      expect(strategies1.length).toBe(strategies2.length);
      expect(strategies1.map(s => s.id).sort()).toEqual(strategies2.map(s => s.id).sort());
    });
  });

  describe('Integration with Base Engine', () => {
    it('should maintain all base engine functionality', () => {
      // Test that AI integration doesn't break base functionality
      expect(engine.getGameType()).toBe('tic-tac-toe');
      expect(engine.getMinPlayers()).toBe(2);
      expect(engine.getMaxPlayers()).toBe(2);
      expect(engine.getDescription()).toContain('Tic-Tac-Toe');
    });

    it('should work with game initialization', () => {
      const players = [
        { id: 'human1', name: 'Human Player', joinedAt: new Date() },
        { id: 'ai1', name: 'AI Player', joinedAt: new Date() }
      ];
      
      const gameState = engine.initializeGame(players, {});
      
      expect(gameState).toBeDefined();
      expect(gameState.players).toHaveLength(2);
      expect(gameState.gameType).toBe('tic-tac-toe');
    });

    it('should work with move validation and application', () => {
      const players = [
        { id: 'human1', name: 'Human Player', joinedAt: new Date() },
        { id: 'ai1', name: 'AI Player', joinedAt: new Date() }
      ];
      
      const gameState = engine.initializeGame(players, {});
      const move = {
        playerId: 'human1',
        action: 'place',
        parameters: { row: 0, col: 0 },
        timestamp: new Date()
      };
      
      const validation = engine.validateMove(gameState, 'human1', move);
      expect(validation.valid).toBe(true);
      
      const newState = engine.applyMove(gameState, 'human1', move);
      expect(newState.moveHistory).toHaveLength(1);
    });
  });
});