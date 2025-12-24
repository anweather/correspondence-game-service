/**
 * Yahtzee Renderer Module
 *
 * Generates SVG representation of game state including dice and scorecards.
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { GameState, GameLifecycle } from '@domain/models';
import { BoardRenderData, RenderElement, RenderLayer } from '@domain/interfaces';
import { YahtzeeMetadata, Scorecard, DiceState, YahtzeeCategory } from '../shared/types';
import { MAX_ROLLS_PER_TURN } from '../shared/constants';

/**
 * Category order for the scorecard grid
 */
const SCORECARD_CATEGORIES = [
  // Upper Section
  { category: YahtzeeCategory.ONES, label: 'Ones', section: 'upper' },
  { category: YahtzeeCategory.TWOS, label: 'Twos', section: 'upper' },
  { category: YahtzeeCategory.THREES, label: 'Threes', section: 'upper' },
  { category: YahtzeeCategory.FOURS, label: 'Fours', section: 'upper' },
  { category: YahtzeeCategory.FIVES, label: 'Fives', section: 'upper' },
  { category: YahtzeeCategory.SIXES, label: 'Sixes', section: 'upper' },
  { category: null, label: 'Upper Total', section: 'upper-total' },
  { category: null, label: 'Bonus (63+)', section: 'upper-bonus' },
  { category: null, label: 'Upper + Bonus', section: 'upper-final' },

  // Lower Section
  { category: YahtzeeCategory.THREE_OF_A_KIND, label: 'Three of a Kind', section: 'lower' },
  { category: YahtzeeCategory.FOUR_OF_A_KIND, label: 'Four of a Kind', section: 'lower' },
  { category: YahtzeeCategory.FULL_HOUSE, label: 'Full House', section: 'lower' },
  { category: YahtzeeCategory.SMALL_STRAIGHT, label: 'Small Straight', section: 'lower' },
  { category: YahtzeeCategory.LARGE_STRAIGHT, label: 'Large Straight', section: 'lower' },
  { category: YahtzeeCategory.YAHTZEE, label: 'Yahtzee', section: 'lower' },
  { category: YahtzeeCategory.CHANCE, label: 'Chance', section: 'lower' },
  { category: null, label: 'Lower Total', section: 'lower-total' },
  { category: null, label: 'GRAND TOTAL', section: 'grand-total' },
];

const SCORECARD_ROWS = SCORECARD_CATEGORIES.length;

/**
 * Layout constants for the new grid-based design
 */
// Dice tray (top section)
const DICE_TRAY_HEIGHT = 100;
const DICE_SIZE = 60;
const DIE_SIZE = DICE_SIZE; // Alias for backward compatibility
const DICE_SPACING = 80;
const DICE_TRAY_Y = 60;

// Scorecard grid (bottom section)
const SCORECARD_START_Y = 180;
const ROW_HEIGHT = 25;
const CATEGORY_COLUMN_WIDTH = 180;
const PLAYER_COLUMN_WIDTH = 80;
const GRID_PADDING = 20;

// Game info
const GAME_INFO_Y = 20;

// Colors
const GRID_BORDER_COLOR = '#333333';
const HEADER_BG_COLOR = '#f0f0f0';
const CURRENT_PLAYER_BG_COLOR = '#e3f2fd';
const FILLED_CELL_BG_COLOR = '#ffffff';
const AVAILABLE_CELL_BG_COLOR = '#f9f9f9';
const KEEP_INDICATOR_COLOR = '#2ecc71';

/**
 * Render a single die with dots representing the face value
 * Requirements: 4.1
 */
