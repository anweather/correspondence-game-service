/**
 * Property-based tests for Yahtzee renderer module
 * These tests verify universal properties that should hold across all inputs
 */

import * as fc from 'fast-check';
import { renderBoard } from '../renderer';
import { GameState, GameLifecycle, Board } from '@domain/models';
import { YahtzeeMetadata, Scorecard, DiceState } from '../../shared/types';
import { ALL_CATEGORIES, DICE_COUNT } from '../../shared/constants';
import { RenderLayer } from '@domain/interfaces';

describe('Yahtzee Renderer - Property-Based Tests', () => {
  describe('Property 9: Rendering Completeness', () => {
    /**
     * **Feature: yahtzee-plugin, Property 9: Rendering completeness**
     * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
     *
     * Property: For any game state, the SVG rendering should include current dice values
     * with keep indicators, all player scorecards with filled/available categories,
     * current player indication, and appropriate game phase information
     *
     * This property ensures that:
     * 1. All required layers are present (dice, scorecards, game-info)
     * 2. Dice layer contains elements for all 5 dice
     * 3. Keep indicators are present when dice are kept
     * 4. Scorecard layer contains elements for all players
     * 5. Current player indication is present
     * 6. Game phase information is displayed
     * 7. ViewBox dimensions are appropriate for content
     */
    it('should render complete SVG structure for any valid game state', async () => {
      await fc.assert(
        fc.property(
          // Generate arbitrary game state parameters
          fc.record({
            playerCount: fc.integer({ min: 1, max: 8 }),
            currentPlayerIndex: fc.integer({ min: 0, max: 7 }),
            diceValues: fc.array(fc.integer({ min: 1, max: 6 }), { minLength: 5, maxLength: 5 }),
            keptDice: fc.array(fc.boolean(), { minLength: 5, maxLength: 5 }),
            rollCount: fc.integer({ min: 1, max: 3 }),
            gamePhase: fc.constantFrom('rolling', 'scoring'),
            lifecycle: fc.constantFrom(GameLifecycle.ACTIVE, GameLifecycle.COMPLETED),
            filledCategoryCount: fc.integer({ min: 0, max: 13 }),
          }),
          (testData) => {
            // Ensure currentPlayerIndex is valid for playerCount
            const validCurrentPlayerIndex = testData.currentPlayerIndex % testData.playerCount;

            // Create test game state
            const gameState = createTestGameState(
              testData.playerCount,
              validCurrentPlayerIndex,
              testData.diceValues,
              testData.keptDice,
              testData.rollCount,
              testData.gamePhase,
              testData.lifecycle,
              testData.filledCategoryCount
            );

            const renderData = renderBoard(gameState);

            // Property 1: Valid SVG structure
            expect(renderData.viewBox).toBeDefined();
            expect(renderData.viewBox.width).toBeGreaterThan(0);
            expect(renderData.viewBox.height).toBeGreaterThan(0);
            expect(renderData.backgroundColor).toBeDefined();
            expect(typeof renderData.backgroundColor).toBe('string');

            // Property 2: All required layers are present
            expect(renderData.layers).toBeDefined();
            expect(Array.isArray(renderData.layers)).toBe(true);
            expect(renderData.layers.length).toBeGreaterThanOrEqual(3);

            const layerNames = renderData.layers.map((layer: RenderLayer) => layer.name);
            expect(layerNames).toContain('dice');
            expect(layerNames).toContain('scorecards');
            expect(layerNames).toContain('game-info');

            // Property 3: Dice layer completeness
            const diceLayer = renderData.layers.find((layer: RenderLayer) => layer.name === 'dice');
            expect(diceLayer).toBeDefined();
            expect(diceLayer?.elements).toBeDefined();
            expect(Array.isArray(diceLayer?.elements)).toBe(true);
            expect(diceLayer?.elements.length).toBeGreaterThan(0);

            // Should have elements for all 5 dice (at least 5 elements, could be more with keep indicators)
            const diceElements = diceLayer?.elements.filter(
              (el: any) => el.type === 'rect' && el.attributes?.class === 'die'
            );
            expect(diceElements?.length).toBe(DICE_COUNT);

            // Property 4: Keep indicators when dice are kept
            const keptDiceCount = testData.keptDice.filter((kept) => kept).length;
            if (keptDiceCount > 0) {
              const keepIndicators = diceLayer?.elements.filter(
                (el: any) =>
                  el.attributes?.class === 'keep-indicator' ||
                  (el.attributes?.stroke === '#2ecc71' && el.attributes?.strokeWidth === '3')
              );
              expect(keepIndicators?.length).toBe(keptDiceCount);
            }

            // Property 5: Scorecard layer completeness
            const scorecardLayer = renderData.layers.find(
              (layer: RenderLayer) => layer.name === 'scorecards'
            );
            expect(scorecardLayer).toBeDefined();
            expect(scorecardLayer?.elements).toBeDefined();
            expect(Array.isArray(scorecardLayer?.elements)).toBe(true);
            expect(scorecardLayer?.elements.length).toBeGreaterThan(0);

            // Should have player name elements for all players (in grid header)
            const playerNameElements = scorecardLayer?.elements.filter(
              (el: any) =>
                el.type === 'text' &&
                el.textContent &&
                el.textContent.startsWith('player') && // Player IDs start with 'player'
                el.textContent !== 'Category' // Exclude the category header
            );
            expect(playerNameElements?.length).toBe(testData.playerCount);

            // Property 6: Current player indication (blue background cells)
            const currentPlayerIndicators = scorecardLayer?.elements.filter(
              (el: any) => el.type === 'rect' && el.attributes?.fill === '#e3f2fd'
            );
            expect(currentPlayerIndicators?.length).toBeGreaterThanOrEqual(1);

            // Property 7: Game info layer completeness
            const gameInfoLayer = renderData.layers.find(
              (layer: RenderLayer) => layer.name === 'game-info'
            );
            expect(gameInfoLayer).toBeDefined();
            expect(gameInfoLayer?.elements).toBeDefined();
            expect(Array.isArray(gameInfoLayer?.elements)).toBe(true);
            expect(gameInfoLayer?.elements.length).toBeGreaterThan(0);

            // Should have game phase information
            const gameInfoTexts = gameInfoLayer?.elements.filter((el: any) => el.type === 'text');
            expect(gameInfoTexts?.length).toBeGreaterThan(0);

            if (testData.lifecycle === GameLifecycle.COMPLETED) {
              // Should show winner information
              const winnerInfo = gameInfoTexts?.find(
                (el: any) =>
                  el.textContent?.includes('Winner') || el.textContent?.includes('Complete')
              );
              expect(winnerInfo).toBeDefined();
            } else {
              // Should show current player and phase information
              const phaseInfo = gameInfoTexts?.find(
                (el: any) =>
                  el.textContent?.includes('Current Player') ||
                  el.textContent?.includes('Roll') ||
                  el.textContent?.includes('Scoring')
              );
              expect(phaseInfo).toBeDefined();
            }

            // Property 8: Layer z-index ordering
            renderData.layers.forEach((layer: RenderLayer) => {
              expect(layer.zIndex).toBeDefined();
              expect(typeof layer.zIndex).toBe('number');
              expect(layer.zIndex).toBeGreaterThan(0);
            });

            // Property 9: ViewBox scales with player count (new grid layout with minimum width)
            // Grid width = CATEGORY_COLUMN_WIDTH (180) + playerCount * PLAYER_COLUMN_WIDTH (80)
            // Dice width = 4 * DICE_SPACING (80) + DICE_SIZE (60) = 380
            // Minimum content width = max(gridWidth, diceWidth)
            // ViewBox width = GRID_PADDING * 2 (40) + minContentWidth
            const gridWidth = 180 + testData.playerCount * 80;
            const diceWidth = 4 * 80 + 60; // 380
            const minContentWidth = Math.max(gridWidth, diceWidth);
            const expectedMinWidth = 40 + minContentWidth;
            expect(renderData.viewBox.width).toBeGreaterThanOrEqual(expectedMinWidth);
            expect(renderData.viewBox.height).toBeGreaterThan(300); // Minimum height for new layout

            // Property 10: All text elements have content
            const allTextElements = renderData.layers.flatMap((layer) =>
              layer.elements.filter((el: any) => el.type === 'text')
            );
            allTextElements.forEach((textEl: any) => {
              expect(textEl.textContent).toBeDefined();
              expect(typeof textEl.textContent).toBe('string');
              expect(textEl.textContent.length).toBeGreaterThan(0);
            });

            // Property 11: All elements have required attributes
            const allElements = renderData.layers.flatMap((layer) => layer.elements);
            allElements.forEach((element: any) => {
              expect(element.type).toBeDefined();
              expect(element.attributes).toBeDefined();
              expect(typeof element.attributes).toBe('object');

              // Type-specific attribute validation
              if (element.type === 'rect') {
                expect(element.attributes.x).toBeDefined();
                expect(element.attributes.y).toBeDefined();
                expect(element.attributes.width).toBeDefined();
                expect(element.attributes.height).toBeDefined();
              } else if (element.type === 'circle') {
                expect(element.attributes.cx).toBeDefined();
                expect(element.attributes.cy).toBeDefined();
                expect(element.attributes.r).toBeDefined();
              } else if (element.type === 'text') {
                expect(element.attributes.x).toBeDefined();
                expect(element.attributes.y).toBeDefined();
                expect(element.textContent).toBeDefined();
              }
            });
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    });

    /**
     * Property: Rendering should be deterministic for identical game states
     * This ensures that the same game state always produces the same rendering
     */
    it('should produce identical renderings for identical game states', async () => {
      await fc.assert(
        fc.property(
          fc.record({
            playerCount: fc.integer({ min: 1, max: 4 }), // Smaller range for performance
            diceValues: fc.array(fc.integer({ min: 1, max: 6 }), { minLength: 5, maxLength: 5 }),
            keptDice: fc.array(fc.boolean(), { minLength: 5, maxLength: 5 }),
            rollCount: fc.integer({ min: 1, max: 3 }),
            gamePhase: fc.constantFrom('rolling', 'scoring'),
          }),
          (testData) => {
            // Create identical game states
            const gameState1 = createTestGameState(
              testData.playerCount,
              0, // Fixed current player
              testData.diceValues,
              testData.keptDice,
              testData.rollCount,
              testData.gamePhase,
              GameLifecycle.ACTIVE,
              5 // Fixed filled category count
            );

            const gameState2 = createTestGameState(
              testData.playerCount,
              0, // Same current player
              testData.diceValues,
              testData.keptDice,
              testData.rollCount,
              testData.gamePhase,
              GameLifecycle.ACTIVE,
              5 // Same filled category count
            );

            const renderData1 = renderBoard(gameState1);
            const renderData2 = renderBoard(gameState2);

            // Property: Identical states should produce identical renderings
            expect(renderData1.viewBox).toEqual(renderData2.viewBox);
            expect(renderData1.backgroundColor).toBe(renderData2.backgroundColor);
            expect(renderData1.layers.length).toBe(renderData2.layers.length);

            // Compare layer structure
            for (let i = 0; i < renderData1.layers.length; i++) {
              const layer1 = renderData1.layers[i];
              const layer2 = renderData2.layers[i];

              expect(layer1.name).toBe(layer2.name);
              expect(layer1.zIndex).toBe(layer2.zIndex);
              expect(layer1.elements.length).toBe(layer2.elements.length);
            }
          }
        ),
        { numRuns: 50 } // Fewer runs for performance since this is more expensive
      );
    });

    /**
     * Property: Rendering should handle edge cases gracefully
     * This ensures proper behavior with boundary values and unusual states
     */
    it('should handle edge cases gracefully', async () => {
      await fc.assert(
        fc.property(
          fc.record({
            playerCount: fc.constantFrom(1, 8), // Test boundary values
            allDiceSame: fc.boolean(),
            allDiceKept: fc.boolean(),
            noCategoriesFilled: fc.boolean(),
            allCategoriesFilled: fc.boolean(),
          }),
          (testData) => {
            // Create edge case game state
            const diceValues = testData.allDiceSame ? [6, 6, 6, 6, 6] : [1, 2, 3, 4, 5];
            const keptDice = testData.allDiceKept
              ? [true, true, true, true, true]
              : [false, false, false, false, false];
            const filledCategoryCount = testData.noCategoriesFilled
              ? 0
              : testData.allCategoriesFilled
                ? 13
                : 7;

            const gameState = createTestGameState(
              testData.playerCount,
              0,
              diceValues,
              keptDice,
              1,
              'rolling',
              GameLifecycle.ACTIVE,
              filledCategoryCount
            );

            const renderData = renderBoard(gameState);

            // Property: Edge cases should still produce valid renderings
            expect(renderData.viewBox.width).toBeGreaterThan(0);
            expect(renderData.viewBox.height).toBeGreaterThan(0);
            expect(renderData.layers.length).toBeGreaterThanOrEqual(3);

            // Property: All layers should have elements
            renderData.layers.forEach((layer: RenderLayer) => {
              expect(layer.elements).toBeDefined();
              expect(Array.isArray(layer.elements)).toBe(true);
              expect(layer.elements.length).toBeGreaterThan(0);
            });

            // Property: Dice should always be rendered
            const diceLayer = renderData.layers.find((layer: RenderLayer) => layer.name === 'dice');
            expect(diceLayer).toBeDefined();
            const diceElements = diceLayer?.elements.filter(
              (el: any) => el.type === 'rect' && el.attributes?.class === 'die'
            );
            expect(diceElements?.length).toBe(5);

            // Property: Players should always be rendered
            const scorecardLayer = renderData.layers.find(
              (layer: RenderLayer) => layer.name === 'scorecards'
            );
            expect(scorecardLayer).toBeDefined();
            const playerElements = scorecardLayer?.elements.filter(
              (el: any) =>
                el.type === 'text' &&
                el.textContent &&
                el.textContent.startsWith('player') && // Player IDs start with 'player'
                el.textContent !== 'Category' // Exclude the category header
            );
            expect(playerElements?.length).toBe(testData.playerCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

// Helper function to create test game states
function createTestGameState(
  playerCount: number,
  currentPlayerIndex: number,
  diceValues: number[],
  keptDice: boolean[],
  rollCount: number,
  gamePhase: 'rolling' | 'scoring',
  lifecycle: GameLifecycle,
  filledCategoryCount: number
): GameState<YahtzeeMetadata> {
  const domainBoard: Board = {
    spaces: [],
    metadata: {},
  };

  // Create players
  const players = Array.from({ length: playerCount }, (_, i) => ({
    id: `player${i + 1}`,
    name: `Player ${i + 1}`,
    joinedAt: new Date(),
  }));

  // Create scorecards for all players
  const scorecards = new Map<string, Scorecard>();
  players.forEach((player) => {
    const scorecard: Scorecard = {
      playerId: player.id,
      categories: new Map(),
      upperSectionTotal: 0,
      upperSectionBonus: 0,
      lowerSectionTotal: 0,
      grandTotal: 0,
    };

    // Fill some categories based on filledCategoryCount
    const categoriesToFill = ALL_CATEGORIES.slice(0, filledCategoryCount);
    categoriesToFill.forEach((category, catIndex) => {
      const score = (catIndex + 1) * 5; // Arbitrary score
      scorecard.categories.set(category, score);

      if (catIndex < 6) {
        // Upper section
        scorecard.upperSectionTotal += score;
      } else {
        // Lower section
        scorecard.lowerSectionTotal += score;
      }
    });

    // Calculate bonus
    if (scorecard.upperSectionTotal >= 63) {
      scorecard.upperSectionBonus = 35;
    }

    scorecard.grandTotal =
      scorecard.upperSectionTotal + scorecard.upperSectionBonus + scorecard.lowerSectionTotal;
    scorecards.set(player.id, scorecard);
  });

  const diceState: DiceState = {
    values: diceValues,
    keptDice: keptDice,
  };

  const metadata: YahtzeeMetadata = {
    scorecards,
    currentDice: diceState,
    rollCount,
    gamePhase,
    rollHistory: [],
    randomSeed: 'test-seed',
  };

  return {
    gameId: 'test-game',
    gameType: 'yahtzee',
    lifecycle,
    players,
    currentPlayerIndex: Math.min(currentPlayerIndex, playerCount - 1),
    phase: 'playing',
    board: domainBoard,
    moveHistory: [],
    metadata,
    winner: lifecycle === GameLifecycle.COMPLETED ? players[0].id : null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
