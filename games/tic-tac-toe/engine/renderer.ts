import { GameState } from '@domain/models';
import { BoardRenderData, RenderElement } from '@domain/interfaces';
import { BOARD_SIZE } from '../shared/constants';

/**
 * Constants for rendering
 */
const CELL_SIZE = 100;
const LINE_WIDTH = 2;
const TOKEN_PADDING = 20;
const TOKEN_STROKE_WIDTH = 8;

/**
 * Create the grid layer with borders and dividers
 */
export function createGridLayer(): RenderElement[] {
  const boardSize = BOARD_SIZE * CELL_SIZE;
  const gridElements: RenderElement[] = [];

  // Vertical lines
  for (let i = 1; i < BOARD_SIZE; i++) {
    gridElements.push({
      type: 'path',
      attributes: {
        d: `M ${i * CELL_SIZE} 0 L ${i * CELL_SIZE} ${boardSize}`,
        stroke: '#333333',
        strokeWidth: LINE_WIDTH,
      },
    });
  }

  // Horizontal lines
  for (let i = 1; i < BOARD_SIZE; i++) {
    gridElements.push({
      type: 'path',
      attributes: {
        d: `M 0 ${i * CELL_SIZE} L ${boardSize} ${i * CELL_SIZE}`,
        stroke: '#333333',
        strokeWidth: LINE_WIDTH,
      },
    });
  }

  // Border
  gridElements.push({
    type: 'rect',
    attributes: {
      x: 0,
      y: 0,
      width: boardSize,
      height: boardSize,
      fill: 'none',
      stroke: '#333333',
      strokeWidth: LINE_WIDTH * 2,
    },
  });

  return gridElements;
}

/**
 * Render an X token at the specified center position
 */
export function renderXToken(centerX: number, centerY: number): RenderElement[] {
  const elements: RenderElement[] = [];

  // Draw X as two diagonal lines
  elements.push({
    type: 'path',
    attributes: {
      d: `M ${centerX - CELL_SIZE / 2 + TOKEN_PADDING} ${centerY - CELL_SIZE / 2 + TOKEN_PADDING} L ${centerX + CELL_SIZE / 2 - TOKEN_PADDING} ${centerY + CELL_SIZE / 2 - TOKEN_PADDING}`,
      stroke: '#e74c3c',
      strokeWidth: TOKEN_STROKE_WIDTH,
      strokeLinecap: 'round',
    },
  });
  elements.push({
    type: 'path',
    attributes: {
      d: `M ${centerX + CELL_SIZE / 2 - TOKEN_PADDING} ${centerY - CELL_SIZE / 2 + TOKEN_PADDING} L ${centerX - CELL_SIZE / 2 + TOKEN_PADDING} ${centerY + CELL_SIZE / 2 - TOKEN_PADDING}`,
      stroke: '#e74c3c',
      strokeWidth: TOKEN_STROKE_WIDTH,
      strokeLinecap: 'round',
    },
  });

  return elements;
}

/**
 * Render an O token at the specified center position
 */
export function renderOToken(centerX: number, centerY: number): RenderElement[] {
  return [
    {
      type: 'circle',
      attributes: {
        cx: centerX,
        cy: centerY,
        r: CELL_SIZE / 2 - TOKEN_PADDING,
        fill: 'none',
        stroke: '#3498db',
        strokeWidth: TOKEN_STROKE_WIDTH,
      },
    },
  ];
}

/**
 * Create the token layer with X and O symbols
 */
export function createTokenLayer(state: GameState): RenderElement[] {
  const tokenElements: RenderElement[] = [];

  state.board.spaces.forEach((space) => {
    if (space.tokens.length > 0) {
      const token = space.tokens[0];
      const centerX = space.position.x * CELL_SIZE + CELL_SIZE / 2;
      const centerY = space.position.y * CELL_SIZE + CELL_SIZE / 2;

      if (token.type === 'X') {
        tokenElements.push(...renderXToken(centerX, centerY));
      } else if (token.type === 'O') {
        tokenElements.push(...renderOToken(centerX, centerY));
      }
    }
  });

  return tokenElements;
}

/**
 * Render the game board to BoardRenderData format
 */
export function renderBoard(state: GameState): BoardRenderData {
  const boardSize = BOARD_SIZE * CELL_SIZE;

  // Map spaces to render data
  const spaces = state.board.spaces.map((space) => ({
    id: space.id,
    position: { x: space.position.x, y: space.position.y },
    tokens: space.tokens.map((token) => ({
      id: token.id,
      type: token.type,
      ownerId: token.ownerId,
    })),
  }));

  return {
    viewBox: { width: boardSize, height: boardSize },
    backgroundColor: '#ffffff',
    spaces,
    layers: [
      {
        name: 'grid',
        zIndex: 1,
        elements: createGridLayer(),
      },
      {
        name: 'tokens',
        zIndex: 2,
        elements: createTokenLayer(state),
      },
    ],
  };
}
