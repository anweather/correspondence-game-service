# Yahtzee SVG Rendering Examples

This directory contains SVG examples demonstrating the rendering capabilities of the Yahtzee plugin for the Async Boardgame Service.

## Generated Examples

1. **01-new-game-first-roll.svg** - A fresh game showing the initial dice roll
2. **02-mid-turn-kept-dice.svg** - Mid-turn with kept dice and partial scorecard
3. **03-yahtzee-roll-scoring.svg** - Scoring phase with a Yahtzee roll (five 6s)
4. **04-two-player-game.svg** - Two-player game showing both scorecards
5. **05-completed-game-winner.svg** - Finished game with winner announcement
6. **06-four-player-game.svg** - Four-player game demonstrating layout scaling

## Viewing the Examples

### Option 1: HTML Viewer
Open `index.html` in your web browser to see all examples with descriptions:
```bash
open docs/yahtzee-examples/index.html
```

### Option 2: Individual SVG Files
Open any SVG file directly in a web browser:
```bash
open docs/yahtzee-examples/01-new-game-first-roll.svg
```

### Option 3: Command Line
Use any SVG viewer or image viewer that supports SVG format.

## Regenerating Examples

To regenerate the SVG examples (e.g., after modifying the renderer):

```bash
npx ts-node -r tsconfig-paths/register games/yahtzee/scripts/generate-svg-examples.ts
```

## Features Demonstrated

### Dice Rendering
- Accurate dot patterns for values 1-6
- Visual keep indicators (green borders)
- Proper spacing and layout

### Scorecard Display
- All 13 Yahtzee categories
- Visual distinction between filled and available categories
- Upper section totals and bonus calculation
- Lower section scoring
- Grand total calculation

### Multi-Player Support
- Automatic layout scaling for 1-8 players
- Current player indication with blue border
- Side-by-side scorecard arrangement

### Game State Information
- Current player and turn information
- Roll count (1-3 per turn)
- Game phase (rolling vs. scoring)
- Available actions guidance
- Winner announcement for completed games

### Technical Details
- Layered SVG rendering (game-info, scorecards, dice)
- Proper z-index ordering
- Scalable viewBox dimensions
- Clean, semantic SVG structure
- Web browser compatible

## Integration

These examples demonstrate the output of the `renderBoard()` function in the Yahtzee engine, which returns `BoardRenderData` that can be converted to SVG for display in web applications or other contexts requiring visual game state representation.