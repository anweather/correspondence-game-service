#!/usr/bin/env ts-node
/**
 * Script to generate SVG examples of Connect Four board states
 * Usage: npx ts-node games/connect-four/scripts/generate-svg-examples.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { GameState, GameLifecycle, Board } from '../../../src/domain/models';
import { renderBoard } from '../engine/renderer';
import { CellState, ConnectFourMetadata } from '../shared/types';
import { ROWS, COLUMNS } from '../shared/constants';
import { RenderElement } from '../../../src/domain/interfaces';

/**
 * Convert RenderElement to SVG string
 */
function elementToSVG(element: RenderElement): string {
  const { type, attributes } = element;
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
    return `<text ${attrs}>${attributes.content || ''}</text>`;
  }

  return '';
}

/**
 * Convert BoardRenderData to complete SVG string
 */
function renderDataToSVG(
  renderData: ReturnType<typeof renderBoard>,
  title: string
): string {
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
  board: CellState[][],
  lifecycle: GameLifecycle = GameLifecycle.ACTIVE,
  lastMove?: { row: number; column: number; player: string }
): GameState<ConnectFourMetadata> {
  const domainBoard: Board = {
    spaces: [],
    metadata: {},
  };

  const metadata: ConnectFourMetadata = {
    board,
    ...(lastMove && { lastMove }),
  };

  return {
    gameId: 'example-game',
    gameType: 'connect-four',
    lifecycle,
    players: [
      { id: 'player1', name: 'Red Player', joinedAt: new Date() },
      { id: 'player2', name: 'Yellow Player', joinedAt: new Date() },
    ],
    currentPlayerIndex: 0,
    phase: 'playing',
    board: domainBoard,
    moveHistory: [],
    metadata,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Generate example SVGs
 */
function generateExamples() {
  const outputDir = path.join(__dirname, '../../../docs/connect-four-examples');

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Example 1: Empty board
  const emptyBoard: CellState[][] = Array(ROWS)
    .fill(null)
    .map(() => Array(COLUMNS).fill(null));

  const emptyState = createGameState(emptyBoard);
  const emptySVG = renderDataToSVG(
    renderBoard(emptyState),
    'Connect Four - Empty Board'
  );
  fs.writeFileSync(path.join(outputDir, '01-empty-board.svg'), emptySVG);
  console.log('✓ Generated: 01-empty-board.svg');

  // Example 2: Game in progress
  const inProgressBoard: CellState[][] = Array(ROWS)
    .fill(null)
    .map(() => Array(COLUMNS).fill(null));
  inProgressBoard[5][3] = 'red';
  inProgressBoard[5][2] = 'yellow';
  inProgressBoard[4][3] = 'red';
  inProgressBoard[5][4] = 'yellow';
  inProgressBoard[3][3] = 'red';

  const inProgressState = createGameState(inProgressBoard);
  const inProgressSVG = renderDataToSVG(
    renderBoard(inProgressState),
    'Connect Four - Game in Progress'
  );
  fs.writeFileSync(path.join(outputDir, '02-game-in-progress.svg'), inProgressSVG);
  console.log('✓ Generated: 02-game-in-progress.svg');

  // Example 3: Horizontal win
  const horizontalWinBoard: CellState[][] = Array(ROWS)
    .fill(null)
    .map(() => Array(COLUMNS).fill(null));
  horizontalWinBoard[5][0] = 'red';
  horizontalWinBoard[5][1] = 'red';
  horizontalWinBoard[5][2] = 'red';
  horizontalWinBoard[5][3] = 'red';
  horizontalWinBoard[4][0] = 'yellow';
  horizontalWinBoard[4][1] = 'yellow';
  horizontalWinBoard[4][2] = 'yellow';

  const horizontalWinState = createGameState(
    horizontalWinBoard,
    GameLifecycle.COMPLETED,
    { row: 5, column: 3, player: 'player1' }
  );
  const horizontalWinSVG = renderDataToSVG(
    renderBoard(horizontalWinState),
    'Connect Four - Horizontal Win'
  );
  fs.writeFileSync(path.join(outputDir, '03-horizontal-win.svg'), horizontalWinSVG);
  console.log('✓ Generated: 03-horizontal-win.svg');

  // Example 4: Vertical win
  const verticalWinBoard: CellState[][] = Array(ROWS)
    .fill(null)
    .map(() => Array(COLUMNS).fill(null));
  verticalWinBoard[5][3] = 'yellow';
  verticalWinBoard[4][3] = 'yellow';
  verticalWinBoard[3][3] = 'yellow';
  verticalWinBoard[2][3] = 'yellow';
  verticalWinBoard[5][2] = 'red';
  verticalWinBoard[4][2] = 'red';
  verticalWinBoard[3][2] = 'red';

  const verticalWinState = createGameState(
    verticalWinBoard,
    GameLifecycle.COMPLETED,
    { row: 2, column: 3, player: 'player2' }
  );
  const verticalWinSVG = renderDataToSVG(
    renderBoard(verticalWinState),
    'Connect Four - Vertical Win'
  );
  fs.writeFileSync(path.join(outputDir, '04-vertical-win.svg'), verticalWinSVG);
  console.log('✓ Generated: 04-vertical-win.svg');

  // Example 5: Diagonal win (ascending)
  const diagonalUpBoard: CellState[][] = Array(ROWS)
    .fill(null)
    .map(() => Array(COLUMNS).fill(null));
  diagonalUpBoard[5][0] = 'red';
  diagonalUpBoard[4][1] = 'red';
  diagonalUpBoard[3][2] = 'red';
  diagonalUpBoard[2][3] = 'red';
  diagonalUpBoard[5][1] = 'yellow';
  diagonalUpBoard[5][2] = 'yellow';
  diagonalUpBoard[4][2] = 'yellow';
  diagonalUpBoard[5][3] = 'yellow';
  diagonalUpBoard[4][3] = 'yellow';
  diagonalUpBoard[3][3] = 'yellow';

  const diagonalUpState = createGameState(
    diagonalUpBoard,
    GameLifecycle.COMPLETED,
    { row: 2, column: 3, player: 'player1' }
  );
  const diagonalUpSVG = renderDataToSVG(
    renderBoard(diagonalUpState),
    'Connect Four - Diagonal Win (Ascending)'
  );
  fs.writeFileSync(path.join(outputDir, '05-diagonal-win-ascending.svg'), diagonalUpSVG);
  console.log('✓ Generated: 05-diagonal-win-ascending.svg');

  // Example 6: Diagonal win (descending)
  const diagonalDownBoard: CellState[][] = Array(ROWS)
    .fill(null)
    .map(() => Array(COLUMNS).fill(null));
  diagonalDownBoard[2][0] = 'yellow';
  diagonalDownBoard[3][1] = 'yellow';
  diagonalDownBoard[4][2] = 'yellow';
  diagonalDownBoard[5][3] = 'yellow';
  diagonalDownBoard[3][0] = 'red';
  diagonalDownBoard[4][0] = 'red';
  diagonalDownBoard[5][0] = 'red';
  diagonalDownBoard[4][1] = 'red';
  diagonalDownBoard[5][1] = 'red';
  diagonalDownBoard[5][2] = 'red';

  const diagonalDownState = createGameState(
    diagonalDownBoard,
    GameLifecycle.COMPLETED,
    { row: 5, column: 3, player: 'player2' }
  );
  const diagonalDownSVG = renderDataToSVG(
    renderBoard(diagonalDownState),
    'Connect Four - Diagonal Win (Descending)'
  );
  fs.writeFileSync(
    path.join(outputDir, '06-diagonal-win-descending.svg'),
    diagonalDownSVG
  );
  console.log('✓ Generated: 06-diagonal-win-descending.svg');

  // Example 7: Nearly full board
  const nearlyFullBoard: CellState[][] = Array(ROWS)
    .fill(null)
    .map(() => Array(COLUMNS).fill(null));

  // Fill most of the board with alternating colors
  for (let col = 0; col < COLUMNS; col++) {
    const height = col === 3 ? 4 : 5; // Leave column 3 with one space
    for (let row = ROWS - 1; row > ROWS - 1 - height; row--) {
      nearlyFullBoard[row][col] = (row + col) % 2 === 0 ? 'red' : 'yellow';
    }
  }

  const nearlyFullState = createGameState(nearlyFullBoard);
  const nearlyFullSVG = renderDataToSVG(
    renderBoard(nearlyFullState),
    'Connect Four - Nearly Full Board'
  );
  fs.writeFileSync(path.join(outputDir, '07-nearly-full-board.svg'), nearlyFullSVG);
  console.log('✓ Generated: 07-nearly-full-board.svg');

  console.log(`\n✅ All SVG examples generated in: ${outputDir}`);
}

// Run the script
generateExamples();
