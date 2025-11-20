# Design Document

## Overview

The Web UX is a browser-based interface for the Async Boardgame Service, providing two primary views: an Admin View for game management and testing, and a Player View for gameplay. The application is built as a single-page application (SPA) that communicates with the existing REST API. The design emphasizes simplicity, ease of testing, and responsive layout across devices.

### Key Design Goals

1. Enable single-user testing of multi-player games through player impersonation
2. Provide clear separation between admin and player interfaces
3. Minimize external dependencies and complexity
4. Support responsive design for various screen sizes
5. Handle API errors gracefully with user-friendly messages

## Architecture

### Technology Stack

- **Frontend Framework**: React 18 with functional components and hooks
- **Build Tool**: Vite for fast development and optimized production builds
- **Styling**: CSS Modules with Flexbox/Grid for responsive layouts
- **HTTP Client**: Fetch API wrapped in custom hooks
- **State Management**: React Context API for global state
- **Routing**: React Router for view navigation

### Application Structure

```
web-client/
├── public/
│   └── index.html         # HTML entry point
├── src/
│   ├── main.tsx           # Application entry point
│   ├── App.tsx            # Root component with routing
│   ├── api/
│   │   └── gameClient.ts  # API client wrapper
│   ├── hooks/
│   │   ├── useGameApi.ts  # Custom hook for API calls
│   │   └── useLocalStorage.ts # LocalStorage hook
│   ├── context/
│   │   ├── AdminContext.tsx    # Admin state context
│   │   └── PlayerContext.tsx   # Player state context
│   ├── views/
│   │   ├── AdminView.tsx       # Admin view page
│   │   └── PlayerView.tsx      # Player view page
│   ├── components/
│   │   ├── GameList/
│   │   │   ├── GameList.tsx
│   │   │   └── GameList.module.css
│   │   ├── GameDetail/
│   │   │   ├── GameDetail.tsx
│   │   │   └── GameDetail.module.css
│   │   ├── PlayerPanel/
│   │   │   ├── PlayerPanel.tsx
│   │   │   └── PlayerPanel.module.css
│   │   ├── MoveInput/
│   │   │   ├── MoveInput.tsx
│   │   │   └── MoveInput.module.css
│   │   └── common/
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       └── Toast.tsx
│   ├── types/
│   │   └── game.ts        # TypeScript type definitions
│   ├── utils/
│   │   └── storage.ts     # LocalStorage utilities
│   └── styles/
│       ├── global.css     # Global styles
│       └── variables.css  # CSS variables
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### Deployment Model

The React application is built using Vite and the production bundle is served as static files from the Express server. The existing Express application is extended to serve the built React app:

```javascript
// Serve React app static files
app.use(express.static('web-client/dist'));

// Serve index.html for all non-API routes (SPA routing)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'web-client/dist/index.html'));
  }
});
```

**Development Mode:**
- Run Vite dev server on port 5173
- Proxy API requests to Express server on port 3000
- Hot module replacement for fast development

**Production Mode:**
- Build React app with `npm run build`
- Serve optimized bundle from Express server
- Single deployment artifact

## Components and Interfaces

### 1. API Client (`gameClient.ts`)

Wraps all REST API calls with consistent error handling and response parsing.

**Interface:**
```typescript
export class GameClient {
  constructor(private baseUrl: string = '/api') {}
  
  // Game Management
  async getGameTypes(): Promise<GameType[]>
  async createGame(gameType: string, config: GameConfig): Promise<GameState>
  async getGame(gameId: string): Promise<GameState>
  async listGames(filters?: GameFilters): Promise<GameListResponse>
  async joinGame(gameId: string, player: Player): Promise<GameState>
  async deleteGame(gameId: string): Promise<void>
  
  // Gameplay
  async makeMove(gameId: string, playerId: string, move: Move, version: number): Promise<GameState>
  async getMoveHistory(gameId: string): Promise<MoveHistoryEntry[]>
  
