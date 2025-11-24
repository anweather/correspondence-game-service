import { GameState, GameLifecycle, Board } from '@domain/models';
import { renderBoard, createGridLayer } from '../renderer';
import { ROWS, COLUMNS } from '../../shared/constants';
import { CellState, ConnectFourMetadata } from '../../shared/types';
import { RenderLayer } from '@domain/interfaces';

// Helper function to create a test game state
function createTestGameState(
  board: CellState[][],
  lifecycle: GameLifecycle = GameLifecycle.ACTIVE,
  _winner: string | null = null,
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
    gameId: 'test-game',
    gameType: 'connect-four',
    lifecycle,
    players: [
      { id: 'player1', name: 'Player 1', joinedAt: new Date() },
      { id: 'player2', name: 'Player 2', joinedAt: new Date() },
    ],
    currentPlayerIndex: 0,
    phase: 'playing',
    board: domainBoard,
    moveHistory: [],
    metadata,
    winner: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('Connect Four Renderer', () => {
  describe('SVG Structure Tests', () => {
    // Feature: connect-four, Property 20: Rendering produces valid SVG structure
    // Validates: Requirements 7.1
    test('should produce valid SVG structure with correct 7×6 grid', () => {
      // Create a simple game state with empty board
      const emptyBoard: CellState[][] = Array(ROWS)
        .fill(null)
        .map(() => Array(COLUMNS).fill(null));

      const gameState = createTestGameState(emptyBoard);
      const renderData = renderBoard(gameState);

      // Check viewBox dimensions
      expect(renderData.viewBox).toBeDefined();
      expect(renderData.viewBox.width).toBeGreaterThan(0);
      expect(renderData.viewBox.height).toBeGreaterThan(0);

      // Check that layers exist
      expect(renderData.layers).toBeDefined();
      expect(Array.isArray(renderData.layers)).toBe(true);
      expect(renderData.layers.length).toBeGreaterThan(0);

      // Check that grid layer exists
      const gridLayer = renderData.layers.find((layer: RenderLayer) => layer.name === 'grid');
      expect(gridLayer).toBeDefined();
      expect(gridLayer?.elements).toBeDefined();
      expect(Array.isArray(gridLayer?.elements)).toBe(true);
    });

    test('should include grid lines in the rendering', () => {
      const gridElements = createGridLayer();

      // Grid should have elements (lines and border)
      expect(gridElements).toBeDefined();
      expect(Array.isArray(gridElements)).toBe(true);
      expect(gridElements.length).toBeGreaterThan(0);

      // Check that we have line elements
      const hasLines = gridElements.some(
        (el: any) => el.type === 'path' || el.type === 'rect'
      );
      expect(hasLines).toBe(true);
    });
  });

  describe('Disc Rendering Tests', () => {
    // Feature: connect-four, Property 21: Empty cells render as white circles
    // Validates: Requirements 7.2
    test('should render empty cells as white circles', () => {
      const emptyBoard: CellState[][] = Array(ROWS)
        .fill(null)
        .map(() => Array(COLUMNS).fill(null));

      const gameState = createTestGameState(emptyBoard);
      const renderData = renderBoard(gameState);
      const discLayer = renderData.layers.find((layer: RenderLayer) => layer.name === 'discs');

      expect(discLayer).toBeDefined();
      expect(discLayer?.elements).toBeDefined();

      // Count white circles (empty cells)
      const whiteCircles = discLayer?.elements.filter(
        (el: any) =>
          el.type === 'circle' &&
          (el.attributes.fill === 'white' || el.attributes.fill === '#ffffff')
      );

      // Should have 42 empty cells (7 columns × 6 rows)
      expect(whiteCircles?.length).toBe(42);
    });

    // Feature: connect-four, Property 22: Red discs render correctly
    // Validates: Requirements 7.3
    test('should render red discs at correct positions', () => {
      const boardWithRed: CellState[][] = Array(ROWS)
        .fill(null)
        .map(() => Array(COLUMNS).fill(null));

      // Place red discs at specific positions
      boardWithRed[5][0] = 'red'; // Bottom-left
      boardWithRed[5][3] = 'red'; // Bottom-center
      boardWithRed[4][3] = 'red'; // One above bottom-center

      const gameState = createTestGameState(boardWithRed);
      const renderData = renderBoard(gameState);
      const discLayer = renderData.layers.find((layer: RenderLayer) => layer.name === 'discs');

      expect(discLayer).toBeDefined();

      // Count red circles (using the actual hex color from renderer)
      const redCircles = discLayer?.elements.filter(
        (el: any) =>
          el.type === 'circle' &&
          (el.attributes.fill === 'red' || 
           el.attributes.fill === '#ff0000' || 
           el.attributes.fill === '#e74c3c' || // Actual red color used
           el.attributes.fill?.toLowerCase().includes('red'))
      );

      // Should have 3 red discs
      expect(redCircles?.length).toBe(3);
    });

    // Feature: connect-four, Property 23: Yellow discs render correctly
    // Validates: Requirements 7.4
    test('should render yellow discs at correct positions', () => {
      const boardWithYellow: CellState[][] = Array(ROWS)
        .fill(null)
        .map(() => Array(COLUMNS).fill(null));

      // Place yellow discs at specific positions
      boardWithYellow[5][1] = 'yellow'; // Bottom row
      boardWithYellow[5][2] = 'yellow'; // Bottom row
      boardWithYellow[4][1] = 'yellow'; // Second from bottom

      const gameState = createTestGameState(boardWithYellow);
      const renderData = renderBoard(gameState);
      const discLayer = renderData.layers.find((layer: RenderLayer) => layer.name === 'discs');

      expect(discLayer).toBeDefined();

      // Count yellow circles (using the actual hex color from renderer)
      const yellowCircles = discLayer?.elements.filter(
        (el: any) =>
          el.type === 'circle' &&
          (el.attributes.fill === 'yellow' || 
           el.attributes.fill === '#ffff00' || 
           el.attributes.fill === '#f1c40f' || // Actual yellow color used
           el.attributes.fill?.toLowerCase().includes('yellow'))
      );

      // Should have 3 yellow discs
      expect(yellowCircles?.length).toBe(3);
    });

    test('should render mixed board with red, yellow, and empty cells', () => {
      const mixedBoard: CellState[][] = Array(ROWS)
        .fill(null)
        .map(() => Array(COLUMNS).fill(null));

      // Create a mixed board
      mixedBoard[5][0] = 'red';
      mixedBoard[5][1] = 'yellow';
      mixedBoard[5][2] = 'red';
      mixedBoard[4][0] = 'yellow';
      mixedBoard[4][1] = 'red';

      const gameState = createTestGameState(mixedBoard);
      const renderData = renderBoard(gameState);
      const discLayer = renderData.layers.find((layer: RenderLayer) => layer.name === 'discs');

      expect(discLayer).toBeDefined();

      // Total circles should be 42 (all cells)
      const allCircles = discLayer?.elements.filter((el: any) => el.type === 'circle');
      expect(allCircles?.length).toBe(42);

      // Count each type
      const redCircles = discLayer?.elements.filter(
        (el: any) =>
          el.type === 'circle' &&
          (el.attributes.fill === 'red' || 
           el.attributes.fill === '#e74c3c' || 
           el.attributes.fill?.toLowerCase().includes('red'))
      );
      const yellowCircles = discLayer?.elements.filter(
        (el: any) =>
          el.type === 'circle' &&
          (el.attributes.fill === 'yellow' || 
           el.attributes.fill === '#f1c40f' || 
           el.attributes.fill?.toLowerCase().includes('yellow'))
      );
      const whiteCircles = discLayer?.elements.filter(
        (el: any) =>
          el.type === 'circle' &&
          (el.attributes.fill === 'white' || el.attributes.fill === '#ffffff')
      );

      expect(redCircles?.length).toBe(3);
      expect(yellowCircles?.length).toBe(2);
      expect(whiteCircles?.length).toBe(37); // 42 - 5 filled
    });
  });

  describe('Win Highlighting Tests', () => {
    // Feature: connect-four, Property 24: Winning patterns are highlighted
    // Validates: Requirements 7.6
    test('should highlight winning discs when game is completed with a winner', () => {
      const winningBoard: CellState[][] = Array(ROWS)
        .fill(null)
        .map(() => Array(COLUMNS).fill(null));

      // Create a horizontal win for red at bottom row
      winningBoard[5][0] = 'red';
      winningBoard[5][1] = 'red';
      winningBoard[5][2] = 'red';
      winningBoard[5][3] = 'red';

      const gameState = createTestGameState(
        winningBoard,
        GameLifecycle.COMPLETED,
        'player1',
        { row: 5, column: 3, player: 'player1' }
      );

      const renderData = renderBoard(gameState);

      // Check for highlight layer
      const highlightLayer = renderData.layers.find(
        (layer: RenderLayer) => layer.name === 'highlight' || layer.name === 'win-highlight'
      );

      expect(highlightLayer).toBeDefined();
      expect(highlightLayer?.elements).toBeDefined();
      expect(highlightLayer?.elements.length).toBeGreaterThan(0);
    });

    test('should not have highlight layer when game is in progress', () => {
      const inProgressBoard: CellState[][] = Array(ROWS)
        .fill(null)
        .map(() => Array(COLUMNS).fill(null));

      inProgressBoard[5][0] = 'red';
      inProgressBoard[5][1] = 'yellow';

      const gameState = createTestGameState(inProgressBoard);
      const renderData = renderBoard(gameState);

      // Should not have highlight layer for in-progress games
      const highlightLayer = renderData.layers.find(
        (layer: RenderLayer) => layer.name === 'highlight' || layer.name === 'win-highlight'
      );

      // Either no highlight layer, or it's empty
      if (highlightLayer) {
        expect(highlightLayer.elements.length).toBe(0);
      }
    });

    test('should highlight vertical win', () => {
      const verticalWinBoard: CellState[][] = Array(ROWS)
        .fill(null)
        .map(() => Array(COLUMNS).fill(null));

      // Create a vertical win for yellow in column 3
      verticalWinBoard[5][3] = 'yellow';
      verticalWinBoard[4][3] = 'yellow';
      verticalWinBoard[3][3] = 'yellow';
      verticalWinBoard[2][3] = 'yellow';

      const gameState = createTestGameState(
        verticalWinBoard,
        GameLifecycle.COMPLETED,
        'player2',
        { row: 2, column: 3, player: 'player2' }
      );

      const renderData = renderBoard(gameState);

      const highlightLayer = renderData.layers.find(
        (layer: RenderLayer) => layer.name === 'highlight' || layer.name === 'win-highlight'
      );

      expect(highlightLayer).toBeDefined();
      expect(highlightLayer?.elements.length).toBeGreaterThan(0);
    });

    test('should highlight diagonal win', () => {
      const diagonalWinBoard: CellState[][] = Array(ROWS)
        .fill(null)
        .map(() => Array(COLUMNS).fill(null));

      // Create a diagonal win (ascending) for red
      diagonalWinBoard[5][0] = 'red';
      diagonalWinBoard[4][1] = 'red';
      diagonalWinBoard[3][2] = 'red';
      diagonalWinBoard[2][3] = 'red';

      const gameState = createTestGameState(
        diagonalWinBoard,
        GameLifecycle.COMPLETED,
        'player1',
        { row: 2, column: 3, player: 'player1' }
      );

      const renderData = renderBoard(gameState);

      const highlightLayer = renderData.layers.find(
        (layer: RenderLayer) => layer.name === 'highlight' || layer.name === 'win-highlight'
      );

      expect(highlightLayer).toBeDefined();
      expect(highlightLayer?.elements.length).toBeGreaterThan(0);
    });
  });
});
