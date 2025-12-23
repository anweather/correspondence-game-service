# Yahtzee Plugin Design Document

## Overview

The Yahtzee plugin implements the classic dice-scoring game for the Async Boardgame Service. The design follows the established modular architecture pattern used by existing game plugins, with specialized modules for metadata, initialization, validation, rules, and rendering. The plugin supports 1-8 players in turn-based gameplay with comprehensive scorecard management and SVG-based visual representation.

## Architecture

The Yahtzee plugin follows the hexagonal architecture pattern established in the codebase:

```
games/yahtzee/
├── engine/
│   ├── YahtzeeEngine.ts          # Main engine facade
│   ├── metadata.ts               # Game metadata functions
│   ├── initialization.ts         # Game state initialization
│   ├── validation.ts             # Move validation logic
│   ├── rules.ts                  # Game rules and state transitions
│   ├── renderer.ts               # SVG rendering logic
│   └── scoring.ts                # Yahtzee scoring calculations
├── shared/
│   ├── types.ts                  # Yahtzee-specific type definitions
│   ├── constants.ts              # Game constants and configuration
│   └── index.ts                  # Shared exports
└── README.md                     # Game documentation

src/domain/game-utils/
└── DiceEngine.ts                 # Reusable dice generation utility (moved to core)
```

## Components and Interfaces

### YahtzeeEngine
The main engine class extends `BaseGameEngine` and acts as a facade, delegating to specialized modules:
- Implements all required `GameEnginePlugin` methods
- Manages game lifecycle and player turns
- Coordinates between dice rolling, scoring, and state management

### Specialized Modules

**Metadata Module** (`metadata.ts`)
- Provides game type identification and player limits
- Returns game description and configuration

**Initialization Module** (`initialization.ts`)
- Creates initial game state with empty scorecards
- Assigns player turn order
- Sets up initial dice and turn state

**Validation Module** (`validation.ts`)
- Validates dice roll moves (re-roll selections)
- Validates scoring moves (category selection)
- Ensures turn order and game state consistency

**Rules Module** (`rules.ts`)
- Applies dice roll moves with selective re-rolling
- Applies scoring moves with category completion
- Manages turn advancement and game completion
- Determines winner based on final scores

**Scoring Module** (`scoring.ts`)
- Calculates scores for all 13 Yahtzee categories
- Manages upper section bonus calculation
- Validates scoring combinations against dice values

**Renderer Module** (`renderer.ts`)
- Generates SVG representation of game state
- Renders dice with "keep" indicators
- Displays scorecards for all players with turn indicators
- Shows current game phase and available actions

### DiceEngine Utility (Core Domain)
A reusable component in `src/domain/game-utils/` for dice generation:
- Uses seeded random number generation for reproducibility
- Provides generic interface for N dice with M sides
- Stateless design - returns dice values without internal state
- Can be used by any dice-based games in the system

## Data Models

### YahtzeeMetadata
```typescript
interface YahtzeeMetadata {
  scorecards: Map<string, Scorecard>;
  currentDice: DiceState;
  rollCount: number;
  gamePhase: 'rolling' | 'scoring';
  rollHistory: DiceRoll[];
  randomSeed: string;
}
```

### Scorecard
```typescript
interface Scorecard {
  playerId: string;
  categories: Map<YahtzeeCategory, number | null>;
  upperSectionTotal: number;
  upperSectionBonus: number;
  lowerSectionTotal: number;
  grandTotal: number;
}
```

### DiceState
```typescript
interface DiceState {
  values: number[];
  keptDice: boolean[];
}
```

### YahtzeeMove
```typescript
interface YahtzeeMove extends Move {
  action: 'roll' | 'score';
  parameters: RollParameters | ScoreParameters;
}

interface RollParameters {
  keepDice: boolean[];
}

interface ScoreParameters {
  category: YahtzeeCategory;
}
```

