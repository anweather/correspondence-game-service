# Yahtzee SVG Layout Redesign Specification

## Overview
The current Yahtzee SVG renderer needs to be redesigned with a more traditional Yahtzee scorecard layout:
- **Top Section**: Dice tray with 5 dice and keep indicators
- **Bottom Section**: Grid-based scorecard with categories as rows and players as columns

## Current Issues
- Scorecards are displayed side-by-side, taking up too much horizontal space
- Layout doesn't scale well for multiple players
- Not intuitive for Yahtzee players who expect a traditional scorecard format

## New Layout Design

### Overall Structure
```
┌─────────────────────────────────────────────────────────────┐
│ Game Info: Current Player | Roll X of 3 | Phase Info       │
├─────────────────────────────────────────────────────────────┤
│ Dice Tray: [🎲] [🎲] [🎲] [🎲] [🎲]                        │
│            Keep indicators shown as green borders           │
├─────────────────────────────────────────────────────────────┤
│ Scorecard Grid:                                             │
│ ┌─────────────────┬─────────┬─────────┬─────────┬─────────┐ │
│ │ Category        │ Player1 │ Player2 │ Player3 │ Player4 │ │
│ ├─────────────────┼─────────┼─────────┼─────────┼─────────┤ │
│ │ Ones            │   3     │   1     │   -     │   4     │ │
│ │ Twos            │   6     │   -     │   8     │   -     │ │
│ │ ...             │  ...    │  ...    │  ...    │  ...    │ │
│ └─────────────────┴─────────┴─────────┴─────────┴─────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Layout Constants
```typescript
// Layout dimensions
const DICE_TRAY_HEIGHT = 100;
const DICE_SIZE = 60;
const DICE_SPACING = 80;
const DICE_TRAY_Y = 60;

const SCORECARD_START_Y = 180;
const ROW_HEIGHT = 25;
const CATEGORY_COLUMN_WIDTH = 180;
const PLAYER_COLUMN_WIDTH = 80;
const GRID_PADDING = 20;

// Colors
const GRID_BORDER_COLOR = '#333333';
const HEADER_BG_COLOR = '#f0f0f0';
const CURRENT_PLAYER_BG_COLOR = '#e3f2fd';
const FILLED_CELL_BG_COLOR = '#ffffff';
const AVAILABLE_CELL_BG_COLOR = '#f9f9f9';
```

### 2. Dice Tray Section (Top)
- **Position**: Centered horizontally, Y = 60-160
- **Layout**: 5 dice in a horizontal row
- **Dice Rendering**: Same as current (white squares with dots)
- **Keep Indicators**: Green borders around kept dice
- **Spacing**: 80px between dice centers

### 3. Scorecard Grid Section (Bottom)
- **Position**: Y starts at 180
- **Structure**: HTML table-like grid using SVG rectangles and text
- **Dimensions**: 
  - Category column: 180px wide
  - Player columns: 80px wide each
  - Row height: 25px

### 4. Grid Structure

#### Header Row
```
┌─────────────────┬─────────┬─────────┬─────────┐
│ Category        │ Player1 │ Player2 │ Player3 │
└─────────────────┴─────────┴─────────┴─────────┘
```

#### Category Rows (13 total)
```
Upper Section:
├─ Ones
├─ Twos  
├─ Threes
├─ Fours
├─ Fives
├─ Sixes
├─ Upper Total
├─ Bonus (63+)
├─ Upper + Bonus
│
Lower Section:
├─ Three of a Kind
├─ Four of a Kind
├─ Full House
├─ Small Straight
├─ Large Straight
├─ Yahtzee
├─ Chance
├─ Lower Total
└─ GRAND TOTAL
```

### 5. Visual Styling

#### Grid Lines
- All cell borders: 1px solid #333333
- Header row: Bold border bottom (2px)
- Section separators: Bold border (2px) after "Upper + Bonus" and "Lower Total"

#### Text Styling
- Category names: 12px, left-aligned, padding 5px
- Player names (header): 12px, bold, centered
- Scores: 12px, centered in cells
- Available categories: Normal weight
- Filled categories: Bold weight
- Totals: Bold weight, slightly larger (13px)

#### Background Colors
- Header row: Light gray (#f0f0f0)
- Current player column: Light blue (#e3f2fd)
- Filled cells: White (#ffffff)
- Available cells: Very light gray (#f9f9f9)

### 6. Current Player Indication
- **Column highlighting**: Current player's entire column has light blue background
- **Header emphasis**: Current player's name in header is bold with blue text color
- **No border**: Remove the current border-based indication

### 7. ViewBox Calculations
```typescript
const viewBoxWidth = GRID_PADDING * 2 + CATEGORY_COLUMN_WIDTH + (playerCount * PLAYER_COLUMN_WIDTH);
const viewBoxHeight = DICE_TRAY_Y + DICE_TRAY_HEIGHT + 20 + (SCORECARD_ROWS * ROW_HEIGHT) + GRID_PADDING;
```

### 8. Implementation Functions to Update

#### Core Functions
```typescript
// Update these existing functions:
function createDiceLayer(diceState: DiceState): RenderElement[]
function createScorecardLayer(scorecards: Map<string, Scorecard>, currentPlayerId: string): RenderElement[]
function createGameInfoLayer(...): RenderElement[]

