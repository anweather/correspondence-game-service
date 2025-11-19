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

### Dynamic Game Plugin Packages

**Issue**: Currently, game plugins are tightly coupled to the main codebase. Each new game type must be added to the `src/adapters/plugins/` directory and registered in the main application code.

**Problem**: This approach has several limitations:
- Game developers must modify the core service codebase
- All games are bundled together, increasing application size
- Cannot independently version or distribute game implementations
- Difficult to maintain separate game-specific dependencies
- Testing is coupled to the main test suite

**Proposed Solution**: Enable packaging game types as separate npm packages that can be dynamically imported and registered:

1. **Plugin Package Structure**:
   ```
   @boardgame-plugins/chess/
   ├── package.json
   ├── src/
   │   └── ChessEngine.ts
   ├── tests/
   │   └── ChessEngine.test.ts
   └── README.md
   ```

2. **Plugin Manifest** (`package.json`):
   ```json
   {
     "name": "@boardgame-plugins/chess",
     "version": "1.0.0",
     "main": "dist/index.js",
     "peerDependencies": {
       "async-boardgame-service": "^1.0.0"
     },
     "boardgamePlugin": {
       "gameType": "chess",
       "engineClass": "ChessEngine"
     }
   }
   ```

3. **Dynamic Registration**:
   - Add plugin discovery mechanism that scans `node_modules` for packages with `boardgamePlugin` metadata
   - Support explicit plugin registration via configuration file
   - Enable runtime plugin loading without application restart

4. **Plugin API**:
   - Export base classes and interfaces as a separate package (`@boardgame-service/plugin-api`)
   - Provide test utilities as `@boardgame-service/test-utils`
   - Version the plugin API independently from the service

5. **Configuration** (`.boardgamerc.json`):
   ```json
   {
     "plugins": [
       "@boardgame-plugins/chess",
       "@boardgame-plugins/checkers",
       "./local-plugins/custom-game"
     ],
     "autoDiscovery": true
   }
   ```

**Benefits**:
- Game developers can publish plugins independently
- Smaller core application bundle
- Independent versioning and testing of game implementations
- Community can contribute games without core access
- Support for private/proprietary game implementations
- Easier to maintain game-specific dependencies

