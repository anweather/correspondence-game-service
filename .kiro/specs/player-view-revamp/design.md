# Design Document

## Overview

This design document specifies the architecture and implementation approach for revamping the Player View in the Async Boardgame Service. The revamp adds game discovery (lobby), user profiles with display names, player statistics, leaderboards, game invitations, turn notifications, and real-time updates via WebSocket. The design follows hexagonal architecture on the backend and established React patterns on the frontend.

### Key Design Goals

1. Fix authentication loading state bug for smooth user experience
2. Add lobby view for game discovery with filtering
3. Implement privacy-preserving display name system
4. Add player statistics and leaderboard functionality
5. Implement game invitation system
6. Add turn notification system with pluggable notification channels
7. Implement real-time game updates via WebSocket
8. Restrict admin view to authorized users only
9. Maintain responsive design across all views

## Architecture

### Backend Architecture (Hexagonal)

Following hexagonal architecture, we'll add new components in appropriate layers:

**Domain Layer** (`src/domain`):
- `PlayerProfile` model with display name
- `GameInvitation` model
- `PlayerStats` model
- `NotificationService` interface (port)
- `WebSocketService` interface (port)

**Application Layer** (`src/application/services`):
- `PlayerProfileService` - manage player profiles and display names
- `StatsService` - calculate and retrieve player statistics
- `InvitationService` - manage game invitations
- `NotificationService` - coordinate turn notifications
- `WebSocketManager` - manage WebSocket connections and subscriptions

**Infrastructure Layer** (`src/infrastructure`):
- `PostgresPlayerProfileRepository` - persist player profiles
- `PostgresStatsRepository` - query game statistics
- `PostgresInvitationRepository` - persist invitations
- `InAppNotificationService` - in-app notification implementation
- `WebSocketServer` - WebSocket server implementation

**Adapters Layer** (`src/adapters`):
- `playerProfileRoutes.ts` - REST endpoints for profiles
- `statsRoutes.ts` - REST endpoints for statistics
- `invitationRoutes.ts` - REST endpoints for invitations
- `websocketAdapter.ts` - WebSocket connection handler

### Frontend Architecture

Following established React patterns:

**Context** (`web-client/src/context`):
- Update `PlayerContext` with profile and display name management
- Add `WebSocketContext` for real-time updates
- Add `NotificationContext` for in-app notifications

**Views** (`web-client/src/views`):
- `LobbyView.tsx` - game discovery and filtering
- `ProfileView.tsx` - edit player profile and settings
- `StatsView.tsx` - player statistics and history
- `LeaderboardView.tsx` - global player rankings
- Update `PlayerView.tsx` - fix auth bug, add navigation

**Components** (`web-client/src/components`):
- `Navigation/Header.tsx` - persistent navigation header
- `Lobby/GameCard.tsx` - game card in lobby
- `Lobby/GameFilters.tsx` - filter controls
- `Profile/ProfileForm.tsx` - edit profile form
- `Stats/StatsOverview.tsx` - statistics dashboard
- `Stats/GameHistory.tsx` - game history list
- `Leaderboard/LeaderboardTable.tsx` - ranked player list
- `Invitations/InviteModal.tsx` - invite players modal
- `Notifications/NotificationBell.tsx` - notification indicator

**Hooks** (`web-client/src/hooks`):
- `useWebSocket.ts` - WebSocket connection management
- `useNotifications.ts` - notification state management
- `useProfile.ts` - profile data management


## Data Models

### Domain Models

#### PlayerProfile
```typescript
interface PlayerProfile {
  userId: string;           // Clerk user ID
  displayName: string;      // Public display name
  createdAt: Date;
  updatedAt: Date;
}
```

#### GameMetadata (extends existing GameState)
```typescript
interface GameMetadata {
  gameName: string;         // Required game name
  gameDescription?: string; // Optional description (max 500 chars)
  createdBy: string;        // User ID of creator
}
```

#### GameInvitation
```typescript
interface GameInvitation {
  invitationId: string;
  gameId: string;
  inviterId: string;        // User ID of inviter
  inviteeId: string;        // User ID of invitee
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: Date;
  respondedAt?: Date;
}
```

#### PlayerStats
```typescript
interface PlayerStats {
  userId: string;
  gameType?: string;        // null for overall stats
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;          // Calculated: wins / (wins + losses)
  totalTurns: number;
  averageTurnsPerGame: number;
}
```

