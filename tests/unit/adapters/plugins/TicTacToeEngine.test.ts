import { Player, Move, GameLifecycle } from '@domain/models';
import { TicTacToeEngine } from '@adapters/plugins/tic-tac-toe/TicTacToeEngine';

describe('TicTacToeEngine', () => {
  let engine: TicTacToeEngine;
  let testPlayers: Player[];

  beforeEach(() => {
    engine = new TicTacToeEngine();
    testPlayers = [
      { id: 'player-1', name: 'Alice', joinedAt: new Date() },
      { id: 'player-2', name: 'Bob', joinedAt: new Date() },
    ];
  });

  describe('Metadata methods', () => {
    it('should return correct game type', () => {
      expect(engine.getGameType()).toBe('tic-tac-toe');
    });

    it('should require minimum 2 players', () => {
      expect(engine.getMinPlayers()).toBe(2);
    });

    it('should allow maximum 2 players', () => {
      expect(engine.getMaxPlayers()).toBe(2);
    });

    it('should return game description', () => {
      const description = engine.getDescription();
      expect(description).toBeDefined();
      expect(typeof description).toBe('string');
      expect(description.length).toBeGreaterThan(0);
    });
  });

  describe('Game initialization', () => {
    it('should create a 3x3 board', () => {
      const state = engine.initializeGame(testPlayers, {});
      expect(state.board).toBeDefined();
      expect(state.board.spaces).toHaveLength(9);
    });

    it('should create board with correct space positions', () => {
      const state = engine.initializeGame(testPlayers, {});
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const space = state.board.spaces.find(
            (s) => s.position.x === col && s.position.y === row
          );
          expect(space).toBeDefined();
          expect(space?.id).toBe(`${row},${col}`);
        }
      }
    });

    it('should initialize with empty board (no tokens)', () => {
      const state = engine.initializeGame(testPlayers, {});
      state.board.spaces.forEach((space) => {
        expect(space.tokens).toHaveLength(0);
      });
    });

    it('should set first player as current player', () => {
      const state = engine.initializeGame(testPlayers, {});
      expect(state.currentPlayerIndex).toBe(0);
      expect(engine.getCurrentPlayer(state)).toBe('player-1');
    });

    it('should initialize with correct game type', () => {
      const state = engine.initializeGame(testPlayers, {});
      expect(state.gameType).toBe('tic-tac-toe');
    });

    it('should initialize with active lifecycle', () => {
      const state = engine.initializeGame(testPlayers, {});
      expect(state.lifecycle).toBe(GameLifecycle.ACTIVE);
    });

    it('should initialize with empty move history', () => {
      const state = engine.initializeGame(testPlayers, {});
      expect(state.moveHistory).toHaveLength(0);
    });

    it('should assign players to game state', () => {
      const state = engine.initializeGame(testPlayers, {});
      expect(state.players).toHaveLength(2);
      expect(state.players[0].id).toBe('player-1');
      expect(state.players[1].id).toBe('player-2');
    });
  });

  describe('Move validation', () => {
    it('should validate move to empty space by current player', () => {
      const gameState = engine.initializeGame(testPlayers, {});
      const move: Move = {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 0 },
      };
      const result = engine.validateMove(gameState, 'player-1', move);
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject move to occupied space', () => {
      let gameState = engine.initializeGame(testPlayers, {});
      const firstMove: Move = {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 0 },
      };
      gameState = engine.applyMove(gameState, 'player-1', firstMove);
      gameState = engine.advanceTurn(gameState);

      const secondMove: Move = {
        playerId: 'player-2',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 0 },
      };
      const result = engine.validateMove(gameState, 'player-2', secondMove);
      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.reason).toContain('occupied');
    });

    it('should reject move by wrong player', () => {
      const gameState = engine.initializeGame(testPlayers, {});
      const move: Move = {
        playerId: 'player-2',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 0 },
      };
      const result = engine.validateMove(gameState, 'player-2', move);
      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.reason).toContain('turn');
    });

    it('should reject move with row out of bounds (negative)', () => {
      const gameState = engine.initializeGame(testPlayers, {});
      const move: Move = {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: -1, col: 0 },
      };
      const result = engine.validateMove(gameState, 'player-1', move);
      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.reason).toContain('bounds');
    });

    it('should reject move with row out of bounds (too large)', () => {
      const gameState = engine.initializeGame(testPlayers, {});
      const move: Move = {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 3, col: 0 },
      };
      const result = engine.validateMove(gameState, 'player-1', move);
      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.reason).toContain('bounds');
    });

    it('should reject move with col out of bounds (negative)', () => {
      const gameState = engine.initializeGame(testPlayers, {});
      const move: Move = {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: -1 },
      };
      const result = engine.validateMove(gameState, 'player-1', move);
      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.reason).toContain('bounds');
    });

    it('should reject move with col out of bounds (too large)', () => {
      const gameState = engine.initializeGame(testPlayers, {});
      const move: Move = {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 3 },
      };
      const result = engine.validateMove(gameState, 'player-1', move);
      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.reason).toContain('bounds');
    });
  });

  describe('Move application', () => {
    it('should place token on board', () => {
      const gameState = engine.initializeGame(testPlayers, {});
      const move: Move = {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 1, col: 1 },
      };
      const newState = engine.applyMove(gameState, 'player-1', move);
      const space = newState.board.spaces.find((s) => s.id === '1,1');
      expect(space?.tokens).toHaveLength(1);
      expect(space?.tokens[0].type).toBe('X');
      expect(space?.tokens[0].ownerId).toBe('player-1');
    });

    it('should place X for first player', () => {
      const gameState = engine.initializeGame(testPlayers, {});
      const move: Move = {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 0 },
      };
      const newState = engine.applyMove(gameState, 'player-1', move);
      const space = newState.board.spaces.find((s) => s.id === '0,0');
      expect(space?.tokens[0].type).toBe('X');
    });

    it('should place O for second player', () => {
      let gameState = engine.initializeGame(testPlayers, {});
      const move1: Move = {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 0 },
      };
      gameState = engine.applyMove(gameState, 'player-1', move1);
      gameState = engine.advanceTurn(gameState);

      const move2: Move = {
        playerId: 'player-2',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 1, col: 1 },
      };
      const newState = engine.applyMove(gameState, 'player-2', move2);
      const space = newState.board.spaces.find((s) => s.id === '1,1');
      expect(space?.tokens[0].type).toBe('O');
    });

    it('should add move to history', () => {
      const gameState = engine.initializeGame(testPlayers, {});
      const move: Move = {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 0 },
      };
      const newState = engine.applyMove(gameState, 'player-1', move);
      expect(newState.moveHistory).toHaveLength(1);
      expect(newState.moveHistory[0]).toEqual(move);
    });

    it('should increment version', () => {
      const gameState = engine.initializeGame(testPlayers, {});
      const move: Move = {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 0 },
      };
      const newState = engine.applyMove(gameState, 'player-1', move);
      expect(newState.version).toBe(gameState.version + 1);
    });
  });

  describe('Win detection', () => {
    it('should detect horizontal win in top row', () => {
      let gameState = engine.initializeGame(testPlayers, {});
      gameState = engine.applyMove(gameState, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 0 },
      });
      gameState = engine.advanceTurn(gameState);
      gameState = engine.applyMove(gameState, 'player-2', {
        playerId: 'player-2',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 1, col: 0 },
      });
      gameState = engine.advanceTurn(gameState);
      gameState = engine.applyMove(gameState, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 1 },
      });
      gameState = engine.advanceTurn(gameState);
      gameState = engine.applyMove(gameState, 'player-2', {
        playerId: 'player-2',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 1, col: 1 },
      });
      gameState = engine.advanceTurn(gameState);
      gameState = engine.applyMove(gameState, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 2 },
      });
      expect(engine.isGameOver(gameState)).toBe(true);
      expect(engine.getWinner(gameState)).toBe('player-1');
    });

    it('should detect vertical win in left column', () => {
      let gameState = engine.initializeGame(testPlayers, {});
      gameState = engine.applyMove(gameState, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 0 },
      });
      gameState = engine.advanceTurn(gameState);
      gameState = engine.applyMove(gameState, 'player-2', {
        playerId: 'player-2',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 1 },
      });
      gameState = engine.advanceTurn(gameState);
      gameState = engine.applyMove(gameState, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 1, col: 0 },
      });
      gameState = engine.advanceTurn(gameState);
      gameState = engine.applyMove(gameState, 'player-2', {
        playerId: 'player-2',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 2 },
      });
      gameState = engine.advanceTurn(gameState);
      gameState = engine.applyMove(gameState, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 2, col: 0 },
      });
      expect(engine.isGameOver(gameState)).toBe(true);
      expect(engine.getWinner(gameState)).toBe('player-1');
    });

    it('should detect diagonal win (top-left to bottom-right)', () => {
      let gameState = engine.initializeGame(testPlayers, {});
      gameState = engine.applyMove(gameState, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 0 },
      });
      gameState = engine.advanceTurn(gameState);
      gameState = engine.applyMove(gameState, 'player-2', {
        playerId: 'player-2',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 1 },
      });
      gameState = engine.advanceTurn(gameState);
      gameState = engine.applyMove(gameState, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 1, col: 1 },
      });
      gameState = engine.advanceTurn(gameState);
      gameState = engine.applyMove(gameState, 'player-2', {
        playerId: 'player-2',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 2, col: 0 },
      });
      gameState = engine.advanceTurn(gameState);
      gameState = engine.applyMove(gameState, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 2, col: 2 },
      });
      expect(engine.isGameOver(gameState)).toBe(true);
      expect(engine.getWinner(gameState)).toBe('player-1');
    });

    it('should detect diagonal win (top-right to bottom-left)', () => {
      let gameState = engine.initializeGame(testPlayers, {});
      gameState = engine.applyMove(gameState, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 2 },
      });
      gameState = engine.advanceTurn(gameState);
      gameState = engine.applyMove(gameState, 'player-2', {
        playerId: 'player-2',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 0 },
      });
      gameState = engine.advanceTurn(gameState);
      gameState = engine.applyMove(gameState, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 1, col: 1 },
      });
      gameState = engine.advanceTurn(gameState);
      gameState = engine.applyMove(gameState, 'player-2', {
        playerId: 'player-2',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 2, col: 2 },
      });
      gameState = engine.advanceTurn(gameState);
      gameState = engine.applyMove(gameState, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 2, col: 0 },
      });
      expect(engine.isGameOver(gameState)).toBe(true);
      expect(engine.getWinner(gameState)).toBe('player-1');
    });

    it('should not detect win with incomplete line', () => {
      let gameState = engine.initializeGame(testPlayers, {});
      gameState = engine.applyMove(gameState, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 0 },
      });
      gameState = engine.advanceTurn(gameState);
      gameState = engine.applyMove(gameState, 'player-2', {
        playerId: 'player-2',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 1, col: 1 },
      });
      expect(engine.isGameOver(gameState)).toBe(false);
      expect(engine.getWinner(gameState)).toBeNull();
    });
  });

  describe('Draw detection', () => {
    it('should detect draw when board is full with no winner', () => {
      let gameState = engine.initializeGame(testPlayers, {});
      const moves = [
        { player: 'player-1', row: 0, col: 0 },
        { player: 'player-2', row: 0, col: 1 },
        { player: 'player-1', row: 0, col: 2 },
        { player: 'player-2', row: 1, col: 1 },
        { player: 'player-1', row: 1, col: 0 },
        { player: 'player-2', row: 1, col: 2 },
        { player: 'player-1', row: 2, col: 1 },
        { player: 'player-2', row: 2, col: 0 },
        { player: 'player-1', row: 2, col: 2 },
      ];
      moves.forEach((m, index) => {
        gameState = engine.applyMove(gameState, m.player, {
          playerId: m.player,
          timestamp: new Date(),
          action: 'place',
          parameters: { row: m.row, col: m.col },
        });
        if (index < moves.length - 1) {
          gameState = engine.advanceTurn(gameState);
        }
      });
      expect(engine.isGameOver(gameState)).toBe(true);
      expect(engine.getWinner(gameState)).toBeNull();
    });

    it('should not detect draw when board is not full', () => {
      let gameState = engine.initializeGame(testPlayers, {});
      gameState = engine.applyMove(gameState, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 0 },
      });
      expect(engine.isGameOver(gameState)).toBe(false);
    });
  });

  describe('Game over states', () => {
    it('should return false for isGameOver on new game', () => {
      const gameState = engine.initializeGame(testPlayers, {});
      expect(engine.isGameOver(gameState)).toBe(false);
    });

    it('should return null for getWinner on new game', () => {
      const gameState = engine.initializeGame(testPlayers, {});
      expect(engine.getWinner(gameState)).toBeNull();
    });

    it('should return true for isGameOver after win', () => {
      let gameState = engine.initializeGame(testPlayers, {});
      gameState = engine.applyMove(gameState, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 0 },
      });
      gameState = engine.advanceTurn(gameState);
      gameState = engine.applyMove(gameState, 'player-2', {
        playerId: 'player-2',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 1, col: 0 },
      });
      gameState = engine.advanceTurn(gameState);
      gameState = engine.applyMove(gameState, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 1 },
      });
      gameState = engine.advanceTurn(gameState);
      gameState = engine.applyMove(gameState, 'player-2', {
        playerId: 'player-2',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 1, col: 1 },
      });
      gameState = engine.advanceTurn(gameState);
      gameState = engine.applyMove(gameState, 'player-1', {
        playerId: 'player-1',
        timestamp: new Date(),
        action: 'place',
        parameters: { row: 0, col: 2 },
      });
      expect(engine.isGameOver(gameState)).toBe(true);
    });
  });

  describe('Board rendering', () => {
    describe('BoardRenderData structure', () => {
      it('should return BoardRenderData with viewBox dimensions', () => {
        const gameState = engine.initializeGame(testPlayers, {});
        const renderData = engine.renderBoard(gameState);
        expect(renderData.viewBox).toBeDefined();
        expect(renderData.viewBox.width).toBeGreaterThan(0);
        expect(renderData.viewBox.height).toBeGreaterThan(0);
      });

      it('should return BoardRenderData with backgroundColor', () => {
        const gameState = engine.initializeGame(testPlayers, {});
        const renderData = engine.renderBoard(gameState);
        expect(renderData.backgroundColor).toBeDefined();
        expect(typeof renderData.backgroundColor).toBe('string');
      });

      it('should return BoardRenderData with spaces array', () => {
        const gameState = engine.initializeGame(testPlayers, {});
        const renderData = engine.renderBoard(gameState);
        expect(renderData.spaces).toBeDefined();
        expect(Array.isArray(renderData.spaces)).toBe(true);
        expect(renderData.spaces).toHaveLength(9);
      });

      it('should return BoardRenderData with layers array', () => {
        const gameState = engine.initializeGame(testPlayers, {});
        const renderData = engine.renderBoard(gameState);
        expect(renderData.layers).toBeDefined();
        expect(Array.isArray(renderData.layers)).toBe(true);
      });

      it('should include space positions in render data', () => {
        const gameState = engine.initializeGame(testPlayers, {});
        const renderData = engine.renderBoard(gameState);
        renderData.spaces.forEach((space) => {
          expect(space.position).toBeDefined();
          expect(typeof space.position.x).toBe('number');
          expect(typeof space.position.y).toBe('number');
        });
      });
    });

    describe('Grid layout generation', () => {
      it('should include grid layer in render data', () => {
        const gameState = engine.initializeGame(testPlayers, {});
        const renderData = engine.renderBoard(gameState);
        const gridLayer = renderData.layers.find((l) => l.name === 'grid');
        expect(gridLayer).toBeDefined();
      });

      it('should have grid layer with lower z-index than tokens', () => {
        const gameState = engine.initializeGame(testPlayers, {});
        const renderData = engine.renderBoard(gameState);
        const gridLayer = renderData.layers.find((l) => l.name === 'grid');
        const tokenLayer = renderData.layers.find((l) => l.name === 'tokens');
        if (gridLayer && tokenLayer) {
          expect(gridLayer.zIndex).toBeLessThan(tokenLayer.zIndex);
        }
      });

      it('should include grid lines as render elements', () => {
        const gameState = engine.initializeGame(testPlayers, {});
        const renderData = engine.renderBoard(gameState);
        const gridLayer = renderData.layers.find((l) => l.name === 'grid');
        expect(gridLayer?.elements).toBeDefined();
        expect(gridLayer!.elements.length).toBeGreaterThan(0);
      });

      it('should use line or path elements for grid', () => {
        const gameState = engine.initializeGame(testPlayers, {});
        const renderData = engine.renderBoard(gameState);
        const gridLayer = renderData.layers.find((l) => l.name === 'grid');
        gridLayer?.elements.forEach((element) => {
          expect(['rect', 'path']).toContain(element.type);
        });
      });
    });

    describe('Token rendering', () => {
      it('should render X token for player 1', () => {
        let gameState = engine.initializeGame(testPlayers, {});
        gameState = engine.applyMove(gameState, 'player-1', {
          playerId: 'player-1',
          timestamp: new Date(),
          action: 'place',
          parameters: { row: 1, col: 1 },
        });
        const renderData = engine.renderBoard(gameState);
        const centerSpace = renderData.spaces.find((s) => s.id === '1,1');
        expect(centerSpace?.tokens).toHaveLength(1);
        expect(centerSpace?.tokens[0].type).toBe('X');
      });

      it('should render O token for player 2', () => {
        let gameState = engine.initializeGame(testPlayers, {});
        gameState = engine.applyMove(gameState, 'player-1', {
          playerId: 'player-1',
          timestamp: new Date(),
          action: 'place',
          parameters: { row: 0, col: 0 },
        });
        gameState = engine.advanceTurn(gameState);
        gameState = engine.applyMove(gameState, 'player-2', {
          playerId: 'player-2',
          timestamp: new Date(),
          action: 'place',
          parameters: { row: 1, col: 1 },
        });
        const renderData = engine.renderBoard(gameState);
        const centerSpace = renderData.spaces.find((s) => s.id === '1,1');
        expect(centerSpace?.tokens).toHaveLength(1);
        expect(centerSpace?.tokens[0].type).toBe('O');
      });

      it('should include token layer in render data', () => {
        let gameState = engine.initializeGame(testPlayers, {});
        gameState = engine.applyMove(gameState, 'player-1', {
          playerId: 'player-1',
          timestamp: new Date(),
          action: 'place',
          parameters: { row: 0, col: 0 },
        });
        const renderData = engine.renderBoard(gameState);
        const tokenLayer = renderData.layers.find((l) => l.name === 'tokens');
        expect(tokenLayer).toBeDefined();
      });

      it('should render token elements for placed tokens', () => {
        let gameState = engine.initializeGame(testPlayers, {});
        gameState = engine.applyMove(gameState, 'player-1', {
          playerId: 'player-1',
          timestamp: new Date(),
          action: 'place',
          parameters: { row: 0, col: 0 },
        });
        gameState = engine.advanceTurn(gameState);
        gameState = engine.applyMove(gameState, 'player-2', {
          playerId: 'player-2',
          timestamp: new Date(),
          action: 'place',
          parameters: { row: 1, col: 1 },
        });
        const renderData = engine.renderBoard(gameState);
        const tokenLayer = renderData.layers.find((l) => l.name === 'tokens');
        expect(tokenLayer?.elements.length).toBeGreaterThan(0);
      });

      it('should use appropriate element types for tokens', () => {
        let gameState = engine.initializeGame(testPlayers, {});
        gameState = engine.applyMove(gameState, 'player-1', {
          playerId: 'player-1',
          timestamp: new Date(),
          action: 'place',
          parameters: { row: 0, col: 0 },
        });
        const renderData = engine.renderBoard(gameState);
        const tokenLayer = renderData.layers.find((l) => l.name === 'tokens');
        tokenLayer?.elements.forEach((element) => {
          expect(['path', 'text', 'circle']).toContain(element.type);
        });
      });
    });

    describe('Empty spaces', () => {
      it('should render empty spaces with no tokens', () => {
        const gameState = engine.initializeGame(testPlayers, {});
        const renderData = engine.renderBoard(gameState);
        renderData.spaces.forEach((space) => {
          expect(space.tokens).toHaveLength(0);
        });
      });

      it('should maintain all 9 spaces in render data regardless of tokens', () => {
        let gameState = engine.initializeGame(testPlayers, {});
        gameState = engine.applyMove(gameState, 'player-1', {
          playerId: 'player-1',
          timestamp: new Date(),
          action: 'place',
          parameters: { row: 0, col: 0 },
        });
        const renderData = engine.renderBoard(gameState);
        expect(renderData.spaces).toHaveLength(9);
      });

      it('should include empty spaces in correct positions', () => {
        let gameState = engine.initializeGame(testPlayers, {});
        gameState = engine.applyMove(gameState, 'player-1', {
          playerId: 'player-1',
          timestamp: new Date(),
          action: 'place',
          parameters: { row: 1, col: 1 },
        });
        const renderData = engine.renderBoard(gameState);
        const emptySpaces = renderData.spaces.filter((s) => s.tokens.length === 0);
        expect(emptySpaces).toHaveLength(8);
        emptySpaces.forEach((space) => {
          expect(space.position).toBeDefined();
          expect(space.id).toBeDefined();
        });
      });
    });
  });
});
