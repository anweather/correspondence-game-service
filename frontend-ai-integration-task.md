# Frontend AI Player Integration Task

## Overview
Update the frontend game creation interface to support AI players. Users should be able to select AI opponents when creating games, with different difficulty levels and strategies based on the game type.

## Backend API Requirements (Prerequisites)

### 1. Add AI Strategies API Endpoint
**File**: `src/adapters/rest/gameRoutes.ts`

Add new endpoint to get available AI strategies for a game type:
```typescript
/**
 * GET /api/game-types/:gameType/ai-strategies
 * Get available AI strategies for a specific game type
 */
router.get('/game-types/:gameType/ai-strategies', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { gameType } = req.params;
    const strategies = aiPlayerService.getAvailableStrategies(gameType);
    res.json(strategies);
  } catch (error) {
    next(error);
  }
});
```

### 2. Update GameType Interface
**File**: `web-client/src/types/game.ts`

Add AI support information to GameType:
```typescript
export interface GameType {
  type: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  supportsAI: boolean; // New field
  aiStrategies?: AIStrategy[]; // New field - populated when fetching strategies
}

export interface AIStrategy {
  id: string;
  name: string;
  description: string;
  difficulty?: string;
}
```

## Frontend Implementation Tasks

### 3. Update GameClient API
**File**: `web-client/src/api/gameClient.ts`

Add method to fetch AI strategies:
```typescript
/**
 * Get available AI strategies for a game type
 */
async getAIStrategies(gameType: string): Promise<AIStrategy[]> {
  return this.request<AIStrategy[]>(`${this.baseUrl}/game-types/${gameType}/ai-strategies`);
}
```

### 4. Create AI Player Configuration Component
**File**: `web-client/src/components/GameCreation/AIPlayerConfig.tsx`

Create a new component for configuring AI players:
```typescript
interface AIPlayerConfigProps {
  gameType: string;
  maxPlayers: number;
  currentPlayerCount: number;
  onAIPlayersChange: (aiPlayers: AIPlayerConfig[]) => void;
}

export function AIPlayerConfig({ gameType, maxPlayers, currentPlayerCount, onAIPlayersChange }: AIPlayerConfigProps) {
  // Component implementation
  // - Checkbox to enable AI players
  // - Dropdown to select number of AI players (1 to maxPlayers - currentPlayerCount)
  // - For each AI player:
  //   - Name input field
  //   - Strategy/difficulty selector
  // - Real-time validation
  // - Preview of final player configuration
}
```

### 5. Update Game Creation Forms

#### 5.1 Update PlayerView Game Creation
**File**: `web-client/src/views/PlayerView.tsx`

Modify the game creation form to include AI player configuration:
- Add state for AI players
- Integrate AIPlayerConfig component
- Update form submission to include AI players in config
- Add validation for total player count (human + AI)

#### 5.2 Update AdminView Game Creation  
**File**: `web-client/src/views/AdminView.tsx`

Add AI player support to admin game creation:
- Update createTestGame to optionally include AI players
- Add AI configuration to the create game modal

### 6. Update Context Providers

#### 6.1 Update PlayerContext
**File**: `web-client/src/context/PlayerContext.tsx`

Modify createGame method to handle AI players:
```typescript
createGame: (
  gameType: string, 
  metadata?: { 
    gameName?: string; 
    gameDescription?: string;
    aiPlayers?: AIPlayerConfig[];
  }
) => Promise<void>;
```

#### 6.2 Update AdminContext
**File**: `web-client/src/context/AdminContext.tsx`

Add AI player support to admin context:
```typescript
createTestGame: (gameType: string, aiPlayers?: AIPlayerConfig[]) => Promise<void>;
```

### 7. Create AI Strategy Hook
**File**: `web-client/src/hooks/useAIStrategies.ts`

Create a custom hook for managing AI strategies:
```typescript
export function useAIStrategies(gameType?: string) {
  const [strategies, setStrategies] = useState<AIStrategy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch strategies when gameType changes
  // Return strategies, loading state, and error
}
```

### 8. Update Game Creation UI Components

#### 8.1 Game Type Selection Enhancement
When a game type is selected:
- Fetch and display AI strategies available for that game type
- Show AI support indicator
- Enable/disable AI configuration based on support

#### 8.2 Player Count Validation
- Ensure total players (human + AI) doesn't exceed maxPlayers
- Ensure at least one human player in the game
- Provide clear feedback about player limits

#### 8.3 AI Player Preview
- Show a preview of configured AI players
- Display strategy names and difficulty levels
- Allow editing/removing individual AI players

### 9. Add Styling and UX Improvements

#### 9.1 AI Player Indicators
**Files**: Various CSS modules

Add visual indicators for AI players:
- Icons to distinguish AI from human players
- Different styling for AI player cards
- Difficulty level badges
- Strategy information tooltips

#### 9.2 Form Validation Feedback
- Real-time validation messages
- Clear error states for invalid configurations
- Success states for valid configurations

### 10. Testing Requirements

#### 10.1 Unit Tests
Create tests for:
- AIPlayerConfig component
- useAIStrategies hook
- Updated context methods
- Form validation logic

#### 10.2 Integration Tests
Test complete game creation flow:
- Creating games with AI players
- Different AI strategies and difficulties
- Player count validation
- Error handling for invalid configurations

#### 10.3 E2E Tests
**File**: `web-client/src/__tests__/ai-game-creation.e2e.test.tsx`

Test user workflows:
- Select game type with AI support
- Configure AI players with different strategies
- Create game and verify AI players are included
- Test validation scenarios

### 11. Documentation Updates

#### 11.1 Component Documentation
Add JSDoc comments to all new components and hooks

#### 11.2 User Guide Updates
Update any user-facing documentation to explain AI player features

## Implementation Order

1. **Backend API** (Prerequisites)
   - Add AI strategies endpoint
   - Update GameType interface

2. **Core Frontend Infrastructure**
   - Update GameClient API
   - Create useAIStrategies hook
   - Update type definitions

3. **UI Components**
   - Create AIPlayerConfig component
   - Add styling and visual indicators

4. **Integration**
   - Update PlayerView and AdminView
   - Update context providers
   - Add form validation

5. **Testing and Polish**
   - Add unit and integration tests
   - Add E2E tests
   - Polish UX and styling

## Acceptance Criteria

- [ ] Users can see which game types support AI players
- [ ] Users can add 1-N AI players when creating a game (within player limits)
- [ ] Users can select different AI strategies/difficulties for each AI player
- [ ] Form validates total player count (human + AI ≤ maxPlayers)
- [ ] Form validates at least one human player is included
- [ ] AI players are clearly distinguished in the UI
- [ ] Game creation API calls include AI player configurations
- [ ] Error handling for invalid AI configurations
- [ ] All existing game creation functionality continues to work
- [ ] Comprehensive test coverage for new functionality

## Technical Notes

- Maintain backward compatibility with existing game creation
- Use progressive enhancement - AI features only appear for supported game types
- Ensure responsive design for AI configuration UI
- Follow existing code patterns and styling conventions
- Handle loading states gracefully when fetching AI strategies
- Provide meaningful error messages for validation failures