  // Rendering
  getBoardSvgUrl(gameId: string): string
  getBoardPngUrl(gameId: string): string
}
```

**Custom Hook (`useGameApi.ts`):**
```typescript
export function useGameApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const client = useMemo(() => new GameClient(), []);
  
  const execute = async <T>(apiCall: () => Promise<T>): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiCall();
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  return { client, loading, error, execute };
}
```

**Error Handling:**
- Wraps fetch calls with try-catch
- Parses API error responses
- Returns typed error objects
- Handles network failures gracefully
- Integrates with React error boundaries

### 2. Admin View (`AdminView.tsx`)

Main React component for the admin interface.

**Responsibilities:**
- Display game list with filtering
- Show game details and board rendering
- Manage player impersonation state
- Handle game creation and deletion
- Coordinate between child components

**Context State (`AdminContext.tsx`):**
```typescript
interface AdminContextState {
  games: GameState[];
  selectedGame: GameState | null;
  impersonatedPlayer: string | null;
  filter: 'all' | 'active' | 'completed';
  autoRefresh: boolean;
}

interface AdminContextActions {
  loadGames: () => Promise<void>;
  selectGame: (gameId: string) => Promise<void>;
  createTestGame: (gameType: string) => Promise<void>;
  addTestPlayer: (gameId: string, playerName: string) => Promise<void>;
  impersonatePlayer: (playerId: string) => void;
  deleteGame: (gameId: string) => Promise<void>;
  setFilter: (filter: 'all' | 'active' | 'completed') => void;
  toggleAutoRefresh: () => void;
}
```

**Component Structure:**
```tsx
export function AdminView() {
  const { games, selectedGame, filter } = useAdminContext();
  
  return (
    <div className={styles.adminView}>
      <header>
        <h1>Admin View</h1>
        <FilterControls />
        <RefreshButton />
      </header>
      <div className={styles.content}>
        <aside className={styles.sidebar}>
          <GameList games={games} filter={filter} />
        </aside>
        <main className={styles.main}>
          {selectedGame ? (
            <>
              <GameDetail game={selectedGame} />
              <PlayerPanel game={selectedGame} />
            </>
          ) : (
            <EmptyState />
          )}
        </main>
      </div>
    </div>
  );
}
```

### 3. Player View (`PlayerView.tsx`)

Main React component for the player interface.

**Responsibilities:**
- Handle game creation and joining
- Display game board and state
- Accept and submit player moves
- Show move history and player list
- Manage player session (stored player ID)

**Context State (`PlayerContext.tsx`):**
```typescript
interface PlayerContextState {
  currentGame: GameState | null;
  playerId: string | null;
  playerName: string | null;
  pendingMove: Move | null;
}