#### LeaderboardEntry
```typescript
interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
}
```

#### TurnNotification
```typescript
interface TurnNotification {
  notificationId: string;
  userId: string;
  gameId: string;
  createdAt: Date;
  sentAt?: Date;
  status: 'pending' | 'sent' | 'failed';
}
```

### Database Schema Changes

#### New Tables

**player_profiles**
```sql
CREATE TABLE player_profiles (
  user_id VARCHAR(255) PRIMARY KEY,
  display_name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_player_profiles_display_name ON player_profiles(display_name);
```

**game_invitations**
```sql
CREATE TABLE game_invitations (
  invitation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id VARCHAR(255) NOT NULL REFERENCES games(game_id) ON DELETE CASCADE,
  inviter_id VARCHAR(255) NOT NULL,
  invitee_id VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMP,
  CONSTRAINT fk_inviter FOREIGN KEY (inviter_id) REFERENCES player_profiles(user_id),
  CONSTRAINT fk_invitee FOREIGN KEY (invitee_id) REFERENCES player_profiles(user_id)
);

CREATE INDEX idx_invitations_invitee ON game_invitations(invitee_id, status);
CREATE INDEX idx_invitations_game ON game_invitations(game_id);
```

**turn_notifications**
```sql
CREATE TABLE turn_notifications (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  game_id VARCHAR(255) NOT NULL REFERENCES games(game_id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES player_profiles(user_id)
);

CREATE INDEX idx_notifications_user_status ON turn_notifications(user_id, status);
CREATE INDEX idx_notifications_game ON turn_notifications(game_id);
```

#### Modified Tables

**games** (add metadata columns)
```sql
ALTER TABLE games ADD COLUMN game_name VARCHAR(100);
ALTER TABLE games ADD COLUMN game_description TEXT;
ALTER TABLE games ADD COLUMN created_by VARCHAR(255);
```


## Components and Interfaces

### Backend Components

#### 1. PlayerProfileService

**Responsibilities:**
- Create and manage player profiles
- Generate unique display names
- Validate display name format and uniqueness

**Interface:**
```typescript
class PlayerProfileService {
  async createProfile(userId: string, displayName?: string): Promise<PlayerProfile>
  async getProfile(userId: string): Promise<PlayerProfile | null>
  async updateDisplayName(userId: string, newDisplayName: string): Promise<PlayerProfile>
  async generateDefaultDisplayName(): Promise<string>
  async validateDisplayName(displayName: string): Promise<boolean>
}
```

**Display Name Generation:**
- Format: `player{number}` where number is sequential
- Check uniqueness in database
- Retry with incremented number if collision occurs

#### 2. StatsService

**Responsibilities:**
- Calculate player statistics from game history
- Aggregate stats by game type
- Generate leaderboard rankings

**Interface:**
```typescript
class StatsService {
  async getPlayerStats(userId: string, gameType?: string): Promise<PlayerStats>
  async getLeaderboard(gameType?: string, limit?: number): Promise<LeaderboardEntry[]>
  async getGameHistory(userId: string, filters?: GameHistoryFilters): Promise<GameState[]>
  private calculateWinRate(wins: number, losses: number): number
}
```

**Statistics Calculation:**
- Query completed games from repository
- Count wins/losses based on winner field
- Calculate win rate: wins / (wins + losses), handle division by zero
- Aggregate total turns from move history

#### 3. InvitationService

**Responsibilities:**
- Create and manage game invitations
- Validate invitation recipients
- Handle invitation responses

**Interface:**
```typescript
class InvitationService {
  async createInvitation(gameId: string, inviterId: string, inviteeId: string): Promise<GameInvitation>
  async getInvitations(userId: string, status?: InvitationStatus): Promise<GameInvitation[]>
  async respondToInvitation(invitationId: string, accept: boolean): Promise<GameInvitation>
  async expireOldInvitations(): Promise<void>
}
```

**Invitation Flow:**
1. Validate game exists and inviter is a participant
2. Validate invitee exists and is not already in game
3. Create invitation record
4. Optionally trigger notification to invitee
5. On acceptance, add invitee to game via GameManagerService

#### 4. NotificationService (Port)

**Responsibilities:**
- Define interface for notification channels
- Coordinate notification delivery
- Track notification history

