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


## Game History API Improvements

**Priority:** Medium  
**Effort:** Medium (4-6 days)  
**Created:** 2025-12-22  
**Status:** Not Started

### Problem
The current game history API has several issues:
1. **Inconsistent Response Format**: Returns simple array instead of paginated response like other endpoints
2. **Excessive Data Transfer**: Returns full `GameState` objects with complete `moveHistory` arrays
3. **Missing Pagination**: No proper pagination support, doesn't scale with large game histories
4. **Performance**: Unnecessary data transfer slows down history view loading

### Current State
- Backend returns `GameState[]` directly from `/api/players/history`
- Frontend fixed with minimal workaround to handle array response
- No pagination support in current implementation
- Full game state including all moves returned for each game

### Proposed Solution
1. **Standardize Response Format**: Return `PaginatedResult<GameHistorySummary>` with proper pagination metadata
2. **Create Lightweight Summary Type**: New `GameHistorySummary` type with only essential fields
3. **Implement Proper Pagination**: Support page/pageSize parameters with total count
4. **Optimize Queries**: Don't fetch full moveHistory, use move count instead

### Benefits
- Consistent API design across all endpoints
- Reduced data transfer and faster loading
- Scalable pagination for large game histories
- Better user experience with faster response times

### Implementation Tasks
- [ ] Create `GameHistorySummary` type in domain models
- [ ] Update `PostgresStatsRepository.getGameHistory()` for pagination
- [ ] Update `StatsService.getGameHistory()` return type
- [ ] Update stats route to return paginated format
- [ ] Update frontend `GameClient.getGameHistory()` 
- [ ] Restore pagination in `StatsView` component
- [ ] Update all related tests
- [ ] Performance testing with large datasets

### Related Files
- `src/infrastructure/persistence/PostgresStatsRepository.ts`
- `src/application/services/StatsService.ts`
- `src/adapters/rest/statsRoutes.ts`
- `web-client/src/api/gameClient.ts`
- `web-client/src/views/StatsView.tsx`
- `tests/integration/statsRoutes.test.ts`

### Breaking Changes
- Response format changes from `GameState[]` to `PaginatedResult<GameHistorySummary>`
- Some `GameState` properties no longer available in history list
- Clients need to fetch individual games for full details

### Documentation
See `GAME_HISTORY_API_IMPROVEMENTS.md` for detailed implementation plan.