interface PlayerContextActions {
  createGame: (gameType: string, playerName: string) => Promise<void>;
  joinGame: (gameId: string, playerName: string) => Promise<void>;
  loadGame: (gameId: string) => Promise<void>;
  submitMove: (move: Move) => Promise<void>;
  refreshGame: () => Promise<void>;
  setPendingMove: (move: Move | null) => void;
}
```

**Component Structure:**
```tsx
export function PlayerView() {
  const { currentGame, playerId, playerName } = usePlayerContext();
  
  if (!currentGame) {
    return <GameSetup />;
  }
  
  return (
    <div className={styles.playerView}>
      <header>
        <h1>Welcome, {playerName}</h1>
        <RefreshButton />
      </header>
      <main className={styles.content}>
        <GameDetail game={currentGame} showAdminControls={false} />
        <MoveInput 
          gameType={currentGame.gameType}
          gameState={currentGame}
          playerId={playerId}
          enabled={isPlayerTurn(currentGame, playerId)}
        />
      </main>
    </div>
  );
}
```

### 4. Game List Component (`GameList.tsx`)

Displays a filterable list of games.

**Props:**
```typescript
interface GameListProps {
  games: GameState[];
  filter: 'all' | 'active' | 'completed';
  onSelect: (gameId: string) => void;
  onDelete: (gameId: string) => void;
}
```

**Component:**
```tsx
export function GameList({ games, filter, onSelect, onDelete }: GameListProps) {
  const filteredGames = useMemo(() => {
    return games.filter(game => {
      if (filter === 'all') return true;
      if (filter === 'active') return game.lifecycle === 'active';
      if (filter === 'completed') return game.lifecycle === 'completed';
      return true;
    });
  }, [games, filter]);
  
  return (
    <div className={styles.gameList}>
      {filteredGames.map(game => (
        <GameListItem 
          key={game.gameId}
          game={game}
          onSelect={onSelect}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
```

**Rendering:**
- Card layout showing game metadata
- Delete button for each game
- Click to select and view details
- Empty state when no games match filter

### 5. Game Detail Component (`GameDetail.tsx`)

Shows detailed information about a selected game.

**Props:**
```typescript
interface GameDetailProps {
  game: GameState;
  showAdminControls?: boolean;
  onRefresh?: () => void;
}
```

**Component:**
```tsx
export function GameDetail({ game, showAdminControls = false, onRefresh }: GameDetailProps) {
  const boardSvgUrl = useMemo(() => {
    return `/api/games/${game.gameId}/board.svg`;
  }, [game.gameId]);
  
  return (
    <div className={styles.gameDetail}>
      <GameMetadata game={game} />
      <BoardDisplay svgUrl={boardSvgUrl} />
      <PlayerList players={game.players} currentPlayerIndex={game.currentPlayerIndex} />
      <MoveHistory moves={game.moveHistory} />
      {showAdminControls && <AdminControls game={game} />}
    </div>
  );
}
```

**Rendering:**
- Game metadata (ID, type, status, turn)
- Board visualization (SVG embed with auto-refresh)
- Player list with turn indicator
- Move history with scroll
- Admin controls (if enabled)

### 6. Player Panel Component (`PlayerPanel.tsx`)

Admin-only component for player impersonation.

**Props:**
```typescript
interface PlayerPanelProps {
  game: GameState;
  impersonatedPlayer: string | null;
  onImpersonate: (playerId: string) => void;
  onAddPlayer: (name: string) => Promise<void>;
}
```

**Component:**
```tsx
export function PlayerPanel({ game, impersonatedPlayer, onImpersonate, onAddPlayer }: PlayerPanelProps) {
  const [newPlayerName, setNewPlayerName] = useState('');
  
  const handleAddPlayer = async () => {
    if (newPlayerName.trim()) {
      await onAddPlayer(newPlayerName);
      setNewPlayerName('');
    }
  };
  
  return (
    <div className={styles.playerPanel}>
      <h3>Player Impersonation</h3>
      <div className={styles.playerList}>
        {game.players.map(player => (
          <PlayerImpersonationItem
            key={player.id}
            player={player}
            isImpersonated={player.id === impersonatedPlayer}
            onImpersonate={onImpersonate}
          />
        ))}
      </div>
      <div className={styles.addPlayer}>
        <input
          type="text"
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
          placeholder="New player name"
        />
        <Button onClick={handleAddPlayer}>Add Player</Button>
      </div>
      {impersonatedPlayer && (
        <MoveInput
          gameType={game.gameType}
          gameState={game}
          playerId={impersonatedPlayer}
          enabled={game.players[game.currentPlayerIndex]?.id === impersonatedPlayer}
        />
      )}
    </div>
  );
}
```

**Rendering:**
- List of all players in game
- "Impersonate" button for each player
- "Add Player" form
- Visual indicator of impersonated player
- Move controls for impersonated player

### 7. Move Input Component (`MoveInput.tsx`)

Game-specific move input interface.

**Props:**
```typescript
interface MoveInputProps {
  gameType: string;
  gameState: GameState;
  playerId: string;
  enabled: boolean;
  onSubmit: (move: Move) => Promise<void>;
}
```

**Component:**
```tsx
export function MoveInput({ gameType, gameState, playerId, enabled, onSubmit }: MoveInputProps) {
  const [pendingMove, setPendingMove] = useState<Move | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    if (!pendingMove || !enabled) return;
    
    setSubmitting(true);
    try {
      await onSubmit(pendingMove);
      setPendingMove(null);
    } finally {
      setSubmitting(false);
    }
  };
  
  // Render game-specific input based on gameType
  const InputComponent = getMoveInputComponent(gameType);
  
  return (
    <div className={styles.moveInput}>
      <h3>Make Your Move</h3>
      {enabled ? (
        <>
          <InputComponent
            gameState={gameState}
            onMoveChange={setPendingMove}
          />
          <Button 
            onClick={handleSubmit} 
            disabled={!pendingMove || submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Move'}
          </Button>
        </>
      ) : (
        <p>Not your turn</p>
      )}
    </div>
  );
}
```

**Game-Specific Inputs:**
- `TicTacToeMoveInput`: Clickable 3x3 grid
- Future games can implement their own input components

**Rendering:**
- Game-specific input controls
- Submit button with loading state
- Validation feedback
- Disabled state when not player's turn

## Data Models

### TypeScript Type Definitions (`types/game.ts`)

```typescript
export interface GameState {
  gameId: string;
  gameType: string;
  lifecycle: 'created' | 'waiting_for_players' | 'active' | 'completed' | 'abandoned';
  players: Player[];
  currentPlayerIndex: number;
  phase: string;
  board: Record<string, any>;
  moveHistory: MoveHistoryEntry[];
  metadata: Record<string, any>;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Player {
  id: string;
  name: string;
}

export interface MoveHistoryEntry {
  playerId: string;
  timestamp: string;
  action: string;
  parameters: Record<string, any>;
}

export interface Move {
  action: string;
  parameters: Record<string, any>;
}

export interface GameType {
  type: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
}

export interface GameConfig {
  players?: Player[];
  customSettings?: Record<string, any>;
}

export interface GameFilters {
  playerId?: string;
  gameType?: string;
  lifecycle?: string;
  page?: number;
  pageSize?: number;
}

export interface GameListResponse {
  items: GameState[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

### Local Storage Schema

```typescript
interface LocalStorageSchema {
  // Player View - persist player identity
  'player.id': string;
  'player.name': string;
  'player.currentGame': string;
  
  // Admin View - persist preferences
  'admin.filter': 'all' | 'active' | 'completed';
  'admin.autoRefresh': boolean;
}
```

## User Interface Design

### Admin View Layout

```
+----------------------------------------------------------+
| [Admin View]                                    [Refresh] |
+----------------------------------------------------------+
| [All] [Active] [Completed]                  [Create Game]|
+----------------------------------------------------------+
|                          |                                |
|  Game List               |  Game Detail                   |
|  +-----------------+     |  +-------------------------+   |
|  | Game ID: g-123  |     |  | Game: g-123             |   |
|  | Type: tic-tac-toe     |  | Type: tic-tac-toe       |   |
|  | Players: 2/2    |     |  | Status: active          |   |
|  | Turn: 3         |     |  | Turn: 3 (Player 2)      |   |
|  | [Delete]        |     |  +-------------------------+   |
|  +-----------------+     |  |                         |   |
|  | Game ID: g-124  |     |  |   [Board SVG Display]   |   |
|  | ...             |     |  |                         |   |
|  +-----------------+     |  +-------------------------+   |
|                          |  Player Impersonation Panel    |
|                          |  +-------------------------+   |
|                          |  | Player 1: Alice         |   |
|                          |  | [Impersonate] [Active]  |   |
|                          |  | Player 2: Bob           |   |
|                          |  | [Impersonate]           |   |
|                          |  | [Add Player]            |   |
|                          |  +-------------------------+   |
|                          |  Move Input (if impersonating) |
|                          |  +-------------------------+   |
|                          |  | [Move controls]         |   |
|                          |  | [Submit Move]           |   |
|                          |  +-------------------------+   |
|                          |  Move History                  |
|                          |  +-------------------------+   |
|                          |  | Turn 1: Player 1 -> (0,0)|  |
|                          |  | Turn 2: Player 2 -> (1,1)|  |
|                          |  +-------------------------+   |
+----------------------------------------------------------+
```

### Player View Layout

```
+----------------------------------------------------------+
| [Player View]                                             |
+----------------------------------------------------------+
| Welcome, [Player Name]                          [Refresh] |
+----------------------------------------------------------+
|                                                            |
|  [Create New Game] [Join Existing Game]                   |
|                                                            |
|  +-----------------------------------------------------+  |
|  | Game: g-123                                         |  |
|  | Type: tic-tac-toe                                   |  |
|  | Your turn: Yes / No                                 |  |
|  +-----------------------------------------------------+  |
|  |                                                     |  |
|  |           [Board SVG Display]                       |  |
|  |                                                     |  |
|  +-----------------------------------------------------+  |
|  | Players:                                            |  |
|  | 1. Alice (You) [Current Turn]                       |  |
|  | 2. Bob                                              |  |
|  +-----------------------------------------------------+  |
|  | Make Your Move:                                     |  |
|  | [Move input controls]                               |  |
|  | [Submit Move]                                       |  |
|  +-----------------------------------------------------+  |
|  | Move History:                                       |  |
|  | Turn 1: Alice -> (0,0)                              |  |
|  | Turn 2: Bob -> (1,1)                                |  |
|  +-----------------------------------------------------+  |
|                                                            |
+----------------------------------------------------------+
```

### Responsive Breakpoints

- **Desktop (1024px+)**: Two-column layout with sidebar
- **Tablet (768px-1023px)**: Single column with collapsible sections
- **Mobile (<768px)**: Stacked layout with simplified controls

## Error Handling

### Error Display Strategy

1. **Toast Notifications**: Brief, auto-dismissing messages for transient errors
2. **Inline Errors**: Form validation and move errors shown inline
3. **Modal Dialogs**: Critical errors requiring user acknowledgment
4. **Retry Logic**: Automatic retry for network failures (up to 3 attempts)

### Error Categories

**Network Errors:**
- Display: "Unable to connect to server. Please check your connection."
- Action: Retry button

**Validation Errors:**
- Display: Inline with specific field/control
- Action: User corrects input

**Game State Errors:**
- Display: Toast notification with error message
- Action: Auto-refresh game state

**Concurrency Errors (409):**
- Display: "Game state changed. Refreshing..."
- Action: Auto-refresh and allow retry

## Dependencies

### Core Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
```

## Testing Strategy

### Manual Testing Workflow

The admin view is specifically designed to facilitate manual testing:

1. **Create Test Game**
   - Click "Create Game" in admin view
   - Select game type (e.g., tic-tac-toe)
   - Game is created with admin as first player

2. **Add Test Players**
   - Click "Add Player" in player panel
   - Enter player name
   - Player is automatically joined to game

3. **Test Gameplay**
   - Select player to impersonate
   - Make move using move controls
   - Switch to next player
   - Repeat until game completion

4. **Verify Rendering**
   - Board updates after each move
   - Move history displays correctly
   - Game status updates appropriately

### Browser Testing

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

### API Integration Testing

All API calls should be tested through the UI:
- Game creation with various configurations
- Joining games with multiple players
- Making valid and invalid moves
- Handling concurrent updates
- Board rendering for different game states

## Security Considerations

### Current Limitations

The current design has no authentication or authorization:
- Player IDs are client-generated and trusted
- Any user can impersonate any player
- No session management or access control

### Future Enhancements

For production deployment, consider:
- User authentication (OAuth, JWT)
- Session management
- Player authorization checks
- Rate limiting
- Input sanitization
- CSRF protection

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**: Load game details only when selected
2. **Caching**: Cache game list and refresh periodically
3. **Debouncing**: Debounce refresh requests
4. **Image Optimization**: Use SVG for board rendering (smaller than PNG)
5. **Minimal Re-renders**: Update only changed DOM elements

### Auto-Refresh

- Admin view: Optional auto-refresh every 5 seconds
- Player view: Manual refresh button (avoid polling)
- Pause auto-refresh when user is interacting with controls

## Accessibility

### WCAG 2.1 Compliance

- Semantic HTML elements
- ARIA labels for interactive controls
- Keyboard navigation support
- Sufficient color contrast (4.5:1 minimum)
- Focus indicators on all interactive elements
- Screen reader friendly error messages

### Keyboard Shortcuts

- `Tab`: Navigate between controls
- `Enter`: Submit forms/make moves
- `Escape`: Close modals/cancel actions
- `R`: Refresh current view (when focused)

## Future Enhancements

### Phase 2 Features

1. **Real-time Updates**: WebSocket support for live game updates
2. **Game Chat**: Player communication within games
3. **Game History**: View completed games and replay moves
4. **Statistics**: Player win/loss records and game analytics
5. **Themes**: Customizable UI themes and board styles
6. **Notifications**: Browser notifications for turn reminders

### Phase 3 Features

1. **Matchmaking**: Automatic player pairing
2. **Tournaments**: Multi-game tournament support
3. **Spectator Mode**: Watch games without participating
4. **Game Recording**: Export/import game states
5. **AI Opponents**: Computer players for testing
