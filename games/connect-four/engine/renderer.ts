/**
 * Connect Four rendering module
 * Handles SVG board rendering with discs and win highlighting
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import { GameState, GameLifecycle } from '../../../src/domain/models';
import { BoardRenderData, RenderElement, RenderLayer } from '../../../src/domain/interfaces';
import { ROWS, COLUMNS } from '../shared/constants';
import { CellState, ConnectFourMetadata, Position } from '../shared/types';
import { checkWinFromPosition } from './rules';

/**
 * Constants for rendering
 */
const CELL_SIZE = 80;
const DISC_RADIUS = 30;
const GRID_LINE_WIDTH = 2;
const GRID_COLOR = '#0066cc';
const BOARD_COLOR = '#0066cc';
const EMPTY_CELL_COLOR = 'white';
const RED_COLOR = '#e74c3c';
const YELLOW_COLOR = '#f1c40f';
const HIGHLIGHT_STROKE_COLOR = '#2ecc71';
const HIGHLIGHT_STROKE_WIDTH = 4;

/**
 * Create the grid layer with board background and grid lines
 * Requirements: 7.1, 7.5
 */
export function createGridLayer(): RenderElement[] {
  const boardWidth = COLUMNS * CELL_SIZE;
  const boardHeight = ROWS * CELL_SIZE;
  const gridElements: RenderElement[] = [];

  // Board background
  gridElements.push({
    type: 'rect',
    attributes: {
      x: 0,
      y: 0,
      width: boardWidth,
      height: boardHeight,
      fill: BOARD_COLOR,
    },
  });

  // Vertical grid lines
  for (let col = 1; col < COLUMNS; col++) {
    gridElements.push({
      type: 'path',
      attributes: {
        d: `M ${col * CELL_SIZE} 0 L ${col * CELL_SIZE} ${boardHeight}`,
        stroke: GRID_COLOR,
        strokeWidth: GRID_LINE_WIDTH,
        opacity: 0.3,
      },
    });
  }

  // Horizontal grid lines
  for (let row = 1; row < ROWS; row++) {
    gridElements.push({
      type: 'path',
      attributes: {
        d: `M 0 ${row * CELL_SIZE} L ${boardWidth} ${row * CELL_SIZE}`,
        stroke: GRID_COLOR,
        strokeWidth: GRID_LINE_WIDTH,
        opacity: 0.3,
      },
    });
  }

  // Border
  gridElements.push({
    type: 'rect',
    attributes: {
      x: 0,
      y: 0,
      width: boardWidth,
      height: boardHeight,
      fill: 'none',
      stroke: GRID_COLOR,
      strokeWidth: GRID_LINE_WIDTH * 2,
    },
  });

  return gridElements;
}

/**
 * Render a single disc at the specified position
 * Requirements: 7.2, 7.3, 7.4
 */
export function renderDisc(row: number, col: number, color: CellState): RenderElement {
  const centerX = col * CELL_SIZE + CELL_SIZE / 2;
  const centerY = row * CELL_SIZE + CELL_SIZE / 2;

  let fillColor: string;
  if (color === 'red') {
    fillColor = RED_COLOR;
  } else if (color === 'yellow') {
    fillColor = YELLOW_COLOR;
  } else {
    fillColor = EMPTY_CELL_COLOR;
  }

  return {
    type: 'circle',
    attributes: {
      cx: centerX,
      cy: centerY,
      r: DISC_RADIUS,
      fill: fillColor,
      stroke: color === null ? '#cccccc' : 'none',
      strokeWidth: 1,
    },
  };
}

/**
 * Create the disc layer with all discs (empty, red, yellow)
 * Requirements: 7.2, 7.3, 7.4
 */
export function createDiscLayer(board: CellState[][]): RenderElement[] {
  const discElements: RenderElement[] = [];

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      const cellState = board[row][col];
      discElements.push(renderDisc(row, col, cellState));
    }
  }

  return discElements;
}

/**
 * Find consecutive positions in a given direction
 */