**Interface:**
```typescript
interface INotificationChannel {
  send(userId: string, notification: Notification): Promise<void>
  getName(): string
}

class NotificationService {
  constructor(private channels: INotificationChannel[])
  
  async notifyTurn(userId: string, gameId: string, delayMs?: number): Promise<void>
  async notifyInvitation(userId: string, invitation: GameInvitation): Promise<void>
  private async scheduleNotification(notification: TurnNotification, delayMs: number): Promise<void>
}
```

**Notification Channels:**
- `InAppNotificationChannel` - store in database for UI display
- Future: `EmailNotificationChannel`, `PushNotificationChannel`, etc.

#### 5. WebSocketManager

**Responsibilities:**
- Manage WebSocket connections
- Handle client subscriptions to games
- Broadcast game state updates

**Interface:**
```typescript
class WebSocketManager {
  private connections: Map<string, WebSocket>
  private subscriptions: Map<string, Set<string>> // gameId -> Set<userId>
  
  handleConnection(ws: WebSocket, userId: string): void
  handleDisconnection(userId: string): void
  subscribe(userId: string, gameId: string): void
  unsubscribe(userId: string, gameId: string): void
  broadcastGameUpdate(gameId: string, gameState: GameState): void
}
```

**WebSocket Protocol:**
```typescript
// Client -> Server messages
type ClientMessage = 
  | { type: 'subscribe', gameId: string }
  | { type: 'unsubscribe', gameId: string }
  | { type: 'ping' }

// Server -> Client messages
type ServerMessage =
  | { type: 'game_update', gameId: string, gameState: GameState }
  | { type: 'turn_notification', gameId: string }
  | { type: 'invitation', invitation: GameInvitation }
  | { type: 'pong' }
```


### Frontend Components

#### 1. Navigation Header

**Component:** `Navigation/Header.tsx`

**Responsibilities:**
- Display persistent navigation across all views
- Show player display name and avatar
- Provide links to main views
- Show notification indicator

**Props:**
```typescript
interface HeaderProps {
  currentView: string;
}
```

**Layout:**
```
+----------------------------------------------------------+
| [Logo] Home | Lobby | My Games | Stats | Leaderboard    |
|                                    [🔔 3] [Profile ▼]    |
+----------------------------------------------------------+
```

#### 2. Lobby View

**Component:** `LobbyView.tsx`

**Responsibilities:**
- Display browsable list of available games
- Provide filtering controls
- Allow joining games from list

**State:**
```typescript
interface LobbyState {
  games: GameState[];
  filters: {
    gameType?: string;
    playerCount?: string;
    state?: string;
  };
  loading: boolean;
}
```

**Layout:**
```
+----------------------------------------------------------+
| Lobby                                                     |
+----------------------------------------------------------+
| Filters: [Game Type ▼] [Players ▼] [State ▼]  [Search]  |
+----------------------------------------------------------+
| +----------------------+  +----------------------+        |
| | Tic-Tac-Toe Battle   |  | Connect Four Fun     |        |
| | Type: tic-tac-toe    |  | Type: connect-four   |        |
| | Players: 1/2         |  | Players: 2/2         |        |
| | State: waiting       |  | State: active        |        |
| | "Quick game!"        |  | "Competitive match"  |        |
| | [Join Game]          |  | [Spectate]           |        |
| +----------------------+  +----------------------+        |
+----------------------------------------------------------+
```

#### 3. Profile View

**Component:** `ProfileView.tsx`

**Responsibilities:**
- Display current profile information
- Allow editing display name
- Show account settings

**Form:**
```typescript
interface ProfileFormData {
  displayName: string;
  notificationPreferences: {
    turnNotifications: boolean;
    invitationNotifications: boolean;
    notificationDelay: number; // minutes
  };
}
```

#### 4. Stats View

**Component:** `StatsView.tsx`

**Responsibilities:**
- Display player statistics overview
- Show game history
- Provide filtering by game type

**Layout:**
```
+----------------------------------------------------------+
| Your Statistics                                           |
+----------------------------------------------------------+
| Overall Stats:                                            |
| Total Games: 42 | Wins: 28 | Losses: 12 | Win Rate: 70% |
| Total Turns: 1,234                                        |
+----------------------------------------------------------+
| By Game Type: [All ▼]                                    |
| Tic-Tac-Toe: 20 games, 15 wins, 75% win rate            |
| Connect Four: 22 games, 13 wins, 59% win rate           |
+----------------------------------------------------------+
| Game History:                                             |
| +------------------------------------------------------+ |
| | Tic-Tac-Toe vs player42 | Won | 5 turns | 2 days ago| |
| | Connect Four vs alice   | Lost| 12 turns| 3 days ago| |
| +------------------------------------------------------+ |
+----------------------------------------------------------+
```