export function renderDie(value: number, x: number, y: number, isKept: boolean): RenderElement[] {
  const elements: RenderElement[] = [];

  // Die background rectangle
  elements.push({
    type: 'rect',
    attributes: {
      x: x - DIE_SIZE / 2,
      y: y - DIE_SIZE / 2,
      width: DIE_SIZE,
      height: DIE_SIZE,
      fill: '#ffffff',
      stroke: isKept ? KEEP_INDICATOR_COLOR : '#333333',
      strokeWidth: isKept ? 4 : 2,
      rx: 8,
      class: 'die',
    },
  });

  // Add dots based on die value
  const dotPositions = getDotPositions(value);
  dotPositions.forEach((pos) => {
    elements.push({
      type: 'circle',
      attributes: {
        cx: x + pos.x,
        cy: y + pos.y,
        r: 4,
        fill: '#333333',
      },
    });
  });

  // Keep indicator border if kept
  if (isKept) {
    elements.push({
      type: 'rect',
      attributes: {
        x: x - DIE_SIZE / 2 - 3,
        y: y - DIE_SIZE / 2 - 3,
        width: DIE_SIZE + 6,
        height: DIE_SIZE + 6,
        fill: 'none',
        stroke: KEEP_INDICATOR_COLOR,
        strokeWidth: 3,
        rx: 10,
        class: 'keep-indicator',
      },
    });
  }

  return elements;
}

/**
 * Get dot positions for a die face value
 */
function getDotPositions(value: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  const offset = 12;

  switch (value) {
    case 1:
      positions.push({ x: 0, y: 0 });
      break;
    case 2:
      positions.push({ x: -offset, y: -offset });
      positions.push({ x: offset, y: offset });
      break;
    case 3:
      positions.push({ x: -offset, y: -offset });
      positions.push({ x: 0, y: 0 });
      positions.push({ x: offset, y: offset });
      break;
    case 4:
      positions.push({ x: -offset, y: -offset });
      positions.push({ x: offset, y: -offset });
      positions.push({ x: -offset, y: offset });
      positions.push({ x: offset, y: offset });
      break;
    case 5:
      positions.push({ x: -offset, y: -offset });
      positions.push({ x: offset, y: -offset });
      positions.push({ x: 0, y: 0 });
      positions.push({ x: -offset, y: offset });
      positions.push({ x: offset, y: offset });
      break;
    case 6:
      positions.push({ x: -offset, y: -offset });
      positions.push({ x: 0, y: -offset });
      positions.push({ x: offset, y: -offset });
      positions.push({ x: -offset, y: offset });
      positions.push({ x: 0, y: offset });
      positions.push({ x: offset, y: offset });
      break;
  }

  return positions;
}

/**
 * Create the dice layer with all 5 dice and keep indicators
 * Requirements: 4.1
 */
export function createDiceLayer(diceState: DiceState, viewBoxWidth: number): RenderElement[] {
  const elements: RenderElement[] = [];

  // Center the dice horizontally in the entire viewBox width
  const startX = viewBoxWidth / 2;

  for (let i = 0; i < diceState.values.length; i++) {
    const x = startX + (i - 2) * DICE_SPACING; // Center around middle die
    const y = DICE_TRAY_Y + DICE_TRAY_HEIGHT / 2;
    const value = diceState.values[i];
    const isKept = diceState.keptDice[i];

    elements.push(...renderDie(value, x, y, isKept));
  }

  return elements;
}

/**
 * Create a grid cell with background, border, and text content
 */
function createGridCell(
  x: number,
  y: number,
  width: number,
  height: number,
  content: string,
  isHeader: boolean,
  isCurrentPlayer: boolean,
  isFilled: boolean
): RenderElement[] {
  const elements: RenderElement[] = [];

  // Cell background
  let bgColor = AVAILABLE_CELL_BG_COLOR;
  if (isHeader) {
    bgColor = HEADER_BG_COLOR;
  } else if (isCurrentPlayer) {
    bgColor = CURRENT_PLAYER_BG_COLOR;
  } else if (isFilled) {
    bgColor = FILLED_CELL_BG_COLOR;
  }

  elements.push({
    type: 'rect',
    attributes: {
      x,
      y,
      width,
      height,
      fill: bgColor,
      stroke: GRID_BORDER_COLOR,
      strokeWidth: 1,
    },
  });

  // Cell text
  const textX = x + width / 2;
  const textY = y + height / 2 + 4; // Offset for vertical centering
  const fontSize = isHeader ? '12' : '12';
  const fontWeight = isHeader || isFilled ? 'bold' : 'normal';

  elements.push({
    type: 'text',
    attributes: {
      x: textX,
      y: textY,
      fontSize,
      fontWeight,
      fill: '#333333',
      textAnchor: 'middle',
      dominantBaseline: 'middle',
    },
    textContent: content,
  });

  return elements;
}

