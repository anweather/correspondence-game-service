# Observer/Spectator Implementation Plan

## Current State Analysis

### What Exists:
1. **Frontend**: GameCard component has a "View Game" button for full games
2. **Backend**: `GET /api/games/:gameId` endpoint allows anyone to view game state
3. **Backend**: Integration tests show unauthenticated users can view games
4. **Frontend**: GameClient has `getGame()` method for fetching game state

### What's Broken:
1. **Frontend**: "View Game" button calls `onJoin()` instead of a separate observer action
2. **Backend**: No distinction between joining as player vs. observing
3. **Frontend**: No observer-specific UI state or permissions
4. **Backend**: No observer tracking or observer-specific features

---

## Implementation Plan

### Phase 1: Backend Observer Support 🔧

#### 1.1 Domain Model Updates
**File**: `src/domain/models/index.ts`

**Changes**:
```typescript
// Add observer interface
export interface Observer {
  id: string;
  name: string;
  joinedAt: Date;
  metadata?: Record<string, any>;
}

// Update GameState interface
export interface GameState<TMetadata = Record<string, any>> {
  // ... existing fields
  observers: Observer[]; // Add observers array
}
```

#### 1.2 New API Endpoints
**File**: `src/adapters/rest/gameRoutes.ts`

**New Routes**:
```typescript
// POST /api/games/:gameId/observe
// Add current user as observer (authenticated)

// DELETE /api/games/:gameId/observe
// Remove current user from observers (authenticated)

// GET /api/games/:gameId/observers
// List all observers for a game
```

#### 1.3 GameManagerService Updates
**File**: `src/application/services/GameManagerService.ts`

**New Methods**:
```typescript
async addObserver(gameId: string, observer: Observer): Promise<GameState>
async removeObserver(gameId: string, observerId: string): Promise<GameState>
async listObservers(gameId: string): Promise<Observer[]>
```

---

### Phase 2: Frontend Observer Support 🎨

#### 2.1 GameClient Updates
**File**: `web-client/src/api/gameClient.ts`

**New Methods**:
```typescript
async observeGame(gameId: string, observer: Observer): Promise<GameState>
async stopObserving(gameId: string): Promise<GameState>
async getObservers(gameId: string): Promise<Observer[]>
```

#### 2.2 PlayerContext Updates
**File**: `web-client/src/context/PlayerContext.tsx`

**New State & Methods**:
```typescript
interface PlayerContextState {
  // ... existing fields
  isObserver: boolean;
  observerMode: boolean;
}

interface PlayerContextActions {
  // ... existing methods
  observeGame: (gameId: string) => Promise<void>;
  stopObserving: () => void;
}
```

#### 2.3 UI Component Updates

**GameCard Component**:
- **File**: `web-client/src/components/Lobby/GameCard.tsx`
- **Changes**: Fix "View Game" button to call observer action instead of join

**GameDetail Component**:
- **File**: `web-client/src/components/GameDetail/GameDetail.tsx`
- **Changes**: 
  - Show observer indicator when in observer mode
  - Hide move-making UI for observers
  - Show observer list
  - Add "Stop Observing" button for observers

**PlayerView Component**:
- **File**: `web-client/src/views/PlayerView.tsx`
- **Changes**: Handle observer mode state and UI differences

---

### Phase 3: Enhanced Observer Features ✨

#### 3.1 Observer Permissions
- Observers can view game state and board
- Observers cannot make moves
- Observers can see move history
- Observers can see other observers
- Observers get real-time updates via WebSocket

#### 3.2 Observer UI Enhancements
- Observer badge/indicator in game view
- Observer count in game cards
- Observer list in game detail
- Different styling for observer mode

#### 3.3 WebSocket Integration
**File**: `web-client/src/context/WebSocketContext.tsx`

**Changes**: Subscribe observers to game updates

---

## Implementation Steps

### Step 1: Backend Foundation (2-3 hours)
1. Update domain models to include observers
2. Add observer endpoints to game routes
3. Implement observer methods in GameManagerService
4. Add observer support to repository layer
5. Write unit tests for observer functionality

### Step 2: Frontend Integration (2-3 hours)
1. Update GameClient with observer methods
2. Update PlayerContext for observer state
3. Fix GameCard "View Game" button behavior
4. Update GameDetail component for observer mode
5. Add observer UI indicators and controls

### Step 3: Testing & Polish (1-2 hours)
1. Write integration tests for observer flow
2. Update existing tests for new observer fields
3. Test observer WebSocket subscriptions
4. Polish observer UI/UX

---

## Key Design Decisions

1. **Observers are separate from players** - They don't count toward game capacity
2. **Observers can join/leave anytime** - No restrictions based on game state
3. **Observers get real-time updates** - Same WebSocket integration as players
4. **Observer identity is tracked** - For potential future features (observer chat, etc.)
5. **Backward compatibility** - Existing games work without observers field (empty array)

---

## Estimated Effort

- **Total**: 5-8 hours
- **Backend**: 2-3 hours
- **Frontend**: 2-3 hours  
- **Testing**: 1-2 hours

---

## Technical Notes

### Backend Changes Required:
- Domain model extension (non-breaking)
- New REST endpoints
- Service layer methods
- Repository updates for observer persistence
- Unit tests for new functionality

### Frontend Changes Required:
- API client methods
- Context state management
- Component UI updates
- Observer-specific styling
- Integration tests

### Migration Strategy:
- Add `observers: []` default to existing games
- No database migration needed (in-memory storage)
- Backward compatible with existing API consumers

---

## Success Criteria

✅ Users can click "View Game" on full games and observe without joining
✅ Observers see game state and board but cannot make moves
✅ Observers receive real-time updates via WebSocket
✅ Observer list is visible in game detail view
✅ Observers can stop observing and return to lobby
✅ All existing functionality continues to work
✅ Tests pass for both player and observer flows

---

## Future Enhancements (Out of Scope)

- Observer chat/comments
- Observer statistics tracking
- Observer notifications
- Observer-specific game views (e.g., hide player hands in card games)
- Observer replay/rewind functionality
