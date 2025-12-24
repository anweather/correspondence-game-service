#!/usr/bin/env ts-node
/* eslint-disable */
/**
 * Script to generate SVG examples of Yahtzee board states
 * Usage: npx ts-node games/yahtzee/scripts/generate-svg-examples.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { GameState, GameLifecycle, Board } from '../../../src/domain/models';
import { renderBoard } from '../engine/renderer';
import { YahtzeeMetadata, YahtzeeCategory, Scorecard, DiceState } from '../shared/types';
import { RenderElement } from '../../../src/domain/interfaces';

/**
 * Convert RenderElement to SVG string
 */
function elementToSVG(element: RenderElement): string {
  const { type, attributes, textContent } = element;
  const attrs = Object.entries(attributes)
    .map(([key, value]) => {
      // Convert camelCase to kebab-case for SVG attributes
      const attrName = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${attrName}="${value}"`;
    })
    .join(' ');

  if (type === 'circle' || type === 'rect' || type === 'image') {
    return `<${type} ${attrs} />`;
  } else if (type === 'path') {
    return `<path ${attrs} />`;
  } else if (type === 'text') {
    const content = textContent || attributes.content || '';
    return `<text ${attrs}>${content}</text>`;
  }

  return '';
}

/**
 * Convert BoardRenderData to complete SVG string
 */
function renderDataToSVG(renderData: ReturnType<typeof renderBoard>, title: string): string {
  const { viewBox, backgroundColor, layers } = renderData;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     viewBox="0 0 ${viewBox.width} ${viewBox.height}" 
     width="${viewBox.width}" 
     height="${viewBox.height}">
  <title>${title}</title>
  <rect width="100%" height="100%" fill="${backgroundColor || 'white'}" />
`;

  // Sort layers by zIndex and render
  const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

  for (const layer of sortedLayers) {
    svg += `  <g id="${layer.name}">\n`;
    for (const element of layer.elements) {
      svg += `    ${elementToSVG(element)}\n`;
    }
    svg += `  </g>\n`;
  }

  svg += `</svg>`;
  return svg;
}

/**
 * Create a test game state
 */
function createGameState(
  players: Array<{ id: string; name: string }>,
  currentPlayerIndex: number,
  diceState: DiceState,
  scorecards: Map<string, Scorecard>,
  rollCount: number,
  gamePhase: 'rolling' | 'scoring',
  lifecycle: GameLifecycle = GameLifecycle.ACTIVE,
  winner: string | null = null
): GameState<YahtzeeMetadata> {
  const domainBoard: Board = {
    spaces: [],
    metadata: {},
  };

  const metadata: YahtzeeMetadata = {
    scorecards,
    currentDice: diceState,
    rollCount,
    gamePhase,
    rollHistory: [],
    randomSeed: 'example-seed',
  };

  return {
    gameId: 'example-game',
    gameType: 'yahtzee',
    lifecycle,
    players: players.map((p) => ({ ...p, joinedAt: new Date() })),
    currentPlayerIndex,
    phase: 'playing',
    board: domainBoard,
    moveHistory: [],
    metadata,
    winner,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Create a scorecard with specific filled categories
 */
function createScorecard(
  playerId: string,
  filledCategories: Array<{ category: YahtzeeCategory; score: number }>
): Scorecard {
  const scorecard: Scorecard = {
    playerId,
    categories: new Map(),
    upperSectionTotal: 0,
    upperSectionBonus: 0,
    lowerSectionTotal: 0,
    grandTotal: 0,
  };

  // Fill specified categories
  filledCategories.forEach(({ category, score }) => {
    scorecard.categories.set(category, score);

    // Calculate section totals
    const upperCategories = [
      YahtzeeCategory.ONES,
      YahtzeeCategory.TWOS,
      YahtzeeCategory.THREES,
      YahtzeeCategory.FOURS,
      YahtzeeCategory.FIVES,
      YahtzeeCategory.SIXES,
    ];

    if (upperCategories.includes(category)) {
      scorecard.upperSectionTotal += score;
    } else {
      scorecard.lowerSectionTotal += score;
    }
  });

  // Calculate bonus
  if (scorecard.upperSectionTotal >= 63) {
    scorecard.upperSectionBonus = 35;
  }

  // Calculate grand total
  scorecard.grandTotal =
    scorecard.upperSectionTotal + scorecard.upperSectionBonus + scorecard.lowerSectionTotal;

  return scorecard;
}

/**
 * Generate example SVGs
 */
function generateExamples() {
  const outputDir = path.join(__dirname, '../../../docs/yahtzee-examples');

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Example 1: New game - first roll
  const newGameDice: DiceState = {
    values: [3, 1, 4, 1, 5],
    keptDice: [false, false, false, false, false],
  };

  const newGameScorecard = createScorecard('player1', []);
  const newGameState = createGameState(
    [{ id: 'player1', name: 'Alice' }],
    0,
    newGameDice,
    new Map([['player1', newGameScorecard]]),
    1,
    'rolling'
  );

  const newGameSVG = renderDataToSVG(renderBoard(newGameState), 'Yahtzee - New Game First Roll');
  fs.writeFileSync(path.join(outputDir, '01-new-game-first-roll.svg'), newGameSVG);
  console.log('✓ Generated: 01-new-game-first-roll.svg');

  // Example 2: Mid-turn with kept dice
  const midTurnDice: DiceState = {
    values: [4, 4, 2, 4, 6],
    keptDice: [true, true, false, true, false],
  };

  const midTurnScorecard = createScorecard('player1', [
    { category: YahtzeeCategory.ONES, score: 2 },
    { category: YahtzeeCategory.TWOS, score: 6 },
    { category: YahtzeeCategory.FULL_HOUSE, score: 25 },
  ]);

  const midTurnState = createGameState(
    [{ id: 'player1', name: 'Alice' }],
    0,
    midTurnDice,
    new Map([['player1', midTurnScorecard]]),
    2,
    'rolling'
  );

  const midTurnSVG = renderDataToSVG(
    renderBoard(midTurnState),
    'Yahtzee - Mid Turn with Kept Dice'
  );
  fs.writeFileSync(path.join(outputDir, '02-mid-turn-kept-dice.svg'), midTurnSVG);
  console.log('✓ Generated: 02-mid-turn-kept-dice.svg');

  // Example 3: Scoring phase - Yahtzee!
  const yahtzeeRollDice: DiceState = {
    values: [6, 6, 6, 6, 6],
    keptDice: [true, true, true, true, true],
  };

  const yahtzeeScorecard = createScorecard('player1', [
    { category: YahtzeeCategory.ONES, score: 4 },
    { category: YahtzeeCategory.TWOS, score: 8 },
    { category: YahtzeeCategory.THREES, score: 12 },
    { category: YahtzeeCategory.FOURS, score: 16 },
    { category: YahtzeeCategory.FIVES, score: 20 },
    { category: YahtzeeCategory.THREE_OF_A_KIND, score: 18 },
    { category: YahtzeeCategory.FOUR_OF_A_KIND, score: 22 },
  ]);

  const yahtzeeState = createGameState(
    [{ id: 'player1', name: 'Alice' }],
    0,
    yahtzeeRollDice,
    new Map([['player1', yahtzeeScorecard]]),
    3,
    'scoring'
  );

  const yahtzeeSVG = renderDataToSVG(
    renderBoard(yahtzeeState),
    'Yahtzee - Scoring Phase with Yahtzee Roll'
  );
  fs.writeFileSync(path.join(outputDir, '03-yahtzee-roll-scoring.svg'), yahtzeeSVG);
  console.log('✓ Generated: 03-yahtzee-roll-scoring.svg');

  // Example 4: Two-player game in progress
  const twoPlayerDice: DiceState = {
    values: [2, 3, 4, 5, 6],
    keptDice: [false, true, true, true, true],
  };

  const player1Scorecard = createScorecard('player1', [
    { category: YahtzeeCategory.ONES, score: 3 },
    { category: YahtzeeCategory.TWOS, score: 6 },
    { category: YahtzeeCategory.THREES, score: 9 },
    { category: YahtzeeCategory.FOURS, score: 12 },
    { category: YahtzeeCategory.FIVES, score: 15 },
    { category: YahtzeeCategory.SIXES, score: 18 },
    { category: YahtzeeCategory.FULL_HOUSE, score: 25 },
    { category: YahtzeeCategory.SMALL_STRAIGHT, score: 30 },
  ]);

  const player2Scorecard = createScorecard('player2', [
    { category: YahtzeeCategory.ONES, score: 1 },
    { category: YahtzeeCategory.TWOS, score: 4 },
    { category: YahtzeeCategory.THREES, score: 6 },
    { category: YahtzeeCategory.FOURS, score: 8 },
    { category: YahtzeeCategory.YAHTZEE, score: 50 },
    { category: YahtzeeCategory.CHANCE, score: 28 },
  ]);

  const twoPlayerState = createGameState(
    [
      { id: 'player1', name: 'Alice' },
      { id: 'player2', name: 'Bob' },
    ],
    0, // Alice's turn
    twoPlayerDice,
    new Map([
      ['player1', player1Scorecard],
      ['player2', player2Scorecard],
    ]),
    1,
    'rolling'
  );

  const twoPlayerSVG = renderDataToSVG(
    renderBoard(twoPlayerState),
    'Yahtzee - Two Player Game in Progress'
  );
  fs.writeFileSync(path.join(outputDir, '04-two-player-game.svg'), twoPlayerSVG);
  console.log('✓ Generated: 04-two-player-game.svg');

  // Example 5: Game completed with winner
  const completedDice: DiceState = {
    values: [1, 2, 3, 4, 5],
    keptDice: [false, false, false, false, false],
  };

  const winnerScorecard = createScorecard('player1', [
    { category: YahtzeeCategory.ONES, score: 4 },
    { category: YahtzeeCategory.TWOS, score: 8 },
    { category: YahtzeeCategory.THREES, score: 12 },
    { category: YahtzeeCategory.FOURS, score: 16 },
    { category: YahtzeeCategory.FIVES, score: 20 },
    { category: YahtzeeCategory.SIXES, score: 24 }, // 84 total = bonus
    { category: YahtzeeCategory.THREE_OF_A_KIND, score: 18 },
    { category: YahtzeeCategory.FOUR_OF_A_KIND, score: 22 },
    { category: YahtzeeCategory.FULL_HOUSE, score: 25 },
    { category: YahtzeeCategory.SMALL_STRAIGHT, score: 30 },
    { category: YahtzeeCategory.LARGE_STRAIGHT, score: 40 },
    { category: YahtzeeCategory.YAHTZEE, score: 50 },
    { category: YahtzeeCategory.CHANCE, score: 28 },
  ]);

  const loserScorecard = createScorecard('player2', [
    { category: YahtzeeCategory.ONES, score: 2 },
    { category: YahtzeeCategory.TWOS, score: 4 },
    { category: YahtzeeCategory.THREES, score: 6 },
    { category: YahtzeeCategory.FOURS, score: 8 },
    { category: YahtzeeCategory.FIVES, score: 10 },
    { category: YahtzeeCategory.SIXES, score: 12 }, // 42 total = no bonus
    { category: YahtzeeCategory.THREE_OF_A_KIND, score: 15 },
    { category: YahtzeeCategory.FOUR_OF_A_KIND, score: 0 },
    { category: YahtzeeCategory.FULL_HOUSE, score: 25 },
    { category: YahtzeeCategory.SMALL_STRAIGHT, score: 0 },
    { category: YahtzeeCategory.LARGE_STRAIGHT, score: 0 },
    { category: YahtzeeCategory.YAHTZEE, score: 0 },
    { category: YahtzeeCategory.CHANCE, score: 20 },
  ]);

  const completedState = createGameState(
    [
      { id: 'player1', name: 'Alice' },
      { id: 'player2', name: 'Bob' },
    ],
    0,
    completedDice,
    new Map([
      ['player1', winnerScorecard],
      ['player2', loserScorecard],
    ]),
    1,
    'rolling',
    GameLifecycle.COMPLETED,
    'player1'
  );

  const completedSVG = renderDataToSVG(
    renderBoard(completedState),
    'Yahtzee - Completed Game with Winner'
  );
  fs.writeFileSync(path.join(outputDir, '05-completed-game-winner.svg'), completedSVG);
  console.log('✓ Generated: 05-completed-game-winner.svg');

  // Example 6: Four-player game
  const fourPlayerDice: DiceState = {
    values: [1, 1, 1, 2, 3],
    keptDice: [true, true, true, false, false],
  };

  const fourPlayerScorecards = new Map([
    [
      'player1',
      createScorecard('player1', [
        { category: YahtzeeCategory.ONES, score: 5 },
        { category: YahtzeeCategory.THREES, score: 9 },
        { category: YahtzeeCategory.FULL_HOUSE, score: 25 },
      ]),
    ],
    [
      'player2',
      createScorecard('player2', [
        { category: YahtzeeCategory.TWOS, score: 6 },
        { category: YahtzeeCategory.FOURS, score: 12 },
        { category: YahtzeeCategory.YAHTZEE, score: 50 },
      ]),
    ],
    [
      'player3',
      createScorecard('player3', [
        { category: YahtzeeCategory.FIVES, score: 15 },
        { category: YahtzeeCategory.SIXES, score: 18 },
        { category: YahtzeeCategory.CHANCE, score: 22 },
      ]),
    ],
    [
      'player4',
      createScorecard('player4', [
        { category: YahtzeeCategory.THREE_OF_A_KIND, score: 18 },
        { category: YahtzeeCategory.FOUR_OF_A_KIND, score: 24 },
        { category: YahtzeeCategory.SMALL_STRAIGHT, score: 30 },
      ]),
    ],
  ]);

  const fourPlayerState = createGameState(
    [
      { id: 'player1', name: 'Alice' },
      { id: 'player2', name: 'Bob' },
      { id: 'player3', name: 'Carol' },
      { id: 'player4', name: 'Dave' },
    ],
    2, // Carol's turn
    fourPlayerDice,
    fourPlayerScorecards,
    2,
    'rolling'
  );

  const fourPlayerSVG = renderDataToSVG(renderBoard(fourPlayerState), 'Yahtzee - Four Player Game');
  fs.writeFileSync(path.join(outputDir, '06-four-player-game.svg'), fourPlayerSVG);
  console.log('✓ Generated: 06-four-player-game.svg');

  console.log(`\n✅ All Yahtzee SVG examples generated in: ${outputDir}`);
  console.log('\nTo view the SVGs:');
  console.log('1. Open any SVG file in a web browser');
  console.log('2. Or use: open docs/yahtzee-examples/01-new-game-first-roll.svg');
}

// Run the script
generateExamples();
