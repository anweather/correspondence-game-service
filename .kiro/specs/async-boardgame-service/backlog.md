# Backlog & Known Issues

This document tracks future improvements, technical debt, and known issues that should be addressed but are not blocking current functionality.

## Future Enhancements

### Turn Advancement Configuration

**Issue**: Currently, `StateManagerService.applyMove()` automatically calls `advanceTurn()` after every move. This assumes all games follow a simple sequential turn-based pattern.

**Problem**: Some game types may need different turn advancement logic:
- Games with multiple actions per turn
- Games where the same player can take consecutive turns under certain conditions
- Games with simultaneous turns
- Games with complex phase-based turn structures

**Proposed Solution**: Make turn advancement configurable per game type:
1. Add an optional `shouldAdvanceTurn(state: GameState, move: Move): boolean` method to the `GameEnginePlugin` interface
2. Update `StateManagerService` to check this method before calling `advanceTurn()`
3. Default behavior (if not implemented) should be to advance turn after each move (current behavior)
4. Allow game engines to implement custom turn advancement logic

**Priority**: Medium - Current implementation works for simple games like Tic-Tac-Toe, but will need to be addressed before implementing more complex game types.

**Related Requirements**: 3.1, 3.2 (Turn management)

---

## Technical Debt

_No items currently tracked_

---

## Known Limitations

_No items currently tracked_
