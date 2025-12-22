# Game History API Improvements

## Background

The current game history API has several issues that need to be addressed:

1. **Inconsistent Response Format**: The `/api/players/history` endpoint returns a simple array, while other endpoints use paginated responses with `{ items: [], page: number, total: number, ... }`

2. **Excessive Data Transfer**: The API returns full `GameState` objects including complete `moveHistory` arrays, which can be large and unnecessary for a history list view

3. **Missing Pagination**: No proper pagination support means all games are returned at once, which doesn't scale

## Current State

- **Backend**: Returns `GameState[]` directly from `/api/players/history`
- **Frontend**: Fixed to handle array response (minimal fix applied)
- **Tests**: Expect array response format

## Proposed Improvements

### 1. Standardize Response Format

Update `/api/players/history` to return consistent paginated format:

```typescript
interface GameHistoryResponse {
  items: GameHistorySummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
```

### 2. Create Lightweight Game Summary Type

Instead of full `GameState`, return summary objects:

```typescript
interface GameHistorySummary {
  gameId: string;
  gameType: string;
  lifecycle: GameLifecycle;
  players: Array<{
    id: string;
    name: string;
    metadata?: { isAI?: boolean };
  }>;
  winner: string | null;
  metadata: {
    gameName?: string;
    gameDescription?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  moveCount: number; // Instead of full moveHistory
}
```

### 3. Implement Proper Pagination

- Default page size: 20 games
- Support `page` and `pageSize` query parameters
- Return total count and page metadata
- Order by `updatedAt DESC` (most recent first)

### 4. Optimize Database Queries

- Don't fetch full `moveHistory` arrays
- Use `COUNT(*)` for move count instead
- Add database indexes for common query patterns

## Implementation Plan

### Phase 1: Backend Changes
1. Create `GameHistorySummary` type in domain models
2. Update `PostgresStatsRepository.getGameHistory()` to:
   - Return paginated results with metadata
   - Use lightweight summary objects
   - Implement proper SQL pagination with LIMIT/OFFSET
3. Update `StatsService.getGameHistory()` return type
4. Update stats route to return paginated format

### Phase 2: Frontend Changes
1. Update `GameClient.getGameHistory()` to expect paginated response
2. Restore pagination functionality in `StatsView`
3. Update `GameHistory` component to handle pagination
4. Update types to use `GameHistorySummary`

### Phase 3: Testing
1. Update integration tests for new response format
2. Update unit tests for new types
3. Add tests for pagination edge cases
4. Performance testing with large datasets

## Benefits

- **Consistency**: All list endpoints use same pagination format
- **Performance**: Reduced data transfer and faster queries
- **Scalability**: Proper pagination supports large game histories
- **User Experience**: Better loading times and navigation

## Breaking Changes

- Response format changes from `GameState[]` to `PaginatedResult<GameHistorySummary>`
- Some `GameState` properties no longer available in history list
- Clients need to fetch individual games for full details

## Migration Strategy

1. Implement new endpoint alongside existing one
2. Update frontend to use new endpoint
3. Deprecate old endpoint after migration
4. Remove old endpoint in next major version

## Estimated Effort

- Backend: 2-3 days
- Frontend: 1-2 days  
- Testing: 1 day
- **Total: 4-6 days**

## Priority

**Medium** - Improves performance and consistency but current workaround is functional.

## Related Issues

- Game detail view should fetch full `GameState` when needed
- Consider caching strategies for frequently accessed games
- Evaluate if move history should be a separate endpoint