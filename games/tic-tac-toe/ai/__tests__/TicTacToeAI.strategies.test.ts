import { PerfectPlayStrategy, EasyStrategy } from '../';
import { Player, Move } from '@domain/models';
import { TicTacToeEngine } from '../../engine/TicTacToeEngine';

/**
 * Unit tests for Tic-Tac-Toe AI Strategies
 */
describe('Tic-Tac-Toe AI Strategies', () => {
  let engine: TicTacToeEngine;
  let players: Player[];

  beforeEach(() => {
    engine = new TicTacToeEngine();
    players = [
      { id: 'player1', name: 'Player 1', joinedAt: new Date() },
      { id: 'player2', name: 'Player 2', joinedAt: new Date() }
    ];
  });

  describe('PerfectPlayStrategy', () => {
    let strategy: PerfectPlayStrategy;

    beforeEach(() => {
      strategy = new PerfectPlayStrategy();
    });

    it('should have correct metadata', () => {
      expect(strategy.id).toBe('perfect-play');
      expect(strategy.name).toBe('Perfect Play');
      expect(strategy.difficulty).toBe('hard');
      expect(strategy.description).toContain('optimal');
      expect(strategy.getTimeLimit()).toBe(500);
      expect(strategy.validateConfiguration({})).toBe(true);
    });

    it('should take immediate wins when available', async () => {
      // Create a board where X can win by playing at (0,2)
      // X | O | _
      // X | O | _
      // _ | _ | _
      let gameState = engine.initializeGame(players, {});
      
      const moves = [
        { playerId: 'player1', row: 0, col: 0 }, // X
        { playerId: 'player2', row: 0, col: 1 }, // O
        { playerId: 'player1', row: 1, col: 0 }, // X
        { playerId: 'player2', row: 1, col: 1 }, // O
      ];

      for (const move of moves) {
        const moveObj: Move = {
          playerId: move.playerId,
          action: 'place',
          parameters: { row: move.row, col: move.col },
          timestamp: new Date()
        };
        gameState = engine.applyMove(gameState, move.playerId, moveObj);
      }

      // Now it's X's turn and X can win at (2,0)
      const aiMove = await strategy.generateMove(gameState, 'player1');
      
      expect(aiMove.parameters.row).toBe(2);
      expect(aiMove.parameters.col).toBe(0);
    });

    it('should block opponent wins when no winning move available', async () => {
      // Create a board where O can win by playing at (0,2), but it's X's turn
      // O | X | _
      // O | X | _
      // _ | _ | _
      let gameState = engine.initializeGame(players, {});
      
      const moves = [
        { playerId: 'player2', row: 0, col: 0 }, // O
        { playerId: 'player1', row: 0, col: 1 }, // X
        { playerId: 'player2', row: 1, col: 0 }, // O
        { playerId: 'player1', row: 1, col: 1 }, // X
      ];

      for (const move of moves) {
        const moveObj: Move = {
          playerId: move.playerId,
          action: 'place',
          parameters: { row: move.row, col: move.col },
          timestamp: new Date()
        };
        gameState = engine.applyMove(gameState, move.playerId, moveObj);
      }

      // Now it's O's turn, but let's test X blocking O's win at (2,0)
      // We need to advance the turn to X
      const dummyMove: Move = {
        playerId: 'player2',
        action: 'place',
        parameters: { row: 2, col: 1 },
        timestamp: new Date()
      };
      gameState = engine.applyMove(gameState, 'player2', dummyMove);

      const aiMove = await strategy.generateMove(gameState, 'player1');
      
      // X should block at (2,0)
      expect(aiMove.parameters.row).toBe(2);
      expect(aiMove.parameters.col).toBe(0);
    });

    it('should prefer center when no immediate win/block needed', async () => {
      // Empty board - AI should take center
      const gameState = engine.initializeGame(players, {});
      
      const aiMove = await strategy.generateMove(gameState, 'player1');
      
      expect(aiMove.parameters.row).toBe(1);
      expect(aiMove.parameters.col).toBe(1);
    });

    it('should prefer corners over edges when center is taken', async () => {
      // Board with center taken
      let gameState = engine.initializeGame(players, {});
      
      const centerMove: Move = {
        playerId: 'player2',
        action: 'place',
        parameters: { row: 1, col: 1 },
        timestamp: new Date()
      };
      gameState = engine.applyMove(gameState, 'player2', centerMove);

      const aiMove = await strategy.generateMove(gameState, 'player1');
      
      // Should be a corner
      const corners = [
        { row: 0, col: 0 }, { row: 0, col: 2 },
        { row: 2, col: 0 }, { row: 2, col: 2 }
      ];
      
      const isCorner = corners.some(
        corner => corner.row === aiMove.parameters.row && corner.col === aiMove.parameters.col
      );
      expect(isCorner).toBe(true);
    });

    it('should handle edge cases with nearly full boards', async () => {
      // Create a nearly full board with only one move available
      let gameState = engine.initializeGame(players, {});
      
      const moves = [
        { playerId: 'player1', row: 0, col: 0 }, // X
        { playerId: 'player2', row: 0, col: 1 }, // O
        { playerId: 'player1', row: 0, col: 2 }, // X
        { playerId: 'player2', row: 1, col: 0 }, // O
        { playerId: 'player1', row: 1, col: 2 }, // X
        { playerId: 'player2', row: 2, col: 0 }, // O
        { playerId: 'player1', row: 2, col: 2 }, // X
        { playerId: 'player2', row: 2, col: 1 }, // O
        // Only (1,1) is left
      ];

      for (const move of moves) {
        const moveObj: Move = {
          playerId: move.playerId,
          action: 'place',
          parameters: { row: move.row, col: move.col },
          timestamp: new Date()
        };
        gameState = engine.applyMove(gameState, move.playerId, moveObj);
      }

      const aiMove = await strategy.generateMove(gameState, 'player1');
      
      expect(aiMove.parameters.row).toBe(1);
      expect(aiMove.parameters.col).toBe(1);
    });
  });

  describe('EasyStrategy', () => {
    let strategy: EasyStrategy;

    beforeEach(() => {
      strategy = new EasyStrategy();
    });

    it('should have correct metadata', () => {
      expect(strategy.id).toBe('easy');
      expect(strategy.name).toBe('Easy');
      expect(strategy.difficulty).toBe('easy');
      expect(strategy.description).toContain('random');
      expect(strategy.getTimeLimit()).toBe(100);
      expect(strategy.validateConfiguration({})).toBe(true);
    });

    it('should generate valid random moves', async () => {
      const gameState = engine.initializeGame(players, {});
      
      const aiMove = await strategy.generateMove(gameState, 'player1');
      
      // Should be a valid move
      expect(aiMove.action).toBe('place');
      expect(typeof aiMove.parameters.row).toBe('number');
      expect(typeof aiMove.parameters.col).toBe('number');
      expect(aiMove.parameters.row).toBeGreaterThanOrEqual(0);
      expect(aiMove.parameters.row).toBeLessThan(3);
      expect(aiMove.parameters.col).toBeGreaterThanOrEqual(0);
      expect(aiMove.parameters.col).toBeLessThan(3);

      // Validate the move is actually valid
      const validation = engine.validateMove(gameState, 'player1', aiMove);
      expect(validation.valid).toBe(true);
    });

    it('should demonstrate randomness over multiple calls', async () => {
      const gameState = engine.initializeGame(players, {});
      
      const moves = [];
      for (let i = 0; i < 10; i++) {
        const aiMove = await strategy.generateMove(gameState, 'player1');
        moves.push(`${aiMove.parameters.row},${aiMove.parameters.col}`);
      }

      // With 9 possible positions and 10 calls, we should see some variation
      // (This is probabilistic, but very likely to pass)
      const uniqueMoves = new Set(moves);
      expect(uniqueMoves.size).toBeGreaterThan(1);
    });

    it('should handle boards with limited moves available', async () => {
      // Create a board with only a few moves left
      let gameState = engine.initializeGame(players, {});
      
      const moves = [
        { playerId: 'player1', row: 0, col: 0 }, // X
        { playerId: 'player2', row: 0, col: 1 }, // O
        { playerId: 'player1', row: 1, col: 1 }, // X
        { playerId: 'player2', row: 2, col: 2 }, // O
        // Leaves (0,2), (1,0), (1,2), (2,0), (2,1) available
      ];

      for (const move of moves) {
        const moveObj: Move = {
          playerId: move.playerId,
          action: 'place',
          parameters: { row: move.row, col: move.col },
          timestamp: new Date()
        };
        gameState = engine.applyMove(gameState, move.playerId, moveObj);
      }

      const aiMove = await strategy.generateMove(gameState, 'player1');
      
      // Should pick one of the available moves
      const availablePositions = [
        '0,2', '1,0', '1,2', '2,0', '2,1'
      ];
      const chosenPosition = `${aiMove.parameters.row},${aiMove.parameters.col}`;
      expect(availablePositions).toContain(chosenPosition);

      // Validate the move
      const validation = engine.validateMove(gameState, 'player1', aiMove);
      expect(validation.valid).toBe(true);
    });
  });
});