**Implementation Considerations**:
- Plugin security and validation
- Version compatibility checking
- Plugin lifecycle management (load, unload, reload)
- Error isolation (plugin failures shouldn't crash service)
- Plugin marketplace/registry
- Documentation and tooling for plugin developers

**Priority**: Low - Nice to have for ecosystem growth, but not critical for core functionality

**Related Requirements**: 5.1 (Plugin interface support), 6.4 (Unit tests for game engines)

**Estimated Effort**: Large (2-3 weeks)
- Design plugin API package structure
- Implement dynamic plugin discovery and loading
- Create plugin packaging tooling/templates
- Update documentation and examples
- Migrate existing plugins to new structure
- Add plugin validation and security checks

---

### Persistent Storage Implementation

**Issue**: Currently using in-memory storage (`InMemoryGameRepository`) which loses all data on server restart.

**Problem**: 
- Game state is not persisted across restarts
- No backup or recovery mechanism
- Not suitable for production use
- Cannot scale horizontally (each instance has separate state)

**Proposed Solution**: Implement persistent storage following the phased approach from the design:

1. **Phase 2: File-Based Persistence**
   - JSON files for each game instance
   - Simple directory structure: `data/games/{gameId}.json`
   - Atomic writes with temp files and rename
   - Periodic cleanup of completed games
   - Simple backup via file system snapshots

2. **Phase 3: Database Persistence**
   - PostgreSQL or MongoDB implementation
   - Proper indexing on gameId, playerId, gameType, lifecycle
   - Connection pooling
   - Migration scripts
   - Query optimization for list operations

**Implementation Steps**:
- Create `FileGameRepository` implementing `GameRepository` interface
- Add configuration for storage backend selection
- Implement data migration utilities
- Add database schema and migrations
- Update deployment documentation

**Priority**: High - Required for production deployment

**Related Requirements**: All (affects core persistence)

**Estimated Effort**: Medium (1-2 weeks)
- File-based: 3-4 days
- Database: 5-7 days
- Testing and migration: 2-3 days

---

### PNG Rendering Support

**Issue**: Currently only SVG rendering is implemented. PNG endpoint exists in API but is not functional.

**Problem**:
- API documentation mentions PNG support
- Route exists but returns SVG
- Some clients may prefer raster images
- Mobile apps often work better with PNG

**Proposed Solution**: Implement PNG rendering using one of these approaches:

1. **Server-side SVG to PNG conversion**:
   - Use `sharp` or `node-canvas` library
   - Convert SVG output to PNG
   - Add image quality/size configuration

2. **Direct canvas rendering**:
   - Render directly to canvas using `node-canvas`
   - Reuse render element logic
   - May offer better performance

**Implementation Steps**:
- Add PNG conversion library dependency
- Implement `renderToPNG()` method in `RendererService`
- Add configuration for image quality/dimensions
- Update tests to cover PNG rendering
- Add performance benchmarks

**Priority**: Medium - Nice to have, not critical

**Related Requirements**: 4.5 (Board image format support)

**Estimated Effort**: Small (2-3 days)

---

### Authentication and Authorization

**Issue**: No authentication or authorization system. Player IDs are trusted from client requests.

**Problem**:
- Anyone can make moves for any player
- No user identity verification
- Cannot prevent cheating or unauthorized access
- No rate limiting or abuse prevention

**Proposed Solution**: Implement authentication and authorization:

1. **Authentication**:
   - JWT-based authentication
   - Support for OAuth providers (Google, GitHub, Discord)
   - API key authentication for service-to-service
   - Session management

2. **Authorization**:
   - Verify player identity before accepting moves
   - Role-based access control (player, spectator, admin)
   - Game-level permissions
   - Rate limiting per user

3. **Player Identity**:
   - Link external identity providers to internal player IDs
   - Use `Player.externalId` field (already in model)
   - Support multiple auth providers per player

**Implementation Steps**:
- Add authentication middleware
- Implement JWT token generation/validation
- Add OAuth integration
- Update API to require authentication
- Add authorization checks to move validation
- Update documentation with auth examples

**Priority**: High - Required for production deployment

**Related Requirements**: Security considerations (design doc)

**Estimated Effort**: Large (2-3 weeks)

---

### WebSocket Support for Real-Time Updates

**Issue**: Currently REST-only API requires polling for game state updates.

**Problem**:
- Clients must poll to detect opponent moves
- Inefficient for real-time gameplay
- Increased server load from polling
- Poor user experience (delayed updates)

**Proposed Solution**: Add WebSocket support for real-time game updates:

1. **WebSocket Events**:
   - `game:updated` - Game state changed
   - `move:made` - Player made a move
   - `player:joined` - Player joined game
   - `game:completed` - Game ended

2. **Subscription Model**:
   - Clients subscribe to specific game IDs
   - Server pushes updates to subscribed clients
   - Automatic reconnection handling
   - Fallback to REST polling if WebSocket unavailable

3. **Implementation**:
   - Use Socket.IO or native WebSocket
   - Add event emitter to services
   - Implement room-based subscriptions
   - Add connection management

**Benefits**:
- Instant move notifications
- Reduced server load
- Better user experience
- Enables live spectating

**Priority**: Medium - Improves UX significantly

**Related Requirements**: 2.4 (Real-time state retrieval)

**Estimated Effort**: Medium (1-2 weeks)

---

### Game History and Replay

**Issue**: Move history is stored but there's no way to replay games or view historical states.

**Problem**:
- Cannot review past games
- No way to analyze gameplay
- Cannot share interesting games
- Missing educational/learning features

**Proposed Solution**: Add game replay functionality:

1. **Replay API**:
   - `GET /api/games/:gameId/replay` - Get full replay data
   - `GET /api/games/:gameId/state/:moveNumber` - Get state at specific move
   - `GET /api/games/:gameId/replay.gif` - Animated replay

2. **Features**:
   - Step through moves one at a time
   - Jump to specific move number
   - Playback speed control
   - Export replay as animated GIF or video

3. **Storage**:
   - Store complete move history (already done)
   - Add move timestamps for timing
   - Optionally store board snapshots for faster replay

**Benefits**:
- Game analysis and learning
- Shareable game replays
- Debugging game engine issues
- Content creation (streamers, tutorials)

**Priority**: Low - Nice to have feature

**Related Requirements**: 3.5 (Move history)

**Estimated Effort**: Medium (1 week)

---

### Dice and Card Mechanics Support

**Issue**: Design mentions dice and card support but not implemented in base interfaces.

**Problem**:
- Game engines must implement dice/card logic from scratch
- No standardized approach
- Difficult to ensure fairness (randomness)
- No built-in shuffle/draw mechanics

**Proposed Solution**: Add optional dice and card utilities to base engine:

1. **Dice Utilities**:
   ```typescript
   interface DiceRoller {
     roll(sides: number, count: number): number[];
     rollWithModifier(sides: number, count: number, modifier: number): number;
   }
   ```

2. **Card Deck Utilities**:
   ```typescript
   interface DeckManager<T> {
     shuffle(deck: T[]): T[];
     draw(deck: T[], count: number): { drawn: T[], remaining: T[] };
     deal(deck: T[], playerCount: number, cardsPerPlayer: number): T[][];
   }
   ```

3. **Randomness**:
   - Cryptographically secure random number generation
   - Seeded random for deterministic replay
   - Audit trail for fairness verification

**Priority**: Medium - Needed for many game types

**Related Requirements**: 5.3, 5.4 (Dice and card mechanics)

**Estimated Effort**: Small (3-4 days)

---

### Hexagonal Board Support

**Issue**: Only rectangular grids are well-supported. Hexagonal boards require custom implementation.

**Problem**:
- Many board games use hex grids (Settlers of Catan, Civilization)
- No standard hex coordinate system
- Difficult to implement neighbor calculations
- Rendering hex grids is complex

**Proposed Solution**: Add hex grid utilities:

1. **Hex Coordinate Systems**:
   - Axial coordinates (q, r)
   - Cube coordinates (x, y, z)
   - Offset coordinates (row, col)
   - Conversion utilities between systems

2. **Hex Grid Utilities**:
   ```typescript
   interface HexGrid {
     getNeighbors(coord: HexCoord): HexCoord[];
     getDistance(a: HexCoord, b: HexCoord): number;
     getLine(a: HexCoord, b: HexCoord): HexCoord[];
     getRange(center: HexCoord, radius: number): HexCoord[];
   }
   ```

3. **Hex Rendering**:
   - Standard hex shape generation
   - Flat-top and pointy-top orientations
   - Automatic layout calculation

**Priority**: Low - Specific to certain game types

**Related Requirements**: 5.2 (Complex board structures)

**Estimated Effort**: Medium (1 week)

---

### Performance Monitoring and Metrics

**Issue**: No monitoring, logging, or performance metrics.

**Problem**:
- Cannot identify performance bottlenecks
- No visibility into system health
- Difficult to debug production issues
- No usage analytics

**Proposed Solution**: Add comprehensive monitoring:

1. **Metrics**:
   - Request latency (p50, p95, p99)
   - Game creation/completion rates
   - Active games count
   - Move validation time
   - Rendering time
   - Error rates

2. **Logging**:
   - Structured logging (JSON)
   - Log levels (debug, info, warn, error)
   - Request tracing
   - Game event logging

3. **Tools**:
   - Prometheus for metrics
   - Grafana for dashboards
   - ELK stack or similar for logs
   - APM tool (New Relic, DataDog)

**Priority**: High - Required for production

**Related Requirements**: Non-functional requirements

**Estimated Effort**: Medium (1 week)

---

### API Rate Limiting

**Issue**: No rate limiting on API endpoints.

**Problem**:
- Vulnerable to abuse and DoS attacks
- No protection against spam
- Cannot enforce fair usage
- May impact legitimate users during attacks

**Proposed Solution**: Implement rate limiting:

1. **Rate Limit Strategies**:
   - Per-IP rate limiting
   - Per-user rate limiting (after auth)
   - Per-endpoint rate limiting
   - Sliding window algorithm

2. **Configuration**:
   - Configurable limits per endpoint
   - Different limits for authenticated vs anonymous
   - Burst allowance
   - Rate limit headers in responses

3. **Implementation**:
   - Use `express-rate-limit` or similar
   - Redis-backed for distributed systems
   - Graceful degradation
   - Clear error messages

**Priority**: High - Security concern

**Related Requirements**: Security considerations

**Estimated Effort**: Small (2-3 days)

---

## Technical Debt

### Improve Error Handling Consistency

**Issue**: Error handling is inconsistent across the codebase.

**Problem**:
- Some errors use custom error classes, others use generic Error
- Error responses not always following standard format
- Missing error details in some cases
- No centralized error handling middleware

**Proposed Solution**:
- Implement centralized error handling middleware
- Ensure all errors extend base `GameError` class
- Standardize error response format
- Add error codes for all error types
- Improve error messages with actionable information

**Priority**: Medium

**Estimated Effort**: Small (2-3 days)

---

### Add Input Validation

**Issue**: Limited input validation on API endpoints.

**Problem**:
- Relying on TypeScript types at compile time
- No runtime validation of request bodies
- Potential for invalid data to reach services
- Poor error messages for invalid input

**Proposed Solution**:
- Add validation library (Joi, Zod, or class-validator)
- Validate all request bodies and query parameters
- Return clear validation errors
- Add request schema documentation

**Priority**: High - Security and stability concern

**Estimated Effort**: Small (3-4 days)

---

### Refactor Repository Interface

**Issue**: `findByPlayer` and `findAll` have duplicate filtering logic.

**Problem**:
- Code duplication in `InMemoryGameRepository`
- Filtering logic repeated in both methods
- Difficult to maintain consistency
- Will be worse with database implementation

**Proposed Solution**:
- Extract common filtering logic to private method
- Consider query builder pattern for complex filters
- Prepare for database query optimization

**Priority**: Low - Technical debt, not urgent

**Estimated Effort**: Small (1-2 days)

---

## Known Limitations

### In-Memory Storage Data Loss

**Limitation**: All game data is lost when the server restarts.

**Impact**: Not suitable for production use. Games in progress will be lost.

**Workaround**: Implement persistent storage (see Future Enhancements).

**Tracking**: High priority enhancement

---

### No Horizontal Scaling

**Limitation**: Cannot run multiple instances due to in-memory storage and lack of distributed locking.

**Impact**: Limited to single-server deployment. Cannot handle high load.

**Workaround**: 
- Implement database persistence
- Add distributed locking (Redis)
- Use sticky sessions for WebSocket

**Tracking**: Required for production scaling

---

### Limited Board Complexity

**Limitation**: Current implementation optimized for simple rectangular grids.

**Impact**: Complex board shapes (hex, irregular) require significant custom code.

**Workaround**: Game engines can implement custom board structures using metadata.

**Tracking**: Medium priority enhancement (hex grid support)

---

### No Spectator Mode

**Limitation**: No way to view games without being a player.

**Impact**: Cannot watch games in progress, no tournament streaming support.

**Workaround**: None currently. Would require authentication and authorization system.

**Tracking**: Low priority enhancement