### YahtzeeCategory
```typescript
enum YahtzeeCategory {
  ONES = 'ones',
  TWOS = 'twos',
  THREES = 'threes',
  FOURS = 'fours',
  FIVES = 'fives',
  SIXES = 'sixes',
  THREE_OF_A_KIND = 'three_of_a_kind',
  FOUR_OF_A_KIND = 'four_of_a_kind',
  FULL_HOUSE = 'full_house',
  SMALL_STRAIGHT = 'small_straight',
  LARGE_STRAIGHT = 'large_straight',
  YAHTZEE = 'yahtzee',
  CHANCE = 'chance'
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Game Initialization Completeness
*For any* valid player count (1-8), initializing a game should create a complete scorecard for each player with all 13 categories available and establish a valid turn order
**Validates: Requirements 1.2, 1.3**

### Property 2: Turn Management Consistency
*For any* game state, only the current player should be able to make valid moves, and completing a turn (rolling + scoring) should advance to the next player while maintaining roll limits
**Validates: Requirements 1.4, 2.4, 3.5**

### Property 3: Category Usage Uniqueness
*For any* player and category, once a category has been scored, it should remain unavailable for future scoring by that player and attempting to use it should be rejected
**Validates: Requirements 3.4**

### Property 4: Game Completion Detection
*For any* game state, when all players have filled all 13 categories, the game should be marked as complete with the highest scoring player declared as winner
**Validates: Requirements 1.5**

### Property 5: Dice Engine Behavior
*For any* dice engine with the same seed, generating dice should produce deterministic results with all values between 1-6 inclusive, and the engine should remain stateless across calls
**Validates: Requirements 5.1, 5.2, 5.4**

### Property 6: Dice Keep Selection Preservation
*For any* dice roll with keep selections, the kept dice values should remain unchanged in subsequent rolls while non-kept dice should be re-rolled using the seeded random generator
**Validates: Requirements 2.2, 2.3**

### Property 7: Upper Section Scoring and Bonus
*For any* upper section category (Ones-Sixes), scoring should sum only matching dice values, and when the upper section total reaches 63+ points, exactly 35 bonus points should be awarded
**Validates: Requirements 3.2, 3.3, 7.1**

### Property 8: Lower Section Scoring Accuracy
*For any* lower section category and dice combination, the calculated score should match official Yahtzee rules: Three/Four of a Kind sum all dice, Full House awards 25 points, Small Straight awards 30 points, Large Straight awards 40 points, Yahtzee awards 50 points, and Chance sums all dice
**Validates: Requirements 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8**

### Property 9: Rendering Completeness
*For any* game state, the SVG rendering should include current dice values with keep indicators, all player scorecards with filled/available categories, current player indication, and appropriate game phase information
**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

### Property 10: API Compatibility
*For any* move validation or game state operation, the plugin should return properly structured ValidationResult and GameState objects compatible with the existing service API
**Validates: Requirements 6.2, 6.3**

## Error Handling

### Validation Errors
- Invalid move attempts (wrong player, wrong phase)
- Category already used
- Exceeded roll limit
- Invalid dice keep selections

### State Errors
- Game not in active lifecycle
- Player not found in game
- Corrupted scorecard data

### Dice Engine Errors
- Invalid dice count or sides specification
- Seed generation failures

All errors return descriptive `ValidationResult` objects with clear reason messages for client feedback.

## Testing Strategy

### Unit Testing
The implementation will include comprehensive unit tests for:
- Individual scoring calculations for each category
- Dice engine seeded random generation
- Move validation logic
- Scorecard state management
- Game completion detection

### Property-Based Testing
Property-based tests will be implemented using **fast-check** library with a minimum of 100 iterations per property:

- **Property 1**: Game initialization completeness with random player counts
- **Property 2**: Turn management consistency across random game sequences
- **Property 3**: Category uniqueness enforcement with random scoring patterns
- **Property 4**: Game completion detection with random scorecard configurations
- **Property 5**: Dice engine deterministic behavior with random seeds
- **Property 6**: Dice keep selection preservation with random keep patterns
- **Property 7**: Upper section scoring and bonus calculation with random dice combinations
- **Property 8**: Lower section scoring accuracy across all categories with random dice
- **Property 9**: Rendering completeness with random game states
- **Property 10**: API compatibility with random move sequences

Each property-based test will be tagged with comments explicitly referencing the corresponding correctness property using the format: `**Feature: yahtzee-plugin, Property {number}: {property_text}**`

### Integration Testing
- Full game flow from creation to completion
- Multi-player turn management
- SVG rendering output validation
- API endpoint compatibility