/**
 * Create the scorecard grid with categories as rows and players as columns
 * Requirements: 4.2, 4.3, 4.4
 */
export function createScorecardGrid(
  scorecards: Map<string, Scorecard>,
  currentPlayerId: string
): RenderElement[] {
  const elements: RenderElement[] = [];
  const players = Array.from(scorecards.keys());
  const gridWidth = CATEGORY_COLUMN_WIDTH + players.length * PLAYER_COLUMN_WIDTH;

  // Calculate dice tray width for centering
  const diceWidth = 4 * DICE_SPACING + DICE_SIZE;
  const minContentWidth = Math.max(gridWidth, diceWidth);

  // Center the grid horizontally if it's narrower than the dice tray
  const gridStartX = GRID_PADDING + (minContentWidth - gridWidth) / 2;

  // Header row
  let currentY = SCORECARD_START_Y;

  // Category header cell
  elements.push(
    ...createGridCell(
      gridStartX,
      currentY,
      CATEGORY_COLUMN_WIDTH,
      ROW_HEIGHT,
      'Category',
      true,
      false,
      false
    )
  );

  // Player header cells
  players.forEach((playerId, index) => {
    const x = gridStartX + CATEGORY_COLUMN_WIDTH + index * PLAYER_COLUMN_WIDTH;
    const isCurrentPlayer = playerId === currentPlayerId;

    elements.push(
      ...createGridCell(
        x,
        currentY,
        PLAYER_COLUMN_WIDTH,
        ROW_HEIGHT,
        playerId,
        true,
        isCurrentPlayer,
        false
      )
    );
  });

  currentY += ROW_HEIGHT;

  // Category rows
  SCORECARD_CATEGORIES.forEach((categoryInfo) => {
    // Category name cell
    elements.push(
      ...createGridCell(
        gridStartX,
        currentY,
        CATEGORY_COLUMN_WIDTH,
        ROW_HEIGHT,
        categoryInfo.label,
        false,
        false,
        false
      )
    );

    // Player score cells
    players.forEach((playerId, playerIndex) => {
      const x = gridStartX + CATEGORY_COLUMN_WIDTH + playerIndex * PLAYER_COLUMN_WIDTH;
      const scorecard = scorecards.get(playerId)!;
      const isCurrentPlayer = playerId === currentPlayerId;

      let content = '-';
      let isFilled = false;

      if (categoryInfo.category) {
        // Regular scoring category
        const score = scorecard.categories.get(categoryInfo.category);
        if (score !== null && score !== undefined) {
          content = score.toString();
          isFilled = true;
        }
      } else {
        // Calculated totals
        switch (categoryInfo.section) {
          case 'upper-total':
            content = scorecard.upperSectionTotal.toString();
            isFilled = true;
            break;
          case 'upper-bonus':
            content = scorecard.upperSectionBonus.toString();
            isFilled = true;
            break;
          case 'upper-final':
            content = (scorecard.upperSectionTotal + scorecard.upperSectionBonus).toString();
            isFilled = true;
            break;
          case 'lower-total':
            content = scorecard.lowerSectionTotal.toString();
            isFilled = true;
            break;
          case 'grand-total':
            content = scorecard.grandTotal.toString();
            isFilled = true;
            break;
        }
      }

      elements.push(
        ...createGridCell(
          x,
          currentY,
          PLAYER_COLUMN_WIDTH,
          ROW_HEIGHT,
          content,
          false,
          isCurrentPlayer,
          isFilled
        )
      );
    });

    currentY += ROW_HEIGHT;

    // Add section separators with thicker borders
    if (categoryInfo.section === 'upper-final' || categoryInfo.section === 'lower-total') {
      // Add a thicker border line after these rows using a thin rectangle
      elements.push({
        type: 'rect',
        attributes: {
          x: gridStartX,
          y: currentY - 1,
          width: gridWidth,
          height: 2,
          fill: GRID_BORDER_COLOR,
          stroke: 'none',
        },
      });
    }
  });

  return elements;
}

