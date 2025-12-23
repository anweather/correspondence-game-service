/**
 * Yahtzee Initialization Module
 * 
 * Handles game state creation with empty scorecards and initial dice state.
 * Requirements: 1.1, 1.2, 1.3
 */

import { GameState, Player, GameLifecycle, Board } from '@domain/models';
import { GameConfig } from '@domain/interfaces';
import { DiceEngine } from '@domain/game-utils/DiceEngine';
import { 
  YahtzeeMetadata, 
  Scorecard, 
  DiceState 
} from '../shared/types';
import { 
  GAME_TYPE,
  DICE_COUNT,
  DICE_SIDES,
  ALL_CATEGORIES 
} from '../shared/constants';

/**
 * Creates an empty scorecard for a player with all categories available
 * @param playerId - The player's unique identifier
 * @returns Empty scorecard with all categories set to null
 * Requirements: 1.2
 */
export function createEmptyScorecard(playerId: string): Scorecard {
  const categories = new Map();
  
  // Initialize all categories as null (available)
  ALL_CATEGORIES.forEach(category => {
    categories.set(category, null);
  });

  return {
    playerId,
    categories,
    upperSectionTotal: 0,
    upperSectionBonus: 0,
    lowerSectionTotal: 0,
    grandTotal: 0,
  };
}

/**
 * Creates initial dice state with random values and no dice kept
 * @returns Initial dice state with 5 dice, none kept
 * Requirements: 1.3
 */
export function createInitialDiceState(): DiceState {
  const diceEngine = new DiceEngine();
  const values = diceEngine.rollDice(DICE_COUNT, DICE_SIDES);
  const keptDice = new Array(DICE_COUNT).fill(false);

  return {
    values,
    keptDice,
  };
}

/**
 * Initialize a new Yahtzee game state
 * 
 * @param players Array of players joining the game (1-8 players)
 * @param config Game configuration options
 * @returns Initial game state with empty scorecards and initial dice
 * Requirements: 1.1, 1.2, 1.3
 */
export function initializeGame(players: Player[], config: GameConfig): GameState<YahtzeeMetadata> {
  // Generate game ID
  const gameId = config.customSettings?.gameId || `yahtzee-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  
  // Create scorecards for all players
  const scorecards = new Map<string, Scorecard>();
  players.forEach(player => {
    scorecards.set(player.id, createEmptyScorecard(player.id));
  });

  // Create initial dice state
  const currentDice = createInitialDiceState();
  
  // Generate random seed for reproducible dice rolls
  const randomSeed = Math.random().toString(36).substring(2, 15);

  // Create Yahtzee-specific metadata
  const metadata: YahtzeeMetadata = {
    scorecards,
    currentDice,
    rollCount: 0,
    gamePhase: 'rolling',
    rollHistory: [],
    randomSeed,
  };

  // Create empty board (Yahtzee doesn't use a traditional board)
  const board: Board = {
    spaces: [],
    metadata: {},
  };

  const now = new Date();

  // Create initial game state
  const gameState: GameState<YahtzeeMetadata> = {
    gameId,
    gameType: GAME_TYPE,
    lifecycle: GameLifecycle.ACTIVE,
    players,
    currentPlayerIndex: 0, // First player starts
    phase: 'rolling',
    board,
    moveHistory: [],
    metadata,
    winner: null,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };

  return gameState;
}