// Add new functions:
function createScorecardGrid(scorecards: Map<string, Scorecard>, currentPlayerId: string): RenderElement[]
function createGridCell(x: number, y: number, width: number, height: number, content: string, isHeader: boolean, isCurrentPlayer: boolean, isFilled: boolean): RenderElement[]
function createGridBorders(x: number, y: number, width: number, height: number, rows: number, cols: number): RenderElement[]
```

#### Grid Creation Logic
```typescript
function createScorecardGrid(scorecards: Map<string, Scorecard>, currentPlayerId: string): RenderElement[] {
  const elements: RenderElement[] = [];
  const players = Array.from(scorecards.keys());
  const gridWidth = CATEGORY_COLUMN_WIDTH + (players.length * PLAYER_COLUMN_WIDTH);
  const gridHeight = SCORECARD_ROWS * ROW_HEIGHT;
  
  // 1. Create grid background
  // 2. Create header row (Category | Player1 | Player2 | ...)
  // 3. Create category rows with scores
  // 4. Create grid lines
  // 5. Apply current player highlighting
  
  return elements;
}
```

### 9. Category Order
```typescript
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
  { category: null, label: 'GRAND TOTAL', section: 'grand-total' }
];
```

### 10. Files to Modify
1. **games/yahtzee/engine/renderer.ts** - Main implementation
2. **games/yahtzee/engine/__tests__/renderer.test.ts** - Update tests for new layout
3. **games/yahtzee/engine/__tests__/renderer.property.test.ts** - Update property tests
4. **games/yahtzee/scripts/generate-svg-examples.ts** - Regenerate examples

### 11. Testing Considerations
- Update unit tests to expect grid structure instead of side-by-side scorecards
- Verify current player highlighting works with column-based approach
- Test multi-player scaling (1-8 players)
- Ensure dice tray positioning is consistent
- Validate grid cell content and styling

### 12. Backward Compatibility
- All existing tests should pass with layout changes
- SVG structure changes but semantic content remains the same
- Property tests should continue to validate correctness

## Benefits of New Layout
1. **More compact**: Better use of vertical space
2. **Traditional**: Matches standard Yahtzee scorecard format
3. **Scalable**: Works well for 1-8 players
4. **Readable**: Clear grid structure with proper alignment
5. **Professional**: Clean, table-like appearance

## Implementation Priority
1. Update `createScorecardGrid()` function
2. Modify `createDiceLayer()` for top positioning
3. Update `renderBoard()` to use new layout
4. Fix failing tests
5. Regenerate SVG examples
6. Update documentation