#### 5. Leaderboard View

**Component:** `LeaderboardView.tsx`

**Responsibilities:**
- Display ranked list of players
- Allow filtering by game type
- Highlight current player

**Layout:**
```
+----------------------------------------------------------+
| Leaderboard                                               |
+----------------------------------------------------------+
| Filter: [All Games ▼]                                    |
+----------------------------------------------------------+
| Rank | Player      | Games | Wins | Losses | Win Rate   |
|------|-------------|-------|------|--------|-------------|
| 1    | alice       | 50    | 42   | 8      | 84.0%      |
| 2    | bob         | 45    | 35   | 10     | 77.8%      |
| 3    | player42    | 42    | 28   | 12     | 70.0% ← You|
| 4    | charlie     | 38    | 25   | 13     | 65.8%      |
+----------------------------------------------------------+
```

#### 6. WebSocket Context

**Component:** `WebSocketContext.tsx`

**Responsibilities:**
- Establish and maintain WebSocket connection
- Handle reconnection logic
- Provide subscription management
- Emit events for game updates

**Interface:**
```typescript
interface WebSocketContextValue {
  connected: boolean;
  subscribe: (gameId: string) => void;
  unsubscribe: (gameId: string) => void;
  onGameUpdate: (callback: (gameState: GameState) => void) => void;
  onTurnNotification: (callback: (gameId: string) => void) => void;
}
```

**Connection Management:**
- Connect on user authentication
- Reconnect with exponential backoff on disconnect
- Fall back to polling if WebSocket unavailable
- Clean up subscriptions on unmount

#### 7. Notification System

**Component:** `NotificationContext.tsx`

**Responsibilities:**
- Manage in-app notifications
- Display notification bell with count
- Show notification list

**Interface:**
```typescript
interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  clearAll: () => void;
}

interface Notification {
  id: string;
  type: 'turn' | 'invitation' | 'game_complete';
  gameId: string;
  message: string;
  read: boolean;
  createdAt: Date;
}
```


## API Endpoints

### Player Profile Endpoints

```
POST   /api/players/profile          - Create player profile
GET    /api/players/profile          - Get current player profile
PUT    /api/players/profile          - Update player profile
GET    /api/players/:userId/profile  - Get player profile by ID (public)
```

### Statistics Endpoints

```
GET    /api/players/stats                    - Get current player stats
GET    /api/players/stats/:gameType          - Get stats for specific game type
GET    /api/players/history                  - Get game history
GET    /api/players/:userId/stats            - Get stats for specific player (public)
```

### Leaderboard Endpoints

```
GET    /api/leaderboard                      - Get overall leaderboard
GET    /api/leaderboard/:gameType            - Get leaderboard for game type
```

### Invitation Endpoints

```
POST   /api/invitations                      - Create invitation
GET    /api/invitations                      - Get player's invitations
PUT    /api/invitations/:id/accept           - Accept invitation
PUT    /api/invitations/:id/decline          - Decline invitation
```

### Game Metadata Endpoints (extend existing)

```
POST   /api/games                            - Create game (add name, description)
GET    /api/games/:id                        - Get game (include metadata)
GET    /api/games                            - List games (include metadata)
```

### WebSocket Endpoint

```
WS     /api/ws                               - WebSocket connection
```

## Authentication and Authorization

### Admin View Authorization

**Implementation:**
- Store admin user IDs in environment variable: `ADMIN_USER_IDS=user_123,user_456`
- Create middleware: `requireAdmin.ts`
- Check user ID against allow-list
- Return 403 Forbidden if not authorized

**Middleware:**
```typescript
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const adminIds = config.adminUserIds.split(',');
  
  if (!adminIds.includes(req.userId)) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  
  next();
}
```

**Frontend:**
- Check admin status on app load
- Hide admin navigation if not authorized
- Redirect to player view if unauthorized access attempted

### WebSocket Authentication

**Implementation:**
- Require authentication token in WebSocket connection
- Validate token using Clerk middleware
- Associate connection with authenticated user ID
- Close connection if authentication fails

