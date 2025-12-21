# Plugin Development Guide

This guide explains how to create custom game plugins for the Async Boardgame Service.

## Overview

The plugin architecture allows you to add new board games without modifying the core service code. Each game is implemented as a plugin that extends the `BaseGameEngine` class and implements the required game logic.

## Quick Start

Here's a minimal game plugin structure:

```typescript
import { BaseGameEngine } from '@domain/interfaces';
import { GameState, Player, Move } from '@domain/models';
import { GameConfig, ValidationResult, BoardRenderData } from '@domain/interfaces';

export class MyGameEngine extends BaseGameEngine {
  getGameType(): string {
    return 'my-game';
  }

  getMinPlayers(): number {
    return 2;
  }

  getMaxPlayers(): number {
    return 4;
  }

  getDescription(): string {
    return 'My custom board game';
  }

  initializeGame(players: Player[], config: GameConfig): GameState {
    // Create initial game state
    return {
      gameId: '', // Will be set by the service
      gameType: this.getGameType(),
      lifecycle: GameLifecycle.ACTIVE,
      players,
      currentPlayerIndex: 0,
      phase: 'main',
      board: this.createInitialBoard(),
      moveHistory: [],
      metadata: {},
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  validateMove(state: GameState, playerId: string, move: Move): ValidationResult {
    // Check if move is legal
    if (!this.isValidMove(state, move)) {
      return { valid: false, reason: 'Invalid move' };
    }
    return { valid: true };
  }

  applyMove(state: GameState, playerId: string, move: Move): GameState {
    // Apply move and return new state
    const newBoard = this.applyMoveToBoard(state.board, move);
    return {
      ...state,
      board: newBoard,
      moveHistory: [...state.moveHistory, move],
      version: state.version + 1,
      updatedAt: new Date(),
    };
  }

  renderBoard(state: GameState): BoardRenderData {
    // Generate visual representation
    return {
      viewBox: { width: 600, height: 600 },
      backgroundColor: '#ffffff',
      spaces: this.renderSpaces(state.board),
      layers: this.renderLayers(state.board),
    };
  }

  // Helper methods
  private createInitialBoard(): Board { /* ... */ }
  private isValidMove(state: GameState, move: Move): boolean { /* ... */ }
  private applyMoveToBoard(board: Board, move: Move): Board { /* ... */ }
  private renderSpaces(board: Board): SpaceRenderData[] { /* ... */ }
  private renderLayers(board: Board): LayerRenderData[] { /* ... */ }
}
```

## Core Interfaces

### GameEnginePlugin Interface

All game plugins must implement the `GameEnginePlugin` interface:

```typescript
interface GameEnginePlugin {
  // Metadata
  getGameType(): string;
  getMinPlayers(): number;
  getMaxPlayers(): number;
  getDescription(): string;

  // Game lifecycle
  initializeGame(players: Player[], config: GameConfig): GameState;
  
  // Move handling
  validateMove(state: GameState, playerId: string, move: Move): ValidationResult;
  applyMove(state: GameState, playerId: string, move: Move): GameState;
  
  // Game state queries
  isGameOver(state: GameState): boolean;
  getWinner(state: GameState): string | null;
  getCurrentPlayer(state: GameState): string;
  getNextPlayer(state: GameState): string;
  advanceTurn(state: GameState): GameState;
  
  // Rendering
  renderBoard(state: GameState): BoardRenderData;
  
  // Optional lifecycle hooks
  onGameCreated?(state: GameState, config: GameConfig): void;
  onPlayerJoined?(state: GameState, playerId: string): void;
  onGameStarted?(state: GameState): void;
  onGameEnded?(state: GameState): void;
  
  // Optional move hooks
  beforeValidateMove?(state: GameState, playerId: string, move: Move): void;
  afterValidateMove?(state: GameState, playerId: string, move: Move, result: ValidationResult): void;
  beforeApplyMove?(state: GameState, playerId: string, move: Move): void;
  afterApplyMove?(oldState: GameState, newState: GameState, move: Move): void;
}
```

### BaseGameEngine Class

The `BaseGameEngine` abstract class provides default implementations for common methods:

```typescript
abstract class BaseGameEngine implements GameEnginePlugin {
  // Abstract methods (must implement)
  abstract getGameType(): string;
  abstract getMinPlayers(): number;
  abstract getMaxPlayers(): number;
  abstract getDescription(): string;
  abstract initializeGame(players: Player[], config: GameConfig): GameState;
  abstract validateMove(state: GameState, playerId: string, move: Move): ValidationResult;
  abstract applyMove(state: GameState, playerId: string, move: Move): GameState;
  abstract renderBoard(state: GameState): BoardRenderData;

  // Default implementations (can override)
  isGameOver(state: GameState): boolean {
    return state.lifecycle === GameLifecycle.COMPLETED;
  }

  getWinner(state: GameState): string | null {
    return state.metadata?.winner || null;
  }

  getCurrentPlayer(state: GameState): string {
    return state.players[state.currentPlayerIndex].id;
  }

  getNextPlayer(state: GameState): string {
    const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
    return state.players[nextIndex].id;
  }

  advanceTurn(state: GameState): GameState {
    const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
    return { ...state, currentPlayerIndex: nextIndex };
  }
}
```

## Tic-Tac-Toe Example

Let's walk through the Tic-Tac-Toe implementation as a complete example.

### 1. Game Metadata

```typescript
export class TicTacToeEngine extends BaseGameEngine {
  getGameType(): string {
    return 'tic-tac-toe';
  }

  getMinPlayers(): number {
    return 2;
  }

  getMaxPlayers(): number {
    return 2;
  }

  getDescription(): string {
    return 'Classic Tic-Tac-Toe: Get three in a row to win';
  }
}
```

### 2. Game Initialization

```typescript
initializeGame(players: Player[], _config: GameConfig): GameState {
  const spaces: Space[] = [];
  
  // Create 3x3 grid
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      spaces.push({
        id: `${row},${col}`,
        position: { x: col, y: row },
        tokens: [],
      });
    }
  }

  return {
    gameId: '', // Set by service
    gameType: this.getGameType(),
    lifecycle: GameLifecycle.ACTIVE,
    players,
    currentPlayerIndex: 0,
    phase: 'main',
    board: { spaces, metadata: { size: 3 } },
    moveHistory: [],
    metadata: {},
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
```

### 3. Move Validation

```typescript
validateMove(state: GameState, playerId: string, move: Move): ValidationResult {
  // Check if it's the player's turn
  if (this.getCurrentPlayer(state) !== playerId) {
    return { valid: false, reason: 'Not your turn' };
  }

  const { row, col } = move.parameters;

  // Check bounds
  if (row < 0 || row >= 3 || col < 0 || col >= 3) {
    return { valid: false, reason: 'Position out of bounds' };
  }

  // Check if space is empty
  const space = state.board.spaces.find(s => s.id === `${row},${col}`);
  if (!space || space.tokens.length > 0) {
    return { valid: false, reason: 'Space is occupied' };
  }

  return { valid: true };
}
```

### 4. Move Application

```typescript
applyMove(state: GameState, playerId: string, move: Move): GameState {
  const { row, col } = move.parameters;
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  const symbol = playerIndex === 0 ? 'X' : 'O';

  // Create new board with token placed
  const newSpaces = state.board.spaces.map(space => {
    if (space.id === `${row},${col}`) {
      return {
        ...space,
        tokens: [{
          id: `token-${Date.now()}`,
          type: symbol,
          ownerId: playerId,
        }],
      };
    }
    return space;
  });

  return {
    ...state,
    board: { ...state.board, spaces: newSpaces },
    moveHistory: [...state.moveHistory, move],
    version: state.version + 1,
    updatedAt: new Date(),
  };
}
```

### 5. Win Detection

```typescript
isGameOver(state: GameState): boolean {
  return this.getWinner(state) !== null || this.isBoardFull(state);
}

getWinner(state: GameState): string | null {
  const lines = [
    // Rows
    [[0,0], [0,1], [0,2]],
    [[1,0], [1,1], [1,2]],
    [[2,0], [2,1], [2,2]],
    // Columns
    [[0,0], [1,0], [2,0]],
    [[0,1], [1,1], [2,1]],
    [[0,2], [1,2], [2,2]],
    // Diagonals
    [[0,0], [1,1], [2,2]],
    [[0,2], [1,1], [2,0]],
  ];

  for (const line of lines) {
    const tokens = line.map(([row, col]) => {
      const space = state.board.spaces.find(s => s.id === `${row},${col}`);
      return space?.tokens[0];
    });

    if (tokens.every(t => t && t.ownerId === tokens[0]?.ownerId)) {
      return tokens[0]!.ownerId!;
    }
  }

  return null;
}

private isBoardFull(state: GameState): boolean {
  return state.board.spaces.every(space => space.tokens.length > 0);
}
```

