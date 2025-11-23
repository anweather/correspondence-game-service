# Game Plugin Backlog

This document tracks potential game implementations for the Async Boardgame Service. Games are organized by implementation status and complexity.

## 🎯 Implementation Status

### ✅ Implemented
- **Tic-Tac-Toe** - Classic 3×3 grid game, 2 players

### 🚧 In Progress
- **Connect Four** - Vertical grid game with gravity mechanics, 2 players

### 📋 Planned

#### Priority 1: Simple Grid Games
These games have similar complexity to Tic-Tac-Toe and are good candidates for early implementation.

##### **Othello/Reversi**
- **Complexity:** ⭐⭐⭐
- **Players:** 2
- **Board:** 8×8 grid
- **Key Features:**
  - Piece flipping mechanics
  - Strategic placement
  - Clear end condition (board full or no valid moves)
  - Beautiful visual feedback
- **Implementation Notes:**
  - Complex move validation (must flip opponent pieces)
  - Need to check all 8 directions for valid moves
  - Score tracking (count pieces of each color)

##### **Checkers/Draughts**
- **Complexity:** ⭐⭐⭐
- **Players:** 2
- **Board:** 8×8 grid (only dark squares used)
- **Key Features:**
  - Diagonal movement
  - Capture mechanics
  - King promotion
  - Multi-jump captures
- **Implementation Notes:**
  - Multiple move types (regular, capture, multi-capture)
  - Forced capture rules
  - King promotion at opposite end
  - Complex validation for jump sequences

#### Priority 2: Alternative Mechanics

##### **Dots and Boxes**
- **Complexity:** ⭐⭐
- **Players:** 2-4
- **Board:** Grid of dots (variable size)
- **Key Features:**
  - Line drawing between dots
  - Box completion scoring
  - Extra turn on box completion
  - Multi-player support
- **Implementation Notes:**
  - Different data structure (edges, not cells)
  - Need to track horizontal and vertical lines separately
  - Box ownership detection
  - Turn management with extra turns

##### **Mancala**
- **Complexity:** ⭐⭐
- **Players:** 2
- **Board:** Linear (2 rows of 6 pits + 2 stores)
- **Key Features:**
  - Stone sowing mechanics
  - Capture rules
  - Extra turn on landing in store
  - Ancient game with simple rules
- **Implementation Notes:**
  - Linear board structure (different from grid)
  - Counter-clockwise sowing
  - Capture opposite pit
  - End condition (one side empty)

#### Priority 3: Hidden Information Games

##### **Battleship**
- **Complexity:** ⭐⭐⭐
- **Players:** 2
- **Board:** Two 10×10 grids per player
- **Key Features:**
  - Hidden ship placement
  - Attack/hit/miss mechanics
  - Two-phase gameplay (setup + play)
  - Private board state
- **Implementation Notes:**
  - Hidden information (each player has private board)
  - Setup phase before gameplay
  - Ship placement validation (no overlaps, within bounds)
  - Hit/miss/sunk detection

#### Priority 4: Card-Based Games

##### **Uno**
- **Complexity:** ⭐⭐⭐⭐
- **Players:** 2-10
- **Deck:** 108 cards
- **Key Features:**
  - Card matching (color or number)
  - Special action cards
  - Draw mechanics
  - Multi-player support
- **Implementation Notes:**
  - Deck management and shuffling
  - Hand management (hidden from other players)
  - Special card effects (skip, reverse, draw 2, wild)
  - Turn order changes (reverse)
  - Win condition (first to empty hand)

##### **Go Fish**
- **Complexity:** ⭐⭐
- **Players:** 2-6
- **Deck:** Standard 52-card deck
- **Key Features:**
  - Card requesting
  - Set collection
  - Simple rules
  - Good for testing card mechanics
- **Implementation Notes:**
  - Hidden hands
  - Card requesting validation
  - Set detection (4 of a kind)
  - Draw from deck

#### Priority 5: Advanced Strategy Games

##### **Chess**
- **Complexity:** ⭐⭐⭐⭐⭐
- **Players:** 2
- **Board:** 8×8 grid
- **Key Features:**
  - Complex piece movement rules
  - Check/checkmate detection
  - Castling, en passant
  - Pawn promotion
- **Implementation Notes:**
  - 6 different piece types with unique movement
  - Check detection and prevention
  - Special moves (castling, en passant)
  - Stalemate detection
  - Move history for draw conditions

##### **Go**
- **Complexity:** ⭐⭐⭐⭐⭐
- **Players:** 2
- **Board:** 19×19 grid (or 9×9, 13×13)
- **Key Features:**
  - Territory control
  - Capture groups
  - Ko rule
  - Scoring
- **Implementation Notes:**
  - Group detection (connected stones)
  - Liberty counting
  - Capture mechanics
  - Ko rule enforcement
  - Complex scoring (territory + captures)

## 🎮 Game Selection Criteria

When choosing the next game to implement, consider:

1. **Complexity Progression:** Start simple, gradually increase complexity
2. **Architectural Testing:** Choose games that test different aspects of the plugin system
3. **Popularity:** Well-known games are easier to test and demonstrate
4. **Unique Mechanics:** Games that introduce new patterns (gravity, hidden info, cards)
5. **Reusability:** Games that share components with existing implementations

## 📊 Complexity Ratings

- ⭐ **Very Simple:** Basic rules, minimal state (e.g., Tic-Tac-Toe)
- ⭐⭐ **Simple:** Straightforward rules, moderate state (e.g., Connect Four, Mancala)
- ⭐⭐⭐ **Moderate:** Multiple move types, complex validation (e.g., Checkers, Othello)
- ⭐⭐⭐⭐ **Complex:** Many rules, special cases, hidden information (e.g., Uno)
- ⭐⭐⭐⭐⭐ **Very Complex:** Deep strategy, complex state management (e.g., Chess, Go)

## 🔄 Implementation Pattern

Each game should follow the established plugin architecture:

```
games/<game-name>/
├── shared/           # Types, constants, interfaces
├── engine/           # Game logic, validation, rules
├── ui/               # React components for move input
├── docs/             # Rules and gameplay documentation
└── __tests__/        # Comprehensive test coverage
```

## 📝 Notes

- Games are listed in approximate order of implementation difficulty
- Complexity ratings are relative to the async turn-based context
- Some games may require extensions to the base plugin interface
- Hidden information games will need special handling in the API layer
- Card games will need deck management utilities

## 🚀 Next Steps

1. Complete Connect Four implementation
2. Evaluate lessons learned from Connect Four
3. Choose next game based on what architectural patterns need testing
4. Consider community feedback and requests

---

**Last Updated:** November 23, 2025