```typescript
wss.on('connection', async (ws, req) => {
  const token = extractTokenFromRequest(req);
  const userId = await validateToken(token);
  
  if (!userId) {
    ws.close(1008, 'Unauthorized');
    return;
  }
  
  websocketManager.handleConnection(ws, userId);
});
```

## Error Handling

### Display Name Conflicts

**Scenario:** User tries to set display name that's already taken

**Handling:**
- Validate uniqueness before saving
- Return 409 Conflict with error message
- Frontend displays inline error: "Display name already taken"
- Suggest alternatives: "player123", "player124", etc.

### WebSocket Connection Failures

**Scenario:** WebSocket connection cannot be established

**Handling:**
- Attempt reconnection with exponential backoff
- After 3 failed attempts, fall back to polling
- Display connection status indicator in UI
- Show warning: "Real-time updates unavailable, using polling"

### Notification Delivery Failures

**Scenario:** Notification channel fails to deliver

**Handling:**
- Log failure with error details
- Mark notification as failed in database
- Retry with exponential backoff (max 3 attempts)
- Don't block game flow on notification failures

## Performance Considerations

### Statistics Calculation

**Challenge:** Calculating stats for leaderboard can be expensive

**Optimization:**
- Create materialized view or cached table for stats
- Update stats incrementally when games complete
- Use database indexes on winner, game_type, lifecycle
- Implement pagination for leaderboard (50 entries per page)

### WebSocket Scalability

**Challenge:** Managing many concurrent WebSocket connections

**Optimization:**
- Use connection pooling
- Implement heartbeat/ping-pong to detect dead connections
- Clean up stale connections periodically
- Consider Redis pub/sub for multi-server deployments (future)

### Real-time Update Frequency

**Challenge:** Broadcasting every state change can be expensive

**Optimization:**
- Only broadcast on significant events (move made, game complete)
- Debounce rapid updates (max 1 update per second per game)
- Send delta updates instead of full game state when possible


## Testing Strategy

### Unit Testing

**Backend:**
- `PlayerProfileService`: Test display name generation, validation, uniqueness
- `StatsService`: Test statistics calculation, win rate edge cases (0 games, all wins, all losses)
- `InvitationService`: Test invitation creation, acceptance, expiration
- `NotificationService`: Test notification scheduling, channel coordination
- `WebSocketManager`: Test subscription management, broadcast logic

**Frontend:**
- `LobbyView`: Test filtering logic, game card rendering
- `ProfileView`: Test form validation, display name updates
- `StatsView`: Test statistics display, game history filtering
- `LeaderboardView`: Test ranking display, current player highlighting
- `WebSocketContext`: Test connection management, reconnection logic
- `NotificationContext`: Test notification state management

### Integration Testing

**Backend:**
- Test complete invitation flow: create → notify → accept → join game
- Test statistics calculation from actual game data
- Test WebSocket authentication and subscription
- Test admin authorization middleware

**Frontend:**
- Test navigation between views
- Test WebSocket connection and game update handling
- Test notification display and interaction
- Test profile update flow end-to-end

### Manual Testing

**Authentication Flow:**
1. Sign in as new user → verify default display name generated
2. Refresh page → verify no "Setting up account" flash
3. Sign out and back in → verify profile persists

**Lobby Flow:**
1. Create game with name and description
2. View game in lobby
3. Filter by game type, player count, state
4. Join game from lobby

**Profile Flow:**
1. Navigate to profile
2. Change display name
3. Verify name updates throughout app
4. Try duplicate name → verify error

**Stats Flow:**
1. Play several games
2. View stats page
3. Verify win/loss counts accurate
4. Filter by game type
5. View game history

**Leaderboard Flow:**
1. View leaderboard
2. Verify ranking order
3. Find own position
4. Filter by game type

**Real-time Updates:**
1. Open game in two browsers
2. Make move in browser 1
3. Verify board updates in browser 2 without refresh
4. Disconnect WebSocket → verify fallback to polling

**Notifications:**
1. Create game with two players
2. Make move as player 1
3. Wait for notification delay
4. Verify player 2 receives turn notification

**Admin Authorization:**
1. Try to access admin view as regular user → verify redirect
2. Add user to admin list
3. Verify admin view accessible
4. Verify admin navigation appears

## Migration Strategy

### Database Migrations

