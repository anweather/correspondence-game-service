# Development Backlog

## WebSocket Refactor: Remove AI-specific Move Handling

**Priority:** Medium  
**Effort:** Small  
**Created:** 2025-12-20

### Problem
Currently, the WebSocket notification system treats AI moves differently from human moves by adding AI-specific metadata (`lastMoveByAI`, `isAIPlayer`, `winnerIsAI`) to WebSocket messages. This violates the principle that "a move is just a move" regardless of its source.

### Current Implementation Issues
- `StateManagerService.broadcastGameUpdate()` accepts a `lastMoveByAI` parameter
- WebSocket message interfaces include AI-specific flags
- Different code paths for broadcasting human vs AI moves
- Unnecessary complexity in the notification layer

### Proposed Solution
1. **Remove AI-specific parameters** from `broadcastGameUpdate()` method
2. **Remove AI flags** from WebSocket message interfaces (`lastMoveByAI`, `isAIPlayer`, `winnerIsAI`)
3. **Use player metadata** in game state to determine if a player is AI (client-side responsibility)
4. **Simplify broadcast logic** to treat all moves identically
5. **Update integration tests** to verify uniform move handling

### Benefits
- Cleaner, more maintainable code
- Consistent move handling regardless of source
- Reduced complexity in WebSocket layer
- Better separation of concerns (AI detection is a client concern)

### Implementation Notes
- Player metadata already contains `isAI: true` for AI players
- Game metadata already contains `hasAIPlayers` and `aiPlayerCount`
- Clients can determine move source from player metadata
- No breaking changes to game state structure needed

### Files to Modify
- `src/domain/interfaces/IWebSocketService.ts` - Remove AI flags from message interfaces
- `src/application/services/StateManagerService.ts` - Simplify broadcast methods
- `tests/integration/aiWebSocketNotifications.test.ts` - Update test expectations

### Acceptance Criteria
- [ ] All moves broadcast using identical WebSocket message format
- [ ] AI player information available through existing player metadata
- [ ] No AI-specific parameters in broadcast methods
- [ ] All existing tests pass with updated expectations
- [ ] WebSocket messages contain only essential game state information