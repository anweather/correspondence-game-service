import { Player, GameState, Move, GameLifecycle } from '@domain/models';
import {
  GameStateBuilder,
  createPlayer,
  createMove,
  createSpace,
  createToken,
} from './GameStateBuilder';

/**
 * Common test fixtures for use across test suites.
 * Provides pre-configured test data for common scenarios.
 */

// Common players
export const fixtures = {
  players: {
    alice: createPlayer('player-alice', 'Alice'),
    bob: createPlayer('player-bob', 'Bob'),
    charlie: createPlayer('player-charlie', 'Charlie'),
    diana: createPlayer('player-diana', 'Diana'),
  },

  /**
   * Create a standard two-player game state
   */
  twoPlayerGame: (): GameState => {
    return new GameStateBuilder()
      .withGameId('two-player-game')
      .withGameType('tic-tac-toe')
      .withPlayers([fixtures.players.alice, fixtures.players.bob])
      .withLifecycle(GameLifecycle.ACTIVE)
      .build();
  },

  /**
   * Create a four-player game state
   */
  fourPlayerGame: (): GameState => {
    return new GameStateBuilder()
      .withGameId('four-player-game')
      .withGameType('poker')
      .withPlayers([
        fixtures.players.alice,
        fixtures.players.bob,
        fixtures.players.charlie,
        fixtures.players.diana,
      ])
      .withLifecycle(GameLifecycle.ACTIVE)
      .build();
  },

  /**
   * Create a game waiting for players
   */
  waitingForPlayersGame: (): GameState => {
    return new GameStateBuilder()
      .withGameId('waiting-game')
      .withGameType('poker')
      .withPlayers([fixtures.players.alice])
      .withLifecycle(GameLifecycle.WAITING_FOR_PLAYERS)
      .build();
  },

  /**
   * Create a completed game
   */
  completedGame: (): GameState => {
    return new GameStateBuilder()
      .withGameId('completed-game')
      .withGameType('tic-tac-toe')
      .withPlayers([fixtures.players.alice, fixtures.players.bob])
      .withLifecycle(GameLifecycle.COMPLETED)
      .withMetadata({ winner: 'player-alice' })
      .build();
  },

  /**
   * Create a tic-tac-toe game with a 3x3 board
   */
  ticTacToeGame: (): GameState => {
    const spaces = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        spaces.push(createSpace(`${row},${col}`, col, row));
      }
    }

    return new GameStateBuilder()
      .withGameId('tictactoe-game')
      .withGameType('tic-tac-toe')
      .withPlayers([fixtures.players.alice, fixtures.players.bob])
      .withLifecycle(GameLifecycle.ACTIVE)
      .withBoard({ spaces, metadata: { size: 3 } })
      .build();
  },

  /**
   * Create a tic-tac-toe game in progress
   */
  ticTacToeInProgress: (): GameState => {
    const spaces = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        spaces.push(createSpace(`${row},${col}`, col, row));
      }
    }

    // Add some tokens
    spaces[0].tokens.push(createToken('token-1', 'X', 'player-alice'));
    spaces[4].tokens.push(createToken('token-2', 'O', 'player-bob'));
    spaces[2].tokens.push(createToken('token-3', 'X', 'player-alice'));

    const moves = [
      createMove('player-alice', 'place', { row: 0, col: 0 }),
      createMove('player-bob', 'place', { row: 1, col: 1 }),
      createMove('player-alice', 'place', { row: 0, col: 2 }),
    ];

    return new GameStateBuilder()
      .withGameId('tictactoe-in-progress')
      .withGameType('tic-tac-toe')
      .withPlayers([fixtures.players.alice, fixtures.players.bob])
      .withLifecycle(GameLifecycle.ACTIVE)
      .withBoard({ spaces, metadata: { size: 3 } })
      .withMoveHistory(moves)
      .withCurrentPlayerIndex(1)
      .withVersion(4)
      .build();
  },

  /**
   * Create a game with move history
   */
  gameWithMoveHistory: (moveCount: number = 5): GameState => {
    const moves: Move[] = [];
    for (let i = 0; i < moveCount; i++) {
      const playerId = i % 2 === 0 ? 'player-alice' : 'player-bob';
      moves.push(createMove(playerId, 'test-action', { moveNumber: i + 1 }));
    }

    return new GameStateBuilder()
      .withGameId('game-with-history')
      .withGameType('test-game')
      .withPlayers([fixtures.players.alice, fixtures.players.bob])
      .withLifecycle(GameLifecycle.ACTIVE)
      .withMoveHistory(moves)
      .withVersion(moveCount + 1)
      .build();
  },

  /**
   * Create a game at a specific version
   */
  gameAtVersion: (version: number): GameState => {
    return new GameStateBuilder()
      .withGameId('versioned-game')
      .withGameType('test-game')
      .withPlayers([fixtures.players.alice, fixtures.players.bob])
      .withLifecycle(GameLifecycle.ACTIVE)
      .withVersion(version)
      .build();
  },

  /**
   * Create a game with custom metadata
   */
  gameWithMetadata: (metadata: Record<string, any>): GameState => {
    return new GameStateBuilder()
      .withGameId('game-with-metadata')
      .withGameType('test-game')
      .withPlayers([fixtures.players.alice, fixtures.players.bob])
      .withLifecycle(GameLifecycle.ACTIVE)
      .withMetadata(metadata)
      .build();
  },
};

/**
 * Helper to create a list of players
 */
export function createPlayerList(count: number): Player[] {
  const players: Player[] = [];
  for (let i = 0; i < count; i++) {
    players.push(createPlayer(`player-${i}`, `Player ${i}`));
  }
  return players;
}

/**
 * Helper to create a list of moves
 */
export function createMoveList(count: number, playerIds: string[]): Move[] {
  const moves: Move[] = [];
  for (let i = 0; i < count; i++) {
    const playerId = playerIds[i % playerIds.length];
    moves.push(createMove(playerId, 'test-action', { moveNumber: i + 1 }));
  }
  return moves;
}