### 6. Board Rendering

```typescript
renderBoard(state: GameState): BoardRenderData {
  const cellSize = 200;
  const boardSize = 600;

  return {
    viewBox: { width: boardSize, height: boardSize },
    backgroundColor: '#f0f0f0',
    spaces: this.renderSpaces(state.board, cellSize),
    layers: [
      this.renderGridLayer(cellSize),
      this.renderTokensLayer(state.board, cellSize),
    ],
  };
}

private renderGridLayer(cellSize: number): LayerRenderData {
  const elements: RenderElement[] = [];

  // Vertical lines
  for (let i = 1; i < 3; i++) {
    elements.push({
      type: 'path',
      attributes: {
        d: `M ${i * cellSize} 0 L ${i * cellSize} ${3 * cellSize}`,
        stroke: '#333',
        'stroke-width': '2',
      },
    });
  }

  // Horizontal lines
  for (let i = 1; i < 3; i++) {
    elements.push({
      type: 'path',
      attributes: {
        d: `M 0 ${i * cellSize} L ${3 * cellSize} ${i * cellSize}`,
        stroke: '#333',
        'stroke-width': '2',
      },
    });
  }

  return {
    name: 'grid',
    zIndex: 1,
    elements,
  };
}

private renderTokensLayer(board: Board, cellSize: number): LayerRenderData {
  const elements: RenderElement[] = [];

  board.spaces.forEach(space => {
    if (space.tokens.length > 0) {
      const token = space.tokens[0];
      const centerX = space.position.x * cellSize + cellSize / 2;
      const centerY = space.position.y * cellSize + cellSize / 2;

      if (token.type === 'X') {
        // Draw X
        const size = cellSize * 0.6;
        elements.push({
          type: 'path',
          attributes: {
            d: `M ${centerX - size/2} ${centerY - size/2} L ${centerX + size/2} ${centerY + size/2} M ${centerX + size/2} ${centerY - size/2} L ${centerX - size/2} ${centerY + size/2}`,
            stroke: '#e74c3c',
            'stroke-width': '8',
            'stroke-linecap': 'round',
          },
        });
      } else if (token.type === 'O') {
        // Draw O
        elements.push({
          type: 'circle',
          attributes: {
            cx: centerX.toString(),
            cy: centerY.toString(),
            r: (cellSize * 0.3).toString(),
            stroke: '#3498db',
            'stroke-width': '8',
            fill: 'none',
          },
        });
      }
    }
  });

  return {
    name: 'tokens',
    zIndex: 2,
    elements,
  };
}
```

## Registering Your Plugin

Once you've created your plugin, register it with the service:

```typescript
// src/index.ts
import { PluginRegistry } from '@application/PluginRegistry';
import { TicTacToeEngine } from '@games/tic-tac-toe/engine';
import { MyGameEngine } from '@adapters/plugins/my-game/MyGameEngine';

const registry = new PluginRegistry();
registry.register(new TicTacToeEngine());
registry.register(new MyGameEngine());
```

## Testing Your Plugin

Use the provided test utilities to test your plugin:

```typescript
import { MockGameEngine, GameStateBuilder, createPlayer } from '@tests/utils';
import { MyGameEngine } from './MyGameEngine';

describe('MyGameEngine', () => {
  let engine: MyGameEngine;

  beforeEach(() => {
    engine = new MyGameEngine();
  });

  it('should initialize game correctly', () => {
    const players = [
      createPlayer('player1', 'Alice'),
      createPlayer('player2', 'Bob'),
    ];

    const state = engine.initializeGame(players, {});

    expect(state.gameType).toBe('my-game');
    expect(state.players).toHaveLength(2);
    expect(state.board).toBeDefined();
  });

  it('should validate moves correctly', () => {
    const state = new GameStateBuilder()
      .withGameType('my-game')
      .withPlayers([createPlayer('player1', 'Alice')])
      .build();

    const move = createMove('player1', 'my-action', { param: 'value' });
    const result = engine.validateMove(state, 'player1', move);

    expect(result.valid).toBe(true);
  });
});
```