**Migration 004: Add player profiles**
```sql
CREATE TABLE player_profiles (
  user_id VARCHAR(255) PRIMARY KEY,
  display_name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_player_profiles_display_name ON player_profiles(display_name);
```

**Migration 005: Add game metadata**
```sql
ALTER TABLE games ADD COLUMN game_name VARCHAR(100);
ALTER TABLE games ADD COLUMN game_description TEXT;
ALTER TABLE games ADD COLUMN created_by VARCHAR(255);
```

**Migration 006: Add invitations**
```sql
CREATE TABLE game_invitations (
  invitation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id VARCHAR(255) NOT NULL REFERENCES games(game_id) ON DELETE CASCADE,
  inviter_id VARCHAR(255) NOT NULL,
  invitee_id VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMP,
  CONSTRAINT fk_inviter FOREIGN KEY (inviter_id) REFERENCES player_profiles(user_id),
  CONSTRAINT fk_invitee FOREIGN KEY (invitee_id) REFERENCES player_profiles(user_id)
);

CREATE INDEX idx_invitations_invitee ON game_invitations(invitee_id, status);
CREATE INDEX idx_invitations_game ON game_invitations(game_id);
```

**Migration 007: Add notifications**
```sql
CREATE TABLE turn_notifications (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  game_id VARCHAR(255) NOT NULL REFERENCES games(game_id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES player_profiles(user_id)
);

CREATE INDEX idx_notifications_user_status ON turn_notifications(user_id, status);
CREATE INDEX idx_notifications_game ON turn_notifications(game_id);
```

### Data Migration

**Existing Users:**
- Run migration script to create profiles for existing users
- Generate default display names: `player1`, `player2`, etc.
- Prompt users to set custom display name on next login

**Existing Games:**
- Backfill game_name with format: `{gameType} Game {id}`
- Leave game_description null
- Set created_by to first player's user ID if available

## Security Considerations

### Display Name Validation

**Rules:**
- Length: 3-50 characters
- Characters: alphanumeric, underscore, hyphen only
- No profanity (implement basic filter)
- No impersonation of system names (admin, system, bot, etc.)

**Implementation:**
```typescript
function validateDisplayName(name: string): boolean {
  if (name.length < 3 || name.length > 50) return false;
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) return false;
  
  const reserved = ['admin', 'system', 'bot', 'moderator'];
  if (reserved.includes(name.toLowerCase())) return false;
  
  return true;
}
```

### WebSocket Security

**Measures:**
- Require authentication for all connections
- Validate user can only subscribe to games they're in
- Rate limit subscription requests
- Implement connection timeout
- Sanitize all messages before broadcasting

### Admin Authorization

**Measures:**
- Store admin IDs in environment variable (not in code)
- Log all admin actions
- Implement audit trail for admin operations
- Consider time-limited admin sessions (future)

## Accessibility

### Keyboard Navigation

- All navigation links accessible via Tab
- Lobby filters accessible via keyboard
- Profile form fully keyboard navigable
- Notification bell accessible via keyboard
- Leaderboard table navigable with arrow keys

### Screen Reader Support

- Proper ARIA labels on all interactive elements
- Announce notification count changes
- Announce game updates in real-time
- Provide text alternatives for visual indicators

### Color Contrast

- Maintain 4.5:1 contrast ratio for all text
- Use patterns in addition to colors for status indicators
- Provide high contrast mode option

## Future Enhancements

### Phase 2 Features

1. **Email Notifications** - Implement email notification channel
2. **Push Notifications** - Add browser push notification support
3. **Game Chat** - Add in-game chat functionality
4. **Friend System** - Add friend lists and friend-only games
5. **Achievements** - Add achievement system and badges

### Phase 3 Features

1. **Tournament System** - Multi-game tournament support
2. **Spectator Mode** - Watch games without participating
3. **Game Replay** - Replay completed games move-by-move
4. **Advanced Stats** - Detailed analytics and charts
5. **Mobile App** - Native mobile application

## Dependencies

### New Backend Dependencies

```json
{
  "dependencies": {
    "ws": "^8.14.0",              // WebSocket server
    "node-cron": "^3.0.2"          // Scheduled notification processing
  },
  "devDependencies": {
    "@types/ws": "^8.5.8"
  }
}
```

### New Frontend Dependencies

```json
{
  "dependencies": {
    "react-router-dom": "^6.20.0"  // Already installed
  }
}
```

No additional frontend dependencies needed - use native WebSocket API.