function findConsecutiveInDirection(
  board: CellState[][],
  startRow: number,
  startCol: number,
  color: CellState,
  dirRow: number,
  dirCol: number
): Position[] {
  const positions: Position[] = [];

  // Scan backwards first to find the start of the sequence
  let r = startRow;
  let c = startCol;
  while (r >= 0 && r < ROWS && c >= 0 && c < COLUMNS && board[r][c] === color) {
    r -= dirRow;
    c -= dirCol;
  }

  // Now scan forward from the start
  r += dirRow;
  c += dirCol;
  while (r >= 0 && r < ROWS && c >= 0 && c < COLUMNS && board[r][c] === color) {
    positions.push({ row: r, column: c });
    r += dirRow;
    c += dirCol;
  }

  return positions;
}

/**
 * Find the winning positions on the board
 * Requirements: 7.6
 */
function findWinningPositions(
  board: CellState[][],
  lastMove: { row: number; column: number; player: string }
): Position[] {
  const { row, column } = lastMove;
  const color = board[row][column];

  if (!color) {
    return [];
  }

  // Check if there's a win from the last move position
  if (!checkWinFromPosition(board, row, column, color)) {
    return [];
  }

  // Check all four directions to find the winning line
  const directions = [
    { row: 0, col: 1 }, // Horizontal
    { row: 1, col: 0 }, // Vertical
    { row: 1, col: 1 }, // Diagonal down
    { row: -1, col: 1 }, // Diagonal up
  ];

  for (const dir of directions) {
    const positions = findConsecutiveInDirection(
      board,
      row,
      column,
      color,
      dir.row,
      dir.col
    );

    // If we found 4 or more consecutive, return exactly 4
    if (positions.length >= 4) {
      return positions.slice(0, 4);
    }
  }

  return [];
}

/**
 * Create the win highlight layer
 * Requirements: 7.6
 */
export function createWinHighlight(
  board: CellState[][],
  lastMove?: { row: number; column: number; player: string }
): RenderElement[] {
  if (!lastMove) {
    return [];
  }

  const winningPositions = findWinningPositions(board, lastMove);

  if (winningPositions.length === 0) {
    return [];
  }

  const highlightElements: RenderElement[] = [];

  for (const pos of winningPositions) {
    const centerX = pos.column * CELL_SIZE + CELL_SIZE / 2;
    const centerY = pos.row * CELL_SIZE + CELL_SIZE / 2;

    highlightElements.push({
      type: 'circle',
      attributes: {
        cx: centerX,
        cy: centerY,
        r: DISC_RADIUS + 5,
        fill: 'none',
        stroke: HIGHLIGHT_STROKE_COLOR,
        strokeWidth: HIGHLIGHT_STROKE_WIDTH,
      },
    });
  }

  return highlightElements;
}

/**
 * Render the game board to BoardRenderData format
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */
export function renderBoard(state: GameState<ConnectFourMetadata>): BoardRenderData {
  const boardWidth = COLUMNS * CELL_SIZE;
  const boardHeight = ROWS * CELL_SIZE;

  const board = state.metadata.board;
  const layers: RenderLayer[] = [];

  // Grid layer (background and lines)
  layers.push({
    name: 'grid',
    zIndex: 1,
    elements: createGridLayer(),
  });

  // Disc layer (all discs)
  layers.push({
    name: 'discs',
    zIndex: 2,
    elements: createDiscLayer(board),
  });

  // Win highlight layer (only if game is completed with a winner)
  if (state.lifecycle === GameLifecycle.COMPLETED && state.metadata.lastMove) {
    const highlightElements = createWinHighlight(board, state.metadata.lastMove);
    if (highlightElements.length > 0) {
      layers.push({
        name: 'win-highlight',
        zIndex: 3,
        elements: highlightElements,
      });
    }
  }

  return {
    viewBox: { width: boardWidth, height: boardHeight },
    backgroundColor: '#ffffff',
    spaces: [], // Connect Four doesn't use the spaces model
    layers,
  };
}