## Best Practices

### 1. Immutability

Always return new state objects rather than mutating existing ones:

```typescript
// Good
applyMove(state: GameState, playerId: string, move: Move): GameState {
  return {
    ...state,
    board: this.updateBoard(state.board, move),
    version: state.version + 1,
  };
}

// Bad
applyMove(state: GameState, playerId: string, move: Move): GameState {
  state.board = this.updateBoard(state.board, move);
  state.version++;
  return state;
}
```

### 2. Validation

Validate all moves thoroughly before applying them:

```typescript
validateMove(state: GameState, playerId: string, move: Move): ValidationResult {
  // Check turn order
  if (this.getCurrentPlayer(state) !== playerId) {
    return { valid: false, reason: 'Not your turn' };
  }

  // Check game state
  if (this.isGameOver(state)) {
    return { valid: false, reason: 'Game is over' };
  }

  // Check move parameters
  if (!this.isValidMoveParameters(move.parameters)) {
    return { valid: false, reason: 'Invalid move parameters' };
  }

  // Check game rules
  if (!this.isLegalMove(state, move)) {
    return { valid: false, reason: 'Move violates game rules' };
  }

  return { valid: true };
}
```

### 3. Error Handling

Handle errors gracefully and provide meaningful error messages:

```typescript
validateMove(state: GameState, playerId: string, move: Move): ValidationResult {
  try {
    // Validation logic
  } catch (error) {
    return {
      valid: false,
      reason: `Validation error: ${error.message}`,
    };
  }
}
```

### 4. Performance

For complex games, consider caching computed values:

```typescript
class ChessEngine extends BaseGameEngine {
  private legalMovesCache = new Map<string, Move[]>();

  validateMove(state: GameState, playerId: string, move: Move): ValidationResult {
    const cacheKey = this.getCacheKey(state);
    let legalMoves = this.legalMovesCache.get(cacheKey);

    if (!legalMoves) {
      legalMoves = this.computeLegalMoves(state);
      this.legalMovesCache.set(cacheKey, legalMoves);
    }

    const isLegal = legalMoves.some(m => this.movesEqual(m, move));
    return isLegal ? { valid: true } : { valid: false, reason: 'Illegal move' };
  }
}
```

### 5. Documentation

Document your game-specific move parameters and metadata:

```typescript
/**
 * Chess game engine.
 * 
 * Move Parameters:
 * - from: { row: number, col: number } - Starting position
 * - to: { row: number, col: number } - Ending position
 * - promotion?: 'queen' | 'rook' | 'bishop' | 'knight' - Pawn promotion piece
 * 
 * Metadata:
 * - castlingRights: { whiteKingside: boolean, ... }
 * - enPassantTarget: { row: number, col: number } | null
 * - halfmoveClock: number
 * - fullmoveNumber: number
 */
export class ChessEngine extends BaseGameEngine {
  // ...
}
```

## Advanced Features

### AI Strategy Implementation

Games can provide AI opponents by implementing the `AICapableGamePlugin` interface in addition to the base `GameEnginePlugin` interface.

#### AI-Capable Plugin Interface

```typescript
interface AICapableGamePlugin extends GameEnginePlugin {
  /**
   * Get available AI strategies for this game type
   */
  getAIStrategies(): AIStrategy[];
  
  /**
   * Get default AI strategy for this game type
   */
  getDefaultAIStrategy(): AIStrategy;
  
  /**
   * Create an AI player for this game type
   */
  createAIPlayer(name: string, strategyId?: string, difficulty?: string): AIPlayer;
}

interface AIStrategy {
  id: string;
  name: string;
  description: string;
  difficulty?: string;
  
  /**
   * Generate a move for the AI player
   */
  generateMove(state: GameState, aiPlayerId: string): Promise<Move>;
  
  /**
   * Validate AI-specific configuration (optional)
   */
  validateConfiguration?(config: Record<string, any>): boolean;
}
```

