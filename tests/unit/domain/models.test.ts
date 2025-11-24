import {
  GameState,
  Player,
  Move,
  Board,
  Space,
  Token,
  Position,
  GameLifecycle,
} from '@domain/models';

describe('Domain Models', () => {
  describe('GameLifecycle enum', () => {
    it('should have all required lifecycle states', () => {
      expect(GameLifecycle.CREATED).toBe('created');
      expect(GameLifecycle.WAITING_FOR_PLAYERS).toBe('waiting_for_players');
      expect(GameLifecycle.ACTIVE).toBe('active');
      expect(GameLifecycle.COMPLETED).toBe('completed');
      expect(GameLifecycle.ABANDONED).toBe('abandoned');
    });

    it('should support lifecycle transitions from CREATED to WAITING_FOR_PLAYERS', () => {
      let lifecycle: GameLifecycle = GameLifecycle.CREATED;
      lifecycle = GameLifecycle.WAITING_FOR_PLAYERS;
      expect(lifecycle).toBe(GameLifecycle.WAITING_FOR_PLAYERS);
    });

    it('should support lifecycle transitions from WAITING_FOR_PLAYERS to ACTIVE', () => {
      let lifecycle: GameLifecycle = GameLifecycle.WAITING_FOR_PLAYERS;
      lifecycle = GameLifecycle.ACTIVE;
      expect(lifecycle).toBe(GameLifecycle.ACTIVE);
    });

    it('should support lifecycle transitions from ACTIVE to COMPLETED', () => {
      let lifecycle: GameLifecycle = GameLifecycle.ACTIVE;
      lifecycle = GameLifecycle.COMPLETED;
      expect(lifecycle).toBe(GameLifecycle.COMPLETED);
    });

    it('should support lifecycle transitions from any state to ABANDONED', () => {
      let lifecycle: GameLifecycle = GameLifecycle.ACTIVE;
      lifecycle = GameLifecycle.ABANDONED;
      expect(lifecycle).toBe(GameLifecycle.ABANDONED);
    });
  });

  describe('Position interface', () => {
    it('should support 2D positions with x and y', () => {
      const position: Position = { x: 5, y: 10 };
      expect(position.x).toBe(5);
      expect(position.y).toBe(10);
      expect(position.z).toBeUndefined();
    });

    it('should support 3D positions with x, y, and z', () => {
      const position: Position = { x: 5, y: 10, z: 3 };
      expect(position.x).toBe(5);
      expect(position.y).toBe(10);
      expect(position.z).toBe(3);
    });
  });

  describe('Token interface', () => {
    it('should support basic token with id and type', () => {
      const token: Token = {
        id: 'token-1',
        type: 'pawn',
      };
      expect(token.id).toBe('token-1');
      expect(token.type).toBe('pawn');
    });

    it('should support token with owner', () => {
      const token: Token = {
        id: 'token-1',
        type: 'pawn',
        ownerId: 'player-1',
      };
      expect(token.ownerId).toBe('player-1');
    });

    it('should support token with metadata', () => {
      const token: Token = {
        id: 'token-1',
        type: 'pawn',
        metadata: { color: 'red', strength: 5 },
      };
      expect(token.metadata).toEqual({ color: 'red', strength: 5 });
    });
  });

  describe('Space interface', () => {
    it('should support space with position and empty tokens array', () => {
      const space: Space = {
        id: 'space-1',
        position: { x: 0, y: 0 },
        tokens: [],
      };
      expect(space.id).toBe('space-1');
      expect(space.position).toEqual({ x: 0, y: 0 });
      expect(space.tokens).toEqual([]);
    });

    it('should support space with multiple tokens', () => {
      const space: Space = {
        id: 'space-1',
        position: { x: 0, y: 0 },
        tokens: [
          { id: 'token-1', type: 'pawn' },
          { id: 'token-2', type: 'knight' },
        ],
      };
      expect(space.tokens).toHaveLength(2);
    });

    it('should support space with metadata', () => {
      const space: Space = {
        id: 'space-1',
        position: { x: 0, y: 0 },
        tokens: [],
        metadata: { terrain: 'mountain', movementCost: 2 },
      };
      expect(space.metadata).toEqual({ terrain: 'mountain', movementCost: 2 });
    });
  });

  describe('Board interface', () => {
    it('should support board with spaces and metadata', () => {
      const board: Board = {
        spaces: [
          { id: 'space-1', position: { x: 0, y: 0 }, tokens: [] },
          { id: 'space-2', position: { x: 1, y: 0 }, tokens: [] },
        ],
        metadata: { boardType: 'rectangular', size: '3x3' },
      };
      expect(board.spaces).toHaveLength(2);
      expect(board.metadata.boardType).toBe('rectangular');
    });
  });

  describe('Player interface', () => {
    it('should support player with id and name', () => {
      const player: Player = {
        id: 'player-1',
        name: 'Alice',
        joinedAt: new Date('2024-01-01'),
      };
      expect(player.id).toBe('player-1');
      expect(player.name).toBe('Alice');
      expect(player.joinedAt).toEqual(new Date('2024-01-01'));
    });

    it('should support player with externalId for OAuth integration', () => {
      const player: Player = {
        id: 'player-1',
        externalId: 'oauth-sub-12345',
        name: 'Alice',
        joinedAt: new Date('2024-01-01'),
      };
      expect(player.externalId).toBe('oauth-sub-12345');
    });

    it('should support player with metadata', () => {
      const player: Player = {
        id: 'player-1',
        name: 'Alice',
        joinedAt: new Date('2024-01-01'),
        metadata: { avatar: 'avatar-url', rating: 1500 },
      };
      expect(player.metadata).toEqual({ avatar: 'avatar-url', rating: 1500 });
    });
  });

  describe('Move interface with generic parameters', () => {
    it('should support basic move with generic parameters', () => {
      const move: Move<{ row: number; col: number }> = {
        playerId: 'player-1',
        timestamp: new Date('2024-01-01'),
        action: 'place',
        parameters: { row: 0, col: 0 },
      };
      expect(move.playerId).toBe('player-1');
      expect(move.action).toBe('place');
      expect(move.parameters.row).toBe(0);
      expect(move.parameters.col).toBe(0);
    });

    it('should support move with complex parameters', () => {
      const move: Move<{ cardId: string; targetPlayerId?: string }> = {
        playerId: 'player-1',
        timestamp: new Date('2024-01-01'),
        action: 'play_card',
        parameters: { cardId: 'card-5', targetPlayerId: 'player-2' },
      };
      expect(move.parameters.cardId).toBe('card-5');
      expect(move.parameters.targetPlayerId).toBe('player-2');
    });

    it('should support move with empty parameters object', () => {
      const move: Move<Record<string, any>> = {
        playerId: 'player-1',
        timestamp: new Date('2024-01-01'),
        action: 'pass',
        parameters: {},
      };
      expect(move.parameters).toEqual({});
    });
  });

  describe('GameState interface with generic metadata', () => {
    it('should support basic game state with default metadata', () => {
      const gameState: GameState<Record<string, any>> = {
        gameId: 'game-1',
        gameType: 'tic-tac-toe',
        lifecycle: GameLifecycle.ACTIVE,
        players: [
          { id: 'player-1', name: 'Alice', joinedAt: new Date() },
          { id: 'player-2', name: 'Bob', joinedAt: new Date() },
        ],
        currentPlayerIndex: 0,
        phase: 'main',
        board: { spaces: [], metadata: {} },
        moveHistory: [],
        metadata: {},
        winner: null,
        version: 1,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };
      expect(gameState.gameId).toBe('game-1');
      expect(gameState.lifecycle).toBe(GameLifecycle.ACTIVE);
      expect(gameState.players).toHaveLength(2);
    });

    it('should support game state with strongly typed metadata', () => {
      interface TicTacToeMetadata {
        boardSize: number;
        winCondition: number;
      }
      const gameState: GameState<TicTacToeMetadata> = {
        gameId: 'game-1',
        gameType: 'tic-tac-toe',
        lifecycle: GameLifecycle.ACTIVE,
        players: [{ id: 'player-1', name: 'Alice', joinedAt: new Date() }],
        currentPlayerIndex: 0,
        phase: 'main',
        board: { spaces: [], metadata: {} },
        moveHistory: [],
        metadata: { boardSize: 3, winCondition: 3 },
        winner: null,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(gameState.metadata.boardSize).toBe(3);
      expect(gameState.metadata.winCondition).toBe(3);
    });

    it('should support game state with move history', () => {
      const move1: Move = {
        playerId: 'player-1',
        timestamp: new Date('2024-01-01T10:00:00'),
        action: 'place',
        parameters: { row: 0, col: 0 },
      };
      const move2: Move = {
        playerId: 'player-2',
        timestamp: new Date('2024-01-01T10:01:00'),
        action: 'place',
        parameters: { row: 1, col: 1 },
      };
      const gameState: GameState = {
        gameId: 'game-1',
        gameType: 'tic-tac-toe',
        lifecycle: GameLifecycle.ACTIVE,
        players: [
          { id: 'player-1', name: 'Alice', joinedAt: new Date() },
          { id: 'player-2', name: 'Bob', joinedAt: new Date() },
        ],
        currentPlayerIndex: 0,
        phase: 'main',
        board: { spaces: [], metadata: {} },
        moveHistory: [move1, move2],
        metadata: {},
        winner: null,
        version: 3,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01T10:01:00'),
      };
      expect(gameState.moveHistory).toHaveLength(2);
      expect(gameState.version).toBe(3);
    });

    it('should support game state in CREATED lifecycle', () => {
      const gameState: GameState = {
        gameId: 'game-1',
        gameType: 'chess',
        lifecycle: GameLifecycle.CREATED,
        players: [],
        currentPlayerIndex: 0,
        phase: 'setup',
        board: { spaces: [], metadata: {} },
        moveHistory: [],
        metadata: {},
        winner: null,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(gameState.lifecycle).toBe(GameLifecycle.CREATED);
      expect(gameState.players).toHaveLength(0);
    });

    it('should support game state in WAITING_FOR_PLAYERS lifecycle', () => {
      const gameState: GameState = {
        gameId: 'game-1',
        gameType: 'chess',
        lifecycle: GameLifecycle.WAITING_FOR_PLAYERS,
        players: [{ id: 'player-1', name: 'Alice', joinedAt: new Date() }],
        currentPlayerIndex: 0,
        phase: 'setup',
        board: { spaces: [], metadata: {} },
        moveHistory: [],
        metadata: {},
        winner: null,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(gameState.lifecycle).toBe(GameLifecycle.WAITING_FOR_PLAYERS);
    });

    it('should support game state in COMPLETED lifecycle', () => {
      const gameState: GameState = {
        gameId: 'game-1',
        gameType: 'tic-tac-toe',
        lifecycle: GameLifecycle.COMPLETED,
        players: [
          { id: 'player-1', name: 'Alice', joinedAt: new Date() },
          { id: 'player-2', name: 'Bob', joinedAt: new Date() },
        ],
        currentPlayerIndex: 0,
        phase: 'finished',
        board: { spaces: [], metadata: {} },
        moveHistory: [],
        metadata: { winner: 'player-1' },
        winner: 'player-1',
        version: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(gameState.lifecycle).toBe(GameLifecycle.COMPLETED);
    });
  });
});
