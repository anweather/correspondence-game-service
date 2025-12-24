import { GameState, GameLifecycle, Board } from '@domain/models';
import { renderBoard, renderDie, createScorecardGrid } from '../renderer';
import { YahtzeeMetadata, YahtzeeCategory, Scorecard, DiceState } from '../../shared/types';
import { DICE_COUNT, MAX_ROLLS_PER_TURN } from '../../shared/constants';
import { RenderLayer } from '@domain/interfaces';

// Helper function to create a test game state
function createTestGameState(
  metadata: Partial<YahtzeeMetadata> = {},
  lifecycle: GameLifecycle = GameLifecycle.ACTIVE,
  currentPlayerIndex: number = 0
): GameState<YahtzeeMetadata> {
  const domainBoard: Board = {
    spaces: [],
    metadata: {},
  };

  const defaultScorecard: Scorecard = {
    playerId: 'player1',
    categories: new Map(),
    upperSectionTotal: 0,
    upperSectionBonus: 0,
    lowerSectionTotal: 0,
    grandTotal: 0,
  };

  const defaultDiceState: DiceState = {
    values: [1, 2, 3, 4, 5],
    keptDice: [false, false, false, false, false],
  };

  const defaultMetadata: YahtzeeMetadata = {
    scorecards: new Map([['player1', defaultScorecard]]),
    currentDice: defaultDiceState,
    rollCount: 1,
    gamePhase: 'rolling',
    rollHistory: [],
    randomSeed: 'test-seed',
    ...metadata,
  };

  return {
    gameId: 'test-game',
    gameType: 'yahtzee',
    lifecycle,
    players: [
      { id: 'player1', name: 'Player 1', joinedAt: new Date() },
      { id: 'player2', name: 'Player 2', joinedAt: new Date() },
    ],
    currentPlayerIndex,
    phase: 'playing',
    board: domainBoard,
    moveHistory: [],
    metadata: defaultMetadata,
    winner: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Helper function to create a scorecard with some filled categories
function createPartialScorecard(playerId: string): Scorecard {
  const scorecard: Scorecard = {
    playerId,
    categories: new Map([
      [YahtzeeCategory.ONES, 3],
      [YahtzeeCategory.TWOS, null],
      [YahtzeeCategory.THREES, 9],
      [YahtzeeCategory.FULL_HOUSE, 25],
      [YahtzeeCategory.YAHTZEE, null],
    ]),
    upperSectionTotal: 12,
    upperSectionBonus: 0,
    lowerSectionTotal: 25,
    grandTotal: 37,
  };
  return scorecard;
}

describe('Yahtzee Renderer', () => {
  describe('SVG Structure Tests', () => {
    test('should produce valid SVG structure with correct viewBox', () => {
      const gameState = createTestGameState();
      const renderData = renderBoard(gameState);

      // Check viewBox dimensions
      expect(renderData.viewBox).toBeDefined();
      expect(renderData.viewBox.width).toBeGreaterThan(0);
      expect(renderData.viewBox.height).toBeGreaterThan(0);

      // Check that layers exist
      expect(renderData.layers).toBeDefined();
      expect(Array.isArray(renderData.layers)).toBe(true);
      expect(renderData.layers.length).toBeGreaterThan(0);

      // Check background color
      expect(renderData.backgroundColor).toBeDefined();
      expect(typeof renderData.backgroundColor).toBe('string');
    });

    test('should include all required layers', () => {
      const gameState = createTestGameState();
      const renderData = renderBoard(gameState);

      const layerNames = renderData.layers.map((layer: RenderLayer) => layer.name);

      // Should have dice, scorecard, and game info layers
      expect(layerNames).toContain('dice');
      expect(layerNames).toContain('scorecards');
      expect(layerNames).toContain('game-info');
    });

    test('should have proper layer z-index ordering', () => {
      const gameState = createTestGameState();
      const renderData = renderBoard(gameState);

      // Check that layers have z-index values
      renderData.layers.forEach((layer: RenderLayer) => {
        expect(layer.zIndex).toBeDefined();
        expect(typeof layer.zIndex).toBe('number');
      });

      // Dice layer should be on top (highest z-index)
      const diceLayer = renderData.layers.find((layer: RenderLayer) => layer.name === 'dice');
      const scorecardLayer = renderData.layers.find(
        (layer: RenderLayer) => layer.name === 'scorecards'
      );

      expect(diceLayer?.zIndex).toBeGreaterThan(scorecardLayer?.zIndex || 0);
    });
  });

  describe('Dice Rendering Tests', () => {
    test('should render 5 dice with correct values', () => {
      const diceState: DiceState = {
        values: [1, 3, 5, 2, 6],
        keptDice: [false, false, false, false, false],
      };

      const gameState = createTestGameState({ currentDice: diceState });
      const renderData = renderBoard(gameState);

      const diceLayer = renderData.layers.find((layer: RenderLayer) => layer.name === 'dice');
      expect(diceLayer).toBeDefined();
      expect(diceLayer?.elements).toBeDefined();
      expect(diceLayer?.elements.length).toBeGreaterThan(0);

      // Should have elements for 5 dice
      const diceElements = diceLayer?.elements.filter(
        (el: any) => el.attributes?.class?.includes('die') || el.type === 'g'
      );
      expect(diceElements?.length).toBeGreaterThanOrEqual(DICE_COUNT);
    });

    test('should render dice with keep indicators when dice are kept', () => {
      const diceState: DiceState = {
        values: [4, 4, 2, 4, 1],
        keptDice: [true, true, false, true, false],
      };

      const gameState = createTestGameState({ currentDice: diceState });
      const renderData = renderBoard(gameState);

      const diceLayer = renderData.layers.find((layer: RenderLayer) => layer.name === 'dice');
      expect(diceLayer).toBeDefined();

      // Should have visual indicators for kept dice
      const keepIndicators = diceLayer?.elements.filter(
        (el: any) =>
          el.attributes?.class?.includes('keep-indicator') ||
          el.attributes?.stroke === '#2ecc71' || // Green keep indicator
          el.attributes?.fill === '#2ecc71'
      );
      expect(keepIndicators?.length).toBeGreaterThan(0);
    });

    test('should render individual die with correct face value', () => {
      const dieElement = renderDie(3, 100, 50, false);

      expect(dieElement).toBeDefined();
      expect(Array.isArray(dieElement)).toBe(true);
      expect(dieElement.length).toBeGreaterThan(0);

      // Should have a rectangle for the die face
      const dieRect = dieElement.find((el: any) => el.type === 'rect');
      expect(dieRect).toBeDefined();

      // Should have dots for the face value (3 dots for value 3)
      const dots = dieElement.filter((el: any) => el.type === 'circle');
      expect(dots.length).toBe(3);
    });

    test('should render die with keep indicator when kept', () => {
      const dieElement = renderDie(6, 100, 50, true);

      expect(dieElement).toBeDefined();
      expect(Array.isArray(dieElement)).toBe(true);

      // Should have a keep indicator (border or highlight)
      const keepIndicator = dieElement.find(
        (el: any) => el.attributes?.stroke === '#2ecc71' || el.attributes?.class?.includes('keep')
      );
      expect(keepIndicator).toBeDefined();
    });

    test('should not render keep indicator when die is not kept', () => {
      const dieElement = renderDie(2, 100, 50, false);

      expect(dieElement).toBeDefined();

      // Should not have green keep indicator
      const keepIndicator = dieElement.find((el: any) => el.attributes?.stroke === '#2ecc71');
      expect(keepIndicator).toBeUndefined();
    });
  });

  describe('Scorecard Rendering Tests', () => {
    test('should render scorecard grid with all categories', () => {
      const scorecard1 = createPartialScorecard('player1');
      const scorecard2 = createPartialScorecard('player2');
      const scorecards = new Map([
        ['player1', scorecard1],
        ['player2', scorecard2],
      ]);

      const gridElements = createScorecardGrid(scorecards, 'player1');

      expect(gridElements).toBeDefined();
      expect(Array.isArray(gridElements)).toBe(true);
      expect(gridElements.length).toBeGreaterThan(0);

      // Should have text elements for category names and scores
      const textElements = gridElements.filter((el: any) => el.type === 'text');
      expect(textElements.length).toBeGreaterThanOrEqual(19); // Header + 19 category rows
    });

    test('should render filled categories with scores in grid', () => {
      const scorecard = createPartialScorecard('player1');
      const scorecards = new Map([['player1', scorecard]]);
      const gridElements = createScorecardGrid(scorecards, 'player1');

      // Should have score values displayed
      const scoreTexts = gridElements.filter(
        (el: any) =>
          el.type === 'text' &&
          (el.textContent === '3' || el.textContent === '9' || el.textContent === '25')
      );
      expect(scoreTexts.length).toBeGreaterThan(0);
    });

    test('should render grid cells with proper backgrounds', () => {
      const scorecard = createPartialScorecard('player1');
      const scorecards = new Map([['player1', scorecard]]);
      const gridElements = createScorecardGrid(scorecards, 'player1');

      // Should have rectangle elements for cell backgrounds
      const rectElements = gridElements.filter((el: any) => el.type === 'rect');
      expect(rectElements.length).toBeGreaterThan(0);

      // Should have different background colors
      const headerCells = rectElements.filter(
        (el: any) => el.attributes?.fill === '#f0f0f0' // Header background
      );
      const currentPlayerCells = rectElements.filter(
        (el: any) => el.attributes?.fill === '#e3f2fd' // Current player background
      );

      expect(headerCells.length).toBeGreaterThan(0);
      expect(currentPlayerCells.length).toBeGreaterThan(0);
    });

    test('should render upper and lower section totals', () => {
      const scorecard = createPartialScorecard('player1');
      scorecard.upperSectionTotal = 65;
      scorecard.upperSectionBonus = 35;
      scorecard.lowerSectionTotal = 125;
      scorecard.grandTotal = 225;

      const scorecards = new Map([['player1', scorecard]]);
      const gridElements = createScorecardGrid(scorecards, 'player1');

      // Should display totals
      const totalTexts = gridElements.filter(
        (el: any) =>
          el.type === 'text' &&
          (el.textContent === '65' ||
            el.textContent === '35' ||
            el.textContent === '125' ||
            el.textContent === '225')
      );
      expect(totalTexts.length).toBeGreaterThan(0);
    });

    test('should render grand total prominently', () => {
      const scorecard = createPartialScorecard('player1');
      const scorecards = new Map([['player1', scorecard]]);
      const gridElements = createScorecardGrid(scorecards, 'player1');

      // Should display grand total
      const grandTotalText = gridElements.find(
        (el: any) => el.type === 'text' && el.textContent === '37'
      );
      expect(grandTotalText).toBeDefined();
    });
  });

  describe('Current Player Indication Tests', () => {
    test('should render current player column highlighting', () => {
      const gameState = createTestGameState({}, GameLifecycle.ACTIVE, 0);
      const renderData = renderBoard(gameState);

      const scorecardLayer = renderData.layers.find(
        (layer: RenderLayer) => layer.name === 'scorecards'
      );
      expect(scorecardLayer).toBeDefined();

      // Should have current player column highlighting (blue background cells)
      const currentPlayerCells = scorecardLayer?.elements.filter(
        (el: any) => el.type === 'rect' && el.attributes?.fill === '#e3f2fd'
      );
      expect(currentPlayerCells?.length).toBeGreaterThan(0);
    });

    test('should highlight current player header cell', () => {
      const scorecard1 = createPartialScorecard('player1');
      const scorecard2 = createPartialScorecard('player2');
      const scorecards = new Map([
        ['player1', scorecard1],
        ['player2', scorecard2],
      ]);

      const gridElements = createScorecardGrid(scorecards, 'player1');

      // Should have current player header highlighting (any blue background cell in header area)
      const currentPlayerHeaders = gridElements.filter(
        (el: any) => el.type === 'rect' && el.attributes?.fill === '#e3f2fd'
      );
      expect(currentPlayerHeaders.length).toBeGreaterThan(0);
    });

    test('should not highlight non-current player columns', () => {
      const scorecard1 = createPartialScorecard('player1');
      const scorecard2 = createPartialScorecard('player2');
      const scorecards = new Map([
        ['player1', scorecard1],
        ['player2', scorecard2],
      ]);

      const gridElements = createScorecardGrid(scorecards, 'player1');

      // Count current player cells vs non-current player cells
      const currentPlayerCells = gridElements.filter(
        (el: any) => el.type === 'rect' && el.attributes?.fill === '#e3f2fd'
      );
      const nonCurrentPlayerCells = gridElements.filter(
        (el: any) =>
          el.type === 'rect' &&
          (el.attributes?.fill === '#f9f9f9' || el.attributes?.fill === '#ffffff')
      );

      expect(currentPlayerCells.length).toBeGreaterThan(0);
      expect(nonCurrentPlayerCells.length).toBeGreaterThan(0);
      expect(currentPlayerCells.length).toBeLessThan(nonCurrentPlayerCells.length);
    });
  });

  describe('Game Phase Information Tests', () => {
    test('should render rolling phase information', () => {
      const gameState = createTestGameState({
        gamePhase: 'rolling',
        rollCount: 2,
      });
      const renderData = renderBoard(gameState);

      const gameInfoLayer = renderData.layers.find(
        (layer: RenderLayer) => layer.name === 'game-info'
      );
      expect(gameInfoLayer).toBeDefined();
      expect(gameInfoLayer?.elements.length).toBeGreaterThan(0);

      // Should display roll count information
      const rollInfo = gameInfoLayer?.elements.find(
        (el: any) =>
          el.type === 'text' && (el.textContent?.includes('Roll') || el.textContent?.includes('2'))
      );
      expect(rollInfo).toBeDefined();
    });

    test('should render scoring phase information', () => {
      const gameState = createTestGameState({
        gamePhase: 'scoring',
        rollCount: MAX_ROLLS_PER_TURN,
      });
      const renderData = renderBoard(gameState);

      const gameInfoLayer = renderData.layers.find(
        (layer: RenderLayer) => layer.name === 'game-info'
      );
      expect(gameInfoLayer).toBeDefined();

      // Should display scoring phase information
      const scoringInfo = gameInfoLayer?.elements.find(
        (el: any) =>
          el.type === 'text' &&
          (el.textContent?.includes('Choose') || el.textContent?.includes('Score'))
      );
      expect(scoringInfo).toBeDefined();
    });

    test('should render available actions information', () => {
      const gameState = createTestGameState({
        gamePhase: 'rolling',
        rollCount: 1,
      });
      const renderData = renderBoard(gameState);

      const gameInfoLayer = renderData.layers.find(
        (layer: RenderLayer) => layer.name === 'game-info'
      );
      expect(gameInfoLayer).toBeDefined();

      // Should display available actions
      const actionInfo = gameInfoLayer?.elements.find(
        (el: any) =>
          el.type === 'text' &&
          (el.textContent?.includes('Keep') || el.textContent?.includes('Roll'))
      );
      expect(actionInfo).toBeDefined();
    });
  });

  describe('Multi-Player Rendering Tests', () => {
    test('should render multiple player columns in grid', () => {
      const scorecard1 = createPartialScorecard('player1');
      const scorecard2 = createPartialScorecard('player2');

      const gameState = createTestGameState({
        scorecards: new Map([
          ['player1', scorecard1],
          ['player2', scorecard2],
        ]),
      });

      const renderData = renderBoard(gameState);
      const scorecardLayer = renderData.layers.find(
        (layer: RenderLayer) => layer.name === 'scorecards'
      );

      expect(scorecardLayer).toBeDefined();
      expect(scorecardLayer?.elements.length).toBeGreaterThan(0);

      // Should have player name elements in header row
      const playerNameElements = scorecardLayer?.elements.filter(
        (el: any) =>
          el.type === 'text' && (el.textContent === 'player1' || el.textContent === 'player2')
      );
      expect(playerNameElements?.length).toBe(2);
    });

    test('should scale grid width for multiple players', () => {
      const scorecard1 = createPartialScorecard('player1');
      const scorecard2 = createPartialScorecard('player2');
      const scorecard3 = createPartialScorecard('player3');

      const gameState = createTestGameState({
        scorecards: new Map([
          ['player1', scorecard1],
          ['player2', scorecard2],
          ['player3', scorecard3],
        ]),
      });

      const renderData = renderBoard(gameState);

      // Check that viewBox is large enough for 3 players
      // Grid width = 180 (category) + 3 * 80 (players) = 420
      // Dice width = 4 * 80 + 60 = 380
      // Min content width = max(420, 380) = 420
      // ViewBox width = 20 (padding) * 2 + 420 = 460
      expect(renderData.viewBox.width).toBe(460);
    });

    test('should position player columns correctly', () => {
      const scorecard1 = createPartialScorecard('player1');
      const scorecard2 = createPartialScorecard('player2');

      const scorecards = new Map([
        ['player1', scorecard1],
        ['player2', scorecard2],
      ]);

      const gridElements = createScorecardGrid(scorecards, 'player1');

      // Find header cells for both players (should be positioned correctly relative to each other)
      const headerCells = gridElements.filter(
        (el: any) => el.type === 'rect' && el.attributes?.y === 180 // Header row Y position
      );

      // Should have 3 header cells: Category + Player1 + Player2
      expect(headerCells.length).toBe(3);

      // Verify they are positioned in order (increasing X values)
      const xPositions = headerCells
        .map((el: any) => el.attributes.x)
        .sort((a: number, b: number) => a - b);
      expect(xPositions[0]).toBeLessThan(xPositions[1]);
      expect(xPositions[1]).toBeLessThan(xPositions[2]);
    });
  });

  describe('Game Completion Rendering Tests', () => {
    test('should render completed game with winner indication', () => {
      const gameState = createTestGameState({}, GameLifecycle.COMPLETED);
      gameState.winner = 'player1';

      const renderData = renderBoard(gameState);

      const gameInfoLayer = renderData.layers.find(
        (layer: RenderLayer) => layer.name === 'game-info'
      );
      expect(gameInfoLayer).toBeDefined();

      // Should display winner information
      const winnerInfo = gameInfoLayer?.elements.find(
        (el: any) =>
          el.type === 'text' &&
          (el.textContent?.includes('Winner') || el.textContent?.includes('player1'))
      );
      expect(winnerInfo).toBeDefined();
    });

    test('should render final scores in grid when game is complete', () => {
      const scorecard1 = createPartialScorecard('player1');
      scorecard1.grandTotal = 245;

      const gameState = createTestGameState(
        {
          scorecards: new Map([['player1', scorecard1]]),
        },
        GameLifecycle.COMPLETED
      );

      const renderData = renderBoard(gameState);
      const scorecardLayer = renderData.layers.find(
        (layer: RenderLayer) => layer.name === 'scorecards'
      );

      expect(scorecardLayer).toBeDefined();

      // Should have final score display in grid
      const finalScore = scorecardLayer?.elements.find(
        (el: any) => el.type === 'text' && el.textContent === '245'
      );
      expect(finalScore).toBeDefined();
    });
  });
});