#### Implementing AI Strategies

Here's how to add AI support to your game plugin:

```typescript
import { AICapableGamePlugin, AIStrategy, AIPlayer } from '@domain/interfaces';

export class MyGameEngine extends BaseGameEngine implements AICapableGamePlugin {
  private aiStrategies: Map<string, AIStrategy> = new Map();

  constructor() {
    super();
    this.registerAIStrategies();
  }

  // ... existing game methods ...

  getAIStrategies(): AIStrategy[] {
    return Array.from(this.aiStrategies.values());
  }

  getDefaultAIStrategy(): AIStrategy {
    return this.aiStrategies.get('medium') || this.aiStrategies.values().next().value;
  }

  createAIPlayer(name: string, strategyId?: string, difficulty?: string): AIPlayer {
    const strategy = strategyId || this.getDefaultAIStrategy().id;
    
    return {
      id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      gameType: this.getGameType(),
      strategyId: strategy,
      difficulty: difficulty || 'medium',
      createdAt: new Date(),
    };
  }

  private registerAIStrategies(): void {
    // Easy AI - Random moves
    this.aiStrategies.set('easy', new RandomAIStrategy());
    
    // Medium AI - Basic heuristics
    this.aiStrategies.set('medium', new HeuristicAIStrategy());
    
    // Hard AI - Advanced algorithm
    this.aiStrategies.set('hard', new OptimalAIStrategy());
  }
}
```

#### Example AI Strategy Implementation

Here's a complete example of implementing AI strategies for Tic-Tac-Toe:

```typescript
// Easy AI Strategy - Random valid moves
export class EasyTicTacToeStrategy implements AIStrategy {
  id = 'easy';
  name = 'Easy';
  description = 'Makes random valid moves';
  difficulty = 'easy';

  async generateMove(state: GameState, aiPlayerId: string): Promise<Move> {
    const validMoves = this.getValidMoves(state);
    
    if (validMoves.length === 0) {
      throw new Error('No valid moves available');
    }

    const randomIndex = Math.floor(Math.random() * validMoves.length);
    return validMoves[randomIndex];
  }

  private getValidMoves(state: GameState): Move[] {
    const moves: Move[] = [];
    
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const space = state.board.spaces.find(s => s.id === `${row},${col}`);
        if (space && space.tokens.length === 0) {
          moves.push({
            playerId: '', // Will be set by the service
            timestamp: new Date(),
            action: 'place',
            parameters: { row, col },
          });
        }
      }
    }
    
    return moves;
  }
}

// Perfect Play AI Strategy - Minimax algorithm
export class PerfectTicTacToeStrategy implements AIStrategy {
  id = 'perfect-play';
  name = 'Perfect Play';
  description = 'Uses minimax algorithm for optimal play';
  difficulty = 'hard';

  async generateMove(state: GameState, aiPlayerId: string): Promise<Move> {
    const bestMove = this.minimax(state, aiPlayerId, true);
    
    if (!bestMove.move) {
      throw new Error('No optimal move found');
    }

    return bestMove.move;
  }

  private minimax(state: GameState, aiPlayerId: string, isMaximizing: boolean): { score: number; move?: Move } {
    // Check terminal states
    const winner = this.getWinner(state);
    if (winner === aiPlayerId) return { score: 10 };
    if (winner && winner !== aiPlayerId) return { score: -10 };
    if (this.isBoardFull(state)) return { score: 0 };

    const validMoves = this.getValidMoves(state);
    let bestScore = isMaximizing ? -Infinity : Infinity;
    let bestMove: Move | undefined;

    for (const move of validMoves) {
      // Simulate the move
      const newState = this.simulateMove(state, move, isMaximizing ? aiPlayerId : this.getOpponentId(state, aiPlayerId));
      const result = this.minimax(newState, aiPlayerId, !isMaximizing);

      if (isMaximizing) {
        if (result.score > bestScore) {
          bestScore = result.score;
          bestMove = move;
        }
      } else {
        if (result.score < bestScore) {
          bestScore = result.score;
          bestMove = move;
        }
      }
    }

    return { score: bestScore, move: bestMove };
  }

  private simulateMove(state: GameState, move: Move, playerId: string): GameState {
    // Create a copy of the state and apply the move
    const newSpaces = state.board.spaces.map(space => {
      if (space.id === `${move.parameters.row},${move.parameters.col}`) {
        return {
          ...space,
          tokens: [{
            id: `token-${Date.now()}`,
            type: this.getPlayerSymbol(state, playerId),
            ownerId: playerId,
          }],
        };
      }
      return space;
    });

    return {
      ...state,
      board: { ...state.board, spaces: newSpaces },
    };
  }

  private getPlayerSymbol(state: GameState, playerId: string): string {
    const playerIndex = state.players.findIndex(p => p.id === playerId);
    return playerIndex === 0 ? 'X' : 'O';
  }

  private getOpponentId(state: GameState, playerId: string): string {
    return state.players.find(p => p.id !== playerId)?.id || '';
  }

  // ... helper methods for getWinner, isBoardFull, getValidMoves ...
}
```

