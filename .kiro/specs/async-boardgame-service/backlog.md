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

## Technical Debt

_No items currently tracked_

---

## Known Limitations

_No items currently tracked_
