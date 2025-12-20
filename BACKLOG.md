# Development Backlog

## ✅ WebSocket Refactor: Remove AI-specific Move Handling - COMPLETED

**Priority:** Medium  
**Effort:** Small  
**Created:** 2025-12-20  
**Completed:** 2025-12-20

### Problem
Currently, the WebSocket notification system treats AI moves differently from human moves by adding AI-specific metadata (`lastMoveByAI`, `isAIPlayer`, `winnerIsAI`) to WebSocket messages. This violates the principle that "a move is just a move" regardless of its source.

### Solution Implemented
1. **✅ Removed AI-specific parameters** from `broadcastGameUpdate()` method
2. **✅ Removed AI flags** from WebSocket message interfaces (`lastMoveByAI`, `isAIPlayer`, `winnerIsAI`)
3. **✅ Use player metadata** in game state to determine if a player is AI (client-side responsibility)
4. **✅ Simplified broadcast logic** to treat all moves identically
5. **✅ Updated integration tests** to verify uniform move handling

### Benefits Achieved
- Cleaner, more maintainable code
- Consistent move handling regardless of source
- Reduced complexity in WebSocket layer
- Better separation of concerns (AI detection is a client concern)

### Files Modified
- `src/domain/interfaces/IWebSocketService.ts` - Removed AI flags from message interfaces
- `src/application/services/StateManagerService.ts` - Simplified broadcast methods
- `tests/integration/aiWebSocketNotifications.test.ts` - Updated test expectations
- `tests/unit/application/StateManagerService.test.ts` - Updated test expectations

### Acceptance Criteria - All Met ✅
- [x] All moves broadcast using identical WebSocket message format
- [x] AI player information available through existing player metadata
- [x] No AI-specific parameters in broadcast methods
- [x] All existing tests pass with updated expectations
- [x] WebSocket messages contain only essential game state information