#### AI Performance Requirements

When implementing AI strategies, follow these performance guidelines:

**Timing Requirements:**
- **Default timeout**: 1 second per move
- **Tic-tac-toe**: Target < 100ms for perfect play
- **Complex games**: May use up to 5 seconds for hard difficulty

**Memory Usage:**
- Keep memory usage reasonable (< 100MB per AI instance)
- Clean up temporary data structures after move generation
- Avoid memory leaks in long-running games

**Error Handling:**
- Always handle edge cases (no valid moves, invalid game state)
- Provide meaningful error messages for debugging
- Implement graceful degradation for timeout scenarios

```typescript
async generateMove(state: GameState, aiPlayerId: string): Promise<Move> {
  try {
    // Set up timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('AI move generation timeout')), 1000);
    });

    // Generate move with timeout
    const movePromise = this.computeOptimalMove(state, aiPlayerId);
    const move = await Promise.race([movePromise, timeoutPromise]);

    // Validate the generated move
    if (!this.isValidMove(state, move)) {
      throw new Error('AI generated invalid move');
    }

    return move;
  } catch (error) {
    // Log error with context for debugging
    console.error('AI move generation failed:', {
      gameId: state.gameId,
      aiPlayerId,
      error: error.message,
      gameState: this.serializeGameState(state),
    });

    // Fallback to random move
    return this.generateRandomMove(state);
  }
}
```

#### AI Strategy Registration

Register your AI strategies in the game engine constructor:

```typescript
export class TicTacToeEngine extends BaseGameEngine implements AICapableGamePlugin {
  private aiStrategies: Map<string, AIStrategy> = new Map();

  constructor() {
    super();
    this.registerAIStrategies();
  }

  private registerAIStrategies(): void {
    // Register all available strategies
    this.aiStrategies.set('easy', new EasyTicTacToeStrategy());
    this.aiStrategies.set('perfect-play', new PerfectTicTacToeStrategy());
    
    // The system will automatically provide a fallback random strategy
    // if no strategies are registered
  }

  getAIStrategies(): AIStrategy[] {
    return Array.from(this.aiStrategies.values());
  }

  getDefaultAIStrategy(): AIStrategy {
    // Return the recommended default strategy
    return this.aiStrategies.get('perfect-play') || this.aiStrategies.values().next().value;
  }
}
```

#### Testing AI Strategies

Create comprehensive tests for your AI strategies:

