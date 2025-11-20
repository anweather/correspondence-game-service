import { BaseGameEngine } from '@domain/interfaces';
import { GameState, Player, Move, GameLifecycle } from '@domain/models';
import { GameConfig, ValidationResult, BoardRenderData } from '@domain/interfaces';

/**
 * Mock game engine for testing purposes.
 * Provides configurable behavior for all game engine methods.
 *
 * @example
 * const mockEngine = new MockGameEngine('test-game')
 *   .withMinPlayers(2)
 *   .withMaxPlayers(4)
 *   .withValidationResult({ valid: true });
 */
export class MockGameEngine extends BaseGameEngine {
  private gameType: string;
  private minPlayers: number = 2;
  private maxPlayers: number = 4;
  private description: string = 'Mock game for testing';
  private validationResult: ValidationResult = { valid: true };
  private gameOverResult: boolean = false;
  private winnerResult: string | null = null;
  private shouldThrowOnInitialize: boolean = false;
  private shouldThrowOnApplyMove: boolean = false;

  // Hook tracking
  public onGameCreatedCalled: boolean = false;
  public onPlayerJoinedCalled: boolean = false;
  public onGameStartedCalled: boolean = false;
  public onGameEndedCalled: boolean = false;
  public beforeInitializeGameCalled: boolean = false;
  public afterInitializeGameCalled: boolean = false;
  public beforeValidateMoveCalled: boolean = false;
  public afterValidateMoveCalled: boolean = false;
  public beforeApplyMoveCalled: boolean = false;
  public afterApplyMoveCalled: boolean = false;
  public beforeRenderBoardCalled: boolean = false;
  public afterRenderBoardCalled: boolean = false;

  constructor(gameType: string = 'mock-game') {
    super();
    this.gameType = gameType;
  }

  // Configuration methods
  withMinPlayers(min: number): this {
    this.minPlayers = min;
    return this;
  }

  withMaxPlayers(max: number): this {
    this.maxPlayers = max;
    return this;
  }

  withDescription(description: string): this {
    this.description = description;
    return this;
  }

  withValidationResult(result: ValidationResult): this {
    this.validationResult = result;
    return this;
  }

  withGameOverResult(isOver: boolean): this {
    this.gameOverResult = isOver;
    return this;
  }

  withWinnerResult(winner: string | null): this {
    this.winnerResult = winner;
    return this;
  }

  throwOnInitialize(): this {
    this.shouldThrowOnInitialize = true;
    return this;
  }

  throwOnApplyMove(): this {
    this.shouldThrowOnApplyMove = true;
    return this;
  }

  // Reset hook tracking
  resetHookTracking(): void {
    this.onGameCreatedCalled = false;
    this.onPlayerJoinedCalled = false;
    this.onGameStartedCalled = false;
    this.onGameEndedCalled = false;
    this.beforeInitializeGameCalled = false;
    this.afterInitializeGameCalled = false;
    this.beforeValidateMoveCalled = false;
    this.afterValidateMoveCalled = false;
    this.beforeApplyMoveCalled = false;
    this.afterApplyMoveCalled = false;
    this.beforeRenderBoardCalled = false;
    this.afterRenderBoardCalled = false;
  }

  // GameEnginePlugin implementation
  getGameType(): string {
    return this.gameType;
  }

  getMinPlayers(): number {
    return this.minPlayers;
  }

  getMaxPlayers(): number {
    return this.maxPlayers;
  }

  getDescription(): string {
    return this.description;
  }

  // Lifecycle hooks
  onGameCreated(_state: GameState, _config: GameConfig): void {
    this.onGameCreatedCalled = true;
  }

  onPlayerJoined(_state: GameState, _playerId: string): void {
    this.onPlayerJoinedCalled = true;
  }

  onGameStarted(_state: GameState): void {
    this.onGameStartedCalled = true;
  }

  onGameEnded(_state: GameState): void {
    this.onGameEndedCalled = true;
  }

  // Core game logic with hooks
  beforeInitializeGame?(_players: Player[], _config: GameConfig): void {
    this.beforeInitializeGameCalled = true;
  }

  initializeGame(players: Player[], _config: GameConfig): GameState {
    if (this.shouldThrowOnInitialize) {
      throw new Error('Mock initialization error');
    }

    return {
      gameId: 'mock-game-id',
      gameType: this.gameType,
      lifecycle:
        players.length >= this.minPlayers
          ? GameLifecycle.ACTIVE
          : GameLifecycle.WAITING_FOR_PLAYERS,
      players,
      currentPlayerIndex: 0,
      phase: 'main',
      board: { spaces: [], metadata: {} },
      moveHistory: [],
      metadata: {},
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  afterInitializeGame?(_state: GameState): void {
    this.afterInitializeGameCalled = true;
  }

  beforeValidateMove?(_state: GameState, _playerId: string, _move: Move): void {
    this.beforeValidateMoveCalled = true;
  }

  validateMove(_state: GameState, _playerId: string, _move: Move): ValidationResult {
    return this.validationResult;
  }

  afterValidateMove?(
    _state: GameState,
    _playerId: string,
    _move: Move,
    _result: ValidationResult
  ): void {
    this.afterValidateMoveCalled = true;
  }

  beforeApplyMove?(_state: GameState, _playerId: string, _move: Move): void {
    this.beforeApplyMoveCalled = true;
  }

  applyMove(state: GameState, _playerId: string, move: Move): GameState {
    if (this.shouldThrowOnApplyMove) {
      throw new Error('Mock apply move error');
    }

    return {
      ...state,
      moveHistory: [...state.moveHistory, move],
      version: state.version + 1,
      updatedAt: new Date(),
    };
  }

  afterApplyMove?(_oldState: GameState, _newState: GameState, _move: Move): void {
    this.afterApplyMoveCalled = true;
  }

  isGameOver(_state: GameState): boolean {
    return this.gameOverResult;
  }

  getWinner(_state: GameState): string | null {
    return this.winnerResult;
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
    return {
      ...state,
      currentPlayerIndex: nextIndex,
    };
  }

  beforeRenderBoard?(_state: GameState): void {
    this.beforeRenderBoardCalled = true;
  }

  renderBoard(_state: GameState): BoardRenderData {
    return {
      viewBox: { width: 100, height: 100 },
      backgroundColor: '#ffffff',
      spaces: [],
      layers: [
        {
          name: 'mock-layer',
          zIndex: 1,
          elements: [],
        },
      ],
    };
  }

  afterRenderBoard?(_state: GameState, _renderData: BoardRenderData): void {
    this.afterRenderBoardCalled = true;
  }
}