/**
 * Create the scorecard layer with grid-based layout
 * Requirements: 4.2, 4.3
 */
export function createScorecardLayer(
  scorecards: Map<string, Scorecard>,
  currentPlayerId: string
): RenderElement[] {
  return createScorecardGrid(scorecards, currentPlayerId);
}

/**
 * Create the game info layer with phase and action information
 * Requirements: 4.5
 */
export function createGameInfoLayer(
  gamePhase: 'rolling' | 'scoring',
  rollCount: number,
  currentPlayerId: string,
  lifecycle: GameLifecycle,
  winner?: string | null
): RenderElement[] {
  const elements: RenderElement[] = [];

  if (lifecycle === GameLifecycle.COMPLETED && winner) {
    // Game completed - show winner
    elements.push({
      type: 'text',
      attributes: {
        x: GRID_PADDING,
        y: GAME_INFO_Y,
        fontSize: '18',
        fontWeight: 'bold',
        fill: '#2ecc71',
      },
      textContent: `Game Complete! Winner: ${winner}`,
    });
  } else {
    // Game in progress - show current phase info
    let phaseText = '';
    let actionText = '';

    if (gamePhase === 'rolling') {
      phaseText = `Roll ${rollCount} of ${MAX_ROLLS_PER_TURN}`;
      if (rollCount < MAX_ROLLS_PER_TURN) {
        actionText = 'Keep dice and roll again, or choose a category to score';
      } else {
        actionText = 'Choose a category to score';
      }
    } else {
      phaseText = 'Scoring Phase';
      actionText = 'Choose a category to score your dice';
    }

    elements.push({
      type: 'text',
      attributes: {
        x: GRID_PADDING,
        y: GAME_INFO_Y,
        fontSize: '14',
        fontWeight: 'bold',
        fill: '#333333',
      },
      textContent: `Current Player: ${currentPlayerId} | ${phaseText}`,
    });

    elements.push({
      type: 'text',
      attributes: {
        x: GRID_PADDING,
        y: GAME_INFO_Y + 20,
        fontSize: '12',
        fill: '#666666',
      },
      textContent: actionText,
    });
  }

  return elements;
}

/**
 * Render the current game state as SVG data
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export function renderBoard(state: GameState<YahtzeeMetadata>): BoardRenderData {
  const metadata = state.metadata;
  const currentPlayerId = state.players[state.currentPlayerIndex].id;

  // Calculate viewBox dimensions based on number of players and grid layout
  const playerCount = metadata.scorecards.size;
  const gridWidth = CATEGORY_COLUMN_WIDTH + playerCount * PLAYER_COLUMN_WIDTH;

  // Calculate dice tray width (5 dice with spacing)
  const diceWidth = 4 * DICE_SPACING + DICE_SIZE; // 4 gaps + 1 die width = ~380px

  // Ensure minimum width accommodates both dice tray and grid
  const minContentWidth = Math.max(gridWidth, diceWidth);
  const viewBoxWidth = GRID_PADDING * 2 + minContentWidth;
  const viewBoxHeight =
    DICE_TRAY_Y + DICE_TRAY_HEIGHT + 20 + SCORECARD_ROWS * ROW_HEIGHT + GRID_PADDING * 2;

  const layers: RenderLayer[] = [];

  // Game info layer (lowest z-index)
  layers.push({
    name: 'game-info',
    zIndex: 1,
    elements: createGameInfoLayer(
      metadata.gamePhase,
      metadata.rollCount,
      currentPlayerId,
      state.lifecycle,
      state.winner
    ),
  });

  // Scorecard layer
  layers.push({
    name: 'scorecards',
    zIndex: 2,
    elements: createScorecardLayer(metadata.scorecards, currentPlayerId),
  });

  // Dice layer (highest z-index)
  layers.push({
    name: 'dice',
    zIndex: 3,
    elements: createDiceLayer(metadata.currentDice, viewBoxWidth),
  });

  return {
    viewBox: { width: viewBoxWidth, height: viewBoxHeight },
    backgroundColor: '#f8f9fa',
    spaces: [], // Yahtzee doesn't use the spaces model
    layers,
  };
}