```typescript
describe('TicTacToe AI Strategies', () => {
  let engine: TicTacToeEngine;
  let easyStrategy: EasyTicTacToeStrategy;
  let perfectStrategy: PerfectTicTacToeStrategy;

  beforeEach(() => {
    engine = new TicTacToeEngine();
    easyStrategy = new EasyTicTacToeStrategy();
    perfectStrategy = new PerfectTicTacToeStrategy();
  });

  describe('Easy Strategy', () => {
    it('should generate valid moves', async () => {
      const state = createGameState();
      const move = await easyStrategy.generateMove(state, 'ai-player');
      
      const validation = engine.validateMove(state, 'ai-player', move);
      expect(validation.valid).toBe(true);
    });

    it('should handle empty board', async () => {
      const state = createEmptyGameState();
      const move = await easyStrategy.generateMove(state, 'ai-player');
      
      expect(move).toBeDefined();
      expect(move.action).toBe('place');
    });
  });

  describe('Perfect Strategy', () => {
    it('should win when possible', async () => {
      // Create a state where AI can win in one move
      const state = createWinningGameState();
      const move = await perfectStrategy.generateMove(state, 'ai-player');
      
      const newState = engine.applyMove(state, 'ai-player', move);
      expect(engine.getWinner(newState)).toBe('ai-player');
    });

    it('should block opponent wins', async () => {
      // Create a state where opponent can win
      const state = createBlockingGameState();
      const move = await perfectStrategy.generateMove(state, 'ai-player');
      
      // Verify the move blocks the opponent
      const newState = engine.applyMove(state, 'ai-player', move);
      expect(engine.getWinner(newState)).toBeNull();
    });

    it('should never lose against random play', async () => {
      // Property-based test: perfect AI should never lose
      for (let i = 0; i < 100; i++) {
        const result = await simulateGame(perfectStrategy, easyStrategy);
        expect(result).not.toBe('easy-loss'); // Perfect AI should never lose
      }
    });
  });
});
```

#### AI Strategy Best Practices

**1. Deterministic Behavior (when possible):**
```typescript
// Good: Deterministic with optional randomness
generateMove(state: GameState, aiPlayerId: string): Promise<Move> {
  const optimalMoves = this.findOptimalMoves(state);
  
  if (optimalMoves.length === 1) {
    return optimalMoves[0]; // Deterministic when only one optimal move
  }
  
  // Add controlled randomness for variety
  return this.selectRandomly(optimalMoves);
}
```

**2. Difficulty Scaling:**
```typescript
class ScalableAIStrategy implements AIStrategy {
  constructor(private difficulty: 'easy' | 'medium' | 'hard') {}

  async generateMove(state: GameState, aiPlayerId: string): Promise<Move> {
    switch (this.difficulty) {
      case 'easy':
        return this.generateRandomMove(state);
      case 'medium':
        return this.generateHeuristicMove(state, aiPlayerId);
      case 'hard':
        return this.generateOptimalMove(state, aiPlayerId);
    }
  }
}
```

**3. Graceful Degradation:**
```typescript
async generateMove(state: GameState, aiPlayerId: string): Promise<Move> {
  try {
    // Try optimal algorithm first
    return await this.generateOptimalMove(state, aiPlayerId);
  } catch (error) {
    console.warn('Optimal AI failed, falling back to heuristic');
    try {
      return await this.generateHeuristicMove(state, aiPlayerId);
    } catch (error) {
      console.warn('Heuristic AI failed, falling back to random');
      return await this.generateRandomMove(state, aiPlayerId);
    }
  }
}
```

### Custom Game Phases

Some games have multiple phases (e.g., setup, main game, scoring):

```typescript
initializeGame(players: Player[], config: GameConfig): GameState {
  return {
    // ...
    phase: 'setup',
    metadata: {
      setupComplete: false,
    },
  };
}

applyMove(state: GameState, playerId: string, move: Move): GameState {
  let newState = { ...state };

  if (state.phase === 'setup') {
    newState = this.handleSetupMove(newState, move);
    if (this.isSetupComplete(newState)) {
      newState.phase = 'main';
    }
  } else if (state.phase === 'main') {
    newState = this.handleMainMove(newState, move);
    if (this.isGameOver(newState)) {
      newState.phase = 'scoring';
    }
  }

  return newState;
}
```

### Complex Board Structures

For non-grid boards (e.g., hex grids, graphs):

```typescript
private createHexBoard(): Board {
  const spaces: Space[] = [];

  // Hex grid with axial coordinates
  for (let q = -2; q <= 2; q++) {
    for (let r = -2; r <= 2; r++) {
      if (Math.abs(q + r) <= 2) {
        spaces.push({
          id: `${q},${r}`,
          position: { x: q, y: r },
          tokens: [],
          metadata: { neighbors: this.getHexNeighbors(q, r) },
        });
      }
    }
  }

  return { spaces, metadata: { type: 'hex' } };
}
```

### Lifecycle Hooks

Use lifecycle hooks for side effects:

```typescript
onGameStarted(state: GameState): void {
  console.log(`Game ${state.gameId} started with ${state.players.length} players`);
  // Could trigger notifications, analytics, etc.
}

afterApplyMove(oldState: GameState, newState: GameState, move: Move): void {
  if (this.isGameOver(newState) && !this.isGameOver(oldState)) {
    console.log(`Game ${newState.gameId} ended. Winner: ${this.getWinner(newState)}`);
  }
}
```

## Troubleshooting

### Common Issues

**Issue: Moves not being applied**
- Check that `validateMove` returns `{ valid: true }`
- Verify that `applyMove` returns a new state object
- Ensure version number is incremented

**Issue: Board not rendering**
- Check that `renderBoard` returns valid `BoardRenderData`
- Verify SVG element attributes are correct
- Test rendering with a simple board first

**Issue: Game not ending**
- Verify `isGameOver` logic
- Check that `getWinner` returns correct player ID or null
- Ensure lifecycle state transitions correctly

### AI-Specific Issues

**Issue: AI moves not being generated**
- Verify `AICapableGamePlugin` interface is implemented
- Check that AI strategies are registered in constructor
- Ensure `generateMove` method doesn't throw exceptions
- Verify AI player IDs are correctly identified

**Issue: AI moves are invalid**
- Test AI-generated moves with your `validateMove` method
- Check that AI strategy uses correct move format
- Verify AI understands current game state correctly
- Add logging to see what moves AI is generating

**Issue: AI is too slow**
- Profile your AI algorithm for performance bottlenecks
- Implement timeout handling in `generateMove`
- Consider caching computed values
- Use iterative deepening for complex algorithms

**Issue: AI makes poor moves**
- Verify your game state evaluation function
- Check that AI considers all valid moves
- Test with known game positions
- Add difficulty levels for different AI strengths

**Example AI Debugging:**
```typescript
async generateMove(state: GameState, aiPlayerId: string): Promise<Move> {
  console.log('AI generating move for game:', state.gameId);
  console.log('Current board state:', JSON.stringify(state.board, null, 2));
  
  const validMoves = this.getValidMoves(state);
  console.log('Valid moves available:', validMoves.length);
  
  const selectedMove = this.selectBestMove(validMoves, state);
  console.log('AI selected move:', selectedMove);
  
  return selectedMove;
}
```

## Resources

- [Domain Models Documentation](../src/domain/models/README.md)
- [Interface Definitions](../src/domain/interfaces/README.md)
- [AI Player System Design](../.kiro/specs/ai-player-system/design.md)
- [AI Player System Requirements](../.kiro/specs/ai-player-system/requirements.md)
- [Tic-Tac-Toe Implementation](../games/tic-tac-toe/)
- [Tic-Tac-Toe AI Strategies](../games/tic-tac-toe/ai/)
- [Test Utilities](../tests/utils/)
- [API Documentation](./API.md)

## Contributing

When contributing a new game plugin:

1. Create a new directory under `src/adapters/plugins/your-game/`
2. Implement the game engine extending `BaseGameEngine`
3. Implement AI strategies by adding `AICapableGamePlugin` interface
4. Create at least one AI strategy (easy/random recommended as minimum)
5. Write comprehensive tests for both game logic and AI strategies
6. Add documentation for move parameters, game rules, and AI behavior
7. Register the plugin in `src/index.ts`
8. Update API documentation if needed
9. Submit a pull request

### AI Strategy Contribution Guidelines

When adding AI strategies to existing games:

1. **Minimum Requirements:**
   - Implement at least one difficulty level
   - Ensure moves are generated within 1-second timeout
   - Handle all edge cases gracefully
   - Provide meaningful error messages

2. **Recommended Strategies:**
   - **Easy**: Random valid moves
   - **Medium**: Basic heuristics or rule-based play
   - **Hard**: Advanced algorithms (minimax, Monte Carlo, etc.)

3. **Testing Requirements:**
   - Unit tests for move generation
   - Performance tests for timing requirements
   - Property-based tests for correctness
   - Integration tests with the game engine

4. **Documentation:**
   - Describe the AI algorithm used
   - Document performance characteristics
   - Explain difficulty differences
   - Provide usage examples

Happy coding! 🎮🤖
