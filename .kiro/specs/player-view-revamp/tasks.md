# Implementation Plan

## Phase 1: Database and Domain Layer

- [x] 1. Database migrations
  - [x] 1.1 Create migration 004 for player_profiles table
    - Write SQL migration file with player_profiles table
    - Add display_name unique constraint and index
    - Run migration and verify schema
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [x] 1.2 Create migration 005 for game metadata columns
    - Add game_name, game_description, created_by columns to games table
    - Run migration and verify schema
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [x] 1.3 Create migration 006 for game_invitations table
    - Write SQL migration with foreign key constraints
    - Add indexes for efficient querying
    - Run migration and verify schema
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  - [x] 1.4 Create migration 007 for turn_notifications table
    - Write SQL migration with notification tracking
    - Add indexes for user and game lookups
    - Run migration and verify schema
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 2. Domain models and interfaces (TDD)
  - [x] 2.1 Create PlayerProfile domain model with tests
    - Write tests for PlayerProfile model in tests/unit/domain/PlayerProfile.test.ts
    - Test model creation, validation, display name format
    - Create PlayerProfile model in src/domain/models/PlayerProfile.ts to pass tests
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [x] 2.2 Create GameInvitation domain model with tests
    - Write tests for GameInvitation model
    - Test invitation states, expiration logic
    - Create GameInvitation model to pass tests
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  - [x] 2.3 Create domain interfaces
    - Create IPlayerProfileRepository interface in src/domain/interfaces/
    - Create IInvitationRepository interface
    - Create INotificationChannel interface
    - Create IWebSocketService interface
    - _Requirements: 4.1, 12.1, 13.2, 14.1_

## Phase 2: Backend Infrastructure Layer (TDD)

- [x] 3. PlayerProfile repository (TDD)
  - [x] 3.1 Write tests for PostgresPlayerProfileRepository
    - Write tests in tests/unit/infrastructure/PostgresPlayerProfileRepository.test.ts
    - Test createProfile, getProfile, updateDisplayName
    - Test display name uniqueness constraint
    - Test default name generation
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [x] 3.2 Implement PostgresPlayerProfileRepository
    - Create PostgresPlayerProfileRepository in src/infrastructure/persistence/
    - Implement methods to pass all tests
    - Refactor for code quality
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [-] 4. Invitation repository (TDD)
  - [x] 4.1 Write tests for PostgresInvitationRepository
    - Write tests in tests/unit/infrastructure/PostgresInvitationRepository.test.ts
    - Test createInvitation, getInvitations, updateStatus
    - Test filtering by status
    - Test expiration logic
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  - [x] 4.2 Implement PostgresInvitationRepository
    - Create PostgresInvitationRepository
    - Implement methods to pass all tests
    - Refactor for code quality
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 5. Stats repository (TDD)
  - [x] 5.1 Write tests for PostgresStatsRepository
    - Write tests in tests/unit/infrastructure/PostgresStatsRepository.test.ts
    - Test getPlayerStats with various game states
    - Test win rate calculation edge cases (0 games, all wins, all losses)
    - Test getLeaderboard with ranking
    - Test getGameHistory with filtering
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5_
  - [x] 5.2 Implement PostgresStatsRepository
    - Create PostgresStatsRepository
    - Implement aggregation queries
    - Implement methods to pass all tests
    - Refactor for code quality
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 6. Notification infrastructure (TDD)
  - [x] 6.1 Write tests for InAppNotificationChannel
    - Write tests in tests/unit/infrastructure/InAppNotificationChannel.test.ts
    - Test notification creation and storage
    - Test notification retrieval
    - Test notification status updates
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  - [x] 6.2 Implement InAppNotificationChannel
    - Create InAppNotificationChannel
    - Implement methods to pass all tests
    - Refactor for code quality
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 7. WebSocket server (TDD)
  - [x] 7.1 Write tests for WebSocketManager
    - Write tests in tests/unit/infrastructure/WebSocketManager.test.ts
    - Test connection management
    - Test subscription/unsubscription
    - Test broadcast logic
    - Test connection cleanup
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 15.1, 15.2, 15.3, 15.4, 15.5_
  - [x] 7.2 Implement WebSocketManager
    - Create WebSocketManager in src/infrastructure/websocket/
    - Implement connection handling
    - Implement methods to pass all tests
    - Refactor for code quality
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 15.1, 15.2, 15.3, 15.4, 15.5_


## Phase 3: Backend Application Services (TDD)

- [x] 8. PlayerProfileService (TDD)
  - [x] 8.1 Write tests for PlayerProfileService
    - Write tests in tests/unit/application/PlayerProfileService.test.ts
    - Test createProfile with default name generation
    - Test updateDisplayName with validation
    - Test display name format validation (3-50 chars, alphanumeric + underscore)
    - Test reserved name rejection (admin, system, bot)
    - Test uniqueness handling
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 10.1, 10.2, 10.3, 10.4, 10.5_
  - [x] 8.2 Implement PlayerProfileService
    - Create PlayerProfileService in src/application/services/
    - Implement profile management methods
    - Implement validation logic
    - Implement default name generation (player{number})
    - Implement methods to pass all tests
    - Refactor for code quality
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 9. StatsService (TDD)
  - [x] 9.1 Write tests for StatsService
    - Write tests in tests/unit/application/StatsService.test.ts
    - Test getPlayerStats calculation
    - Test win rate calculation with edge cases
    - Test getLeaderboard ranking logic
    - Test getGameHistory filtering
    - Test per-game-type stats
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5_
  - [x] 9.2 Implement StatsService
    - Create StatsService in src/application/services/
    - Implement statistics calculation
    - Implement leaderboard ranking
    - Implement methods to pass all tests
    - Refactor for code quality
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 10. InvitationService (TDD)
  - [x] 10.1 Write tests for InvitationService
    - Write tests in tests/unit/application/InvitationService.test.ts
    - Test createInvitation with validation
    - Test invitation recipient validation
    - Test respondToInvitation (accept/decline)
    - Test invitation expiration
    - Test duplicate invitation prevention
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  - [x] 10.2 Implement InvitationService
    - Create InvitationService in src/application/services/
    - Implement invitation management
    - Implement validation logic
    - Implement methods to pass all tests
    - Refactor for code quality
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 11. NotificationService (TDD)
  - [x] 11.1 Write tests for NotificationService
    - Write tests in tests/unit/application/NotificationService.test.ts
    - Test turn notification with delay
    - Test notification scheduling
    - Test duplicate notification prevention
    - Test multiple notification channels
    - Test notification failure handling
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  - [x] 11.2 Implement NotificationService
    - Create NotificationService in src/application/services/
    - Implement pluggable notification channels
    - Implement scheduling logic
    - Implement methods to pass all tests
    - Refactor for code quality
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

## Phase 4: Backend REST API (TDD)

- [-] 12. Player profile routes (TDD)
  - [x] 12.1 Write tests for player profile routes
    - Write tests in tests/integration/playerProfileRoutes.test.ts
    - Test POST /api/players/profile (create)
    - Test GET /api/players/profile (current user)
    - Test PUT /api/players/profile (update)
    - Test GET /api/players/:userId/profile (public)
    - Test authentication requirement
    - Test validation errors
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 10.1, 10.2, 10.3, 10.4, 10.5_
  - [x] 12.2 Implement player profile routes
    - Create playerProfileRoutes.ts in src/adapters/rest/
    - Implement all endpoints
    - Add authentication middleware
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 13. Stats routes (TDD)
  - [x] 13.1 Write tests for stats routes
    - Write tests in tests/integration/statsRoutes.test.ts
    - Test GET /api/players/stats
    - Test GET /api/players/stats/:gameType
    - Test GET /api/players/history
    - Test GET /api/players/:userId/stats
    - Test authentication requirement
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  - [x] 13.2 Implement stats routes
    - Create statsRoutes.ts in src/adapters/rest/
    - Implement all endpoints
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 14. Leaderboard routes (TDD)
  - [x] 14.1 Write tests for leaderboard routes
    - Write tests in tests/integration/leaderboardRoutes.test.ts
    - Test GET /api/leaderboard
    - Test GET /api/leaderboard/:gameType
    - Test pagination
    - Test ranking order
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - [x] 14.2 Implement leaderboard routes
    - Create leaderboardRoutes.ts in src/adapters/rest/
    - Implement endpoints with pagination
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 15. Invitation routes (TDD)
  - [x] 15.1 Write tests for invitation routes
    - Write tests in tests/integration/invitationRoutes.test.ts
    - Test POST /api/invitations (create)
    - Test GET /api/invitations (list)
    - Test PUT /api/invitations/:id/accept
    - Test PUT /api/invitations/:id/decline
    - Test authentication and authorization
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  - [x] 15.2 Implement invitation routes
    - Create invitationRoutes.ts in src/adapters/rest/
    - Implement all endpoints
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 16. Update game routes for metadata (TDD)
  - [x] 16.1 Write tests for game metadata
    - Update tests in tests/integration/gameRoutes.test.ts
    - Test POST /api/games with name and description
    - Test GET /api/games includes metadata
    - Test validation (name required, description max length)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 9.1, 9.2, 9.3, 9.4, 9.5_
  - [x] 16.2 Implement game metadata support
    - Update gameRoutes.ts to accept metadata
    - Update GameManagerService to store metadata
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 17. Admin authorization (TDD)
  - [x] 17.1 Write tests for admin middleware
    - Write tests in tests/unit/adapters/rest/auth/requireAdmin.test.ts
    - Test authorized user access
    - Test unauthorized user rejection (403)
    - Test missing authentication
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  - [x] 17.2 Implement admin middleware
    - Create requireAdmin.ts in src/adapters/rest/auth/
    - Read admin IDs from environment variable
    - Implement authorization check
    - Implement to pass all tests
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  - [x] 17.3 Apply admin middleware to routes
    - Add requireAdmin to admin-specific routes
    - Test authorization enforcement
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_


## Phase 5: WebSocket Integration (TDD)

- [x] 18. WebSocket server setup (TDD)
  - [x] 18.1 Write tests for WebSocket adapter
    - Write tests in tests/integration/websocket.test.ts
    - Test WebSocket connection establishment
    - Test authentication requirement
    - Test subscribe/unsubscribe messages
    - Test ping/pong keepalive
    - Test connection cleanup on disconnect
    - _Requirements: 14.1, 15.1, 15.2, 15.3, 15.4, 15.5_
  - [x] 18.2 Implement WebSocket adapter
    - Create websocketAdapter.ts in src/adapters/rest/
    - Mount WebSocket server at /api/ws
    - Implement authentication
    - Implement message handlers
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 14.1, 15.1, 15.2, 15.3, 15.4, 15.5_

- [x] 19. WebSocket game update integration (TDD)
  - [x] 19.1 Write tests for game update broadcasting
    - Update tests in tests/unit/application/GameManagerService.test.ts
    - Test that makeMove broadcasts update via WebSocket
    - Test that only subscribed clients receive updates
    - Test game completion broadcasts
    - _Requirements: 14.2, 14.3, 15.2_
  - [x] 19.2 Implement game update broadcasting
    - Update GameManagerService to use WebSocketManager
    - Broadcast game state on move
    - Broadcast game completion
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 14.2, 14.3, 15.2_

## Phase 6: Frontend Context and Hooks (TDD)

- [x] 20. WebSocketContext (TDD)
  - [x] 20.1 Write tests for WebSocketContext
    - Write tests in web-client/src/context/__tests__/WebSocketContext.test.tsx
    - Test connection establishment
    - Test subscribe/unsubscribe
    - Test reconnection with exponential backoff
    - Test fallback to polling
    - Test event emission on game updates
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_
  - [x] 20.2 Implement WebSocketContext
    - Create WebSocketContext.tsx in web-client/src/context/
    - Implement connection management
    - Implement reconnection logic
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 21. NotificationContext (TDD)
  - [x] 21.1 Write tests for NotificationContext
    - Write tests in web-client/src/context/__tests__/NotificationContext.test.tsx
    - Test notification state management
    - Test mark as read functionality
    - Test WebSocket integration
    - Test notification count
    - _Requirements: 13.3, 13.4_
  - [x] 21.2 Implement NotificationContext
    - Create NotificationContext.tsx in web-client/src/context/
    - Implement notification state
    - Integrate with WebSocket
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 13.3, 13.4_

- [-] 22. useProfile hook (TDD)
  - [x] 22.1 Write tests for useProfile hook
    - Write tests in web-client/src/hooks/__tests__/useProfile.test.ts
    - Test profile loading
    - Test profile caching
    - Test profile update
    - Test error handling
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 10.1, 10.2, 10.3, 10.4, 10.5_
  - [x] 22.2 Implement useProfile hook
    - Create useProfile.ts in web-client/src/hooks/
    - Implement profile data management
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 23. Update PlayerContext (TDD)
  - [x] 23.1 Write tests for PlayerContext updates
    - Update tests in web-client/src/context/__tests__/PlayerContext.test.tsx
    - Test profile integration
    - Test display name usage
    - Test authentication loading state fix
    - Test profile caching
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.2, 4.3, 4.4, 4.5_
  - [x] 23.2 Implement PlayerContext updates
    - Update PlayerContext.tsx
    - Integrate profile management
    - Fix authentication loading bug
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.2, 4.3, 4.4, 4.5_

## Phase 7: Frontend API Client (TDD)

- [x] 24. Update GameClient for new endpoints (TDD)
  - [x] 24.1 Write tests for profile API methods
    - Update tests in web-client/src/api/__tests__/gameClient.test.ts
    - Test createProfile, getProfile, updateProfile, getPublicProfile
    - Test error handling
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 10.1, 10.2, 10.3, 10.4, 10.5_
  - [x] 24.2 Implement profile API methods
    - Update GameClient in web-client/src/api/gameClient.ts
    - Add profile methods
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 10.1, 10.2, 10.3, 10.4, 10.5_
  - [x] 24.3 Write tests for stats API methods
    - Add tests for getPlayerStats, getGameHistory, getLeaderboard
    - Test filtering and pagination
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5_
  - [x] 24.4 Implement stats API methods
    - Add stats methods to GameClient
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5_
  - [x] 24.5 Write tests for invitation API methods
    - Add tests for createInvitation, getInvitations, acceptInvitation, declineInvitation
    - Test error handling
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  - [x] 24.6 Implement invitation API methods
    - Add invitation methods to GameClient
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  - [x] 24.7 Write tests for game metadata
    - Update createGame tests to include name and description
    - Test validation
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [x] 24.8 Implement game metadata support
    - Update createGame method
    - Update type definitions
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_


## Phase 8: Frontend Navigation and Header (TDD)

- [x] 25. Navigation Header component (TDD)
  - [x] 25.1 Write tests for Header component
    - Write tests in web-client/src/components/common/__tests__/Header.test.tsx
    - Test navigation link rendering
    - Test active view highlighting
    - Test display name display
    - Test notification bell with count
    - Test responsive behavior
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 16.1, 16.2, 16.3, 16.4, 16.5_
  - [x] 25.2 Implement Header component
    - Create Header.tsx in web-client/src/components/common/
    - Implement navigation links
    - Integrate notification count
    - Style with CSS modules
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 16.1, 16.2, 16.3, 16.4, 16.5_

- [x] 26. Update App routing (TDD)
  - [x] 26.1 Write tests for App routing updates
    - Update tests in web-client/src/__tests__/App.test.tsx
    - Test new routes (lobby, profile, stats, leaderboard)
    - Test header presence on all views
    - Test admin route protection
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 8.1, 8.2, 8.3, 8.4, 8.5_
  - [x] 26.2 Implement App routing updates
    - Update App.tsx with new routes
    - Add header to all views
    - Implement admin route protection
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 8.1, 8.2, 8.3, 8.4, 8.5_

## Phase 9: Frontend Lobby View (TDD)

- [x] 27. GameCard component (TDD)
  - [x] 27.1 Write tests for GameCard component
    - Write tests in web-client/src/components/Lobby/__tests__/GameCard.test.tsx
    - Test game info display (name, description, type, players, state)
    - Test join button
    - Test click handling
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [x] 27.2 Implement GameCard component
    - Create GameCard.tsx in web-client/src/components/Lobby/
    - Implement game info display
    - Style with CSS modules
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [-] 28. GameFilters component (TDD)
  - [x] 28.1 Write tests for GameFilters component
    - Write tests in web-client/src/components/Lobby/__tests__/GameFilters.test.tsx
    - Test filter controls rendering
    - Test filter change callbacks
    - Test search input
    - _Requirements: 2.2, 2.3_
  - [x] 28.2 Implement GameFilters component
    - Create GameFilters.tsx in web-client/src/components/Lobby/
    - Implement filter controls
    - Style with CSS modules
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 2.2, 2.3_

- [x] 29. LobbyView component (TDD)
  - [x] 29.1 Write tests for LobbyView component
    - Write tests in web-client/src/views/__tests__/LobbyView.test.tsx
    - Test game list rendering
    - Test filtering logic
    - Test loading and empty states
    - Test join game flow
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 16.1, 16.2, 16.3, 16.4, 16.5_
  - [x] 29.2 Implement LobbyView component
    - Create LobbyView.tsx in web-client/src/views/
    - Integrate GameCard and GameFilters
    - Implement filtering logic
    - Style with CSS modules
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 16.1, 16.2, 16.3, 16.4, 16.5_

## Phase 10: Frontend Profile View (TDD)

- [-] 30. ProfileForm component (TDD)
  - [x] 30.1 Write tests for ProfileForm component
    - Write tests in web-client/src/components/Profile/__tests__/ProfileForm.test.tsx
    - Test form rendering
    - Test display name validation
    - Test form submission
    - Test error display
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  - [x] 30.2 Implement ProfileForm component
    - Create ProfileForm.tsx in web-client/src/components/Profile/
    - Implement validation (3-50 chars, alphanumeric + underscore)
    - Style with CSS modules
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 31. ProfileView component (TDD)
  - [x] 31.1 Write tests for ProfileView component
    - Write tests in web-client/src/views/__tests__/ProfileView.test.tsx
    - Test profile display
    - Test profile update flow
    - Test notification preferences
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 16.1, 16.2, 16.3, 16.4, 16.5_
  - [x] 31.2 Implement ProfileView component
    - Create ProfileView.tsx in web-client/src/views/
    - Integrate ProfileForm
    - Style with CSS modules
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 16.1, 16.2, 16.3, 16.4, 16.5_

## Phase 11: Frontend Stats View (TDD)

- [x] 32. StatsOverview component (TDD)
  - [x] 32.1 Write tests for StatsOverview component
    - Write tests in web-client/src/components/Stats/__tests__/StatsOverview.test.tsx
    - Test aggregate stats display
    - Test per-game-type breakdown
    - Test edge cases (no games)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  - [x] 32.2 Implement StatsOverview component
    - Create StatsOverview.tsx in web-client/src/components/Stats/
    - Implement stats display
    - Style with CSS modules
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 33. GameHistory component (TDD)
  - [x] 33.1 Write tests for GameHistory component
    - Write tests in web-client/src/components/Stats/__tests__/GameHistory.test.tsx
    - Test game list rendering
    - Test filtering
    - Test pagination
    - Test empty state
    - _Requirements: 6.1, 6.2, 6.5, 11.1, 11.2, 11.3, 11.4, 11.5_
  - [x] 33.2 Implement GameHistory component
    - Create GameHistory.tsx in web-client/src/components/Stats/
    - Implement game list
    - Style with CSS modules
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 6.1, 6.2, 6.5, 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 34. StatsView component (TDD)
  - [ ] 34.1 Write tests for StatsView component
    - Write tests in web-client/src/views/__tests__/StatsView.test.tsx
    - Test overview and history integration
    - Test game type filtering
    - Test loading states
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 16.1, 16.2, 16.3, 16.4, 16.5_
  - [ ] 34.2 Implement StatsView component
    - Create StatsView.tsx in web-client/src/views/
    - Integrate StatsOverview and GameHistory
    - Style with CSS modules
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 16.1, 16.2, 16.3, 16.4, 16.5_

## Phase 12: Frontend Leaderboard View (TDD)

- [ ] 35. LeaderboardTable component (TDD)
  - [ ] 35.1 Write tests for LeaderboardTable component
    - Write tests in web-client/src/components/Leaderboard/__tests__/LeaderboardTable.test.tsx
    - Test ranked list rendering
    - Test current player highlighting
    - Test sorting
    - Test empty state
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - [ ] 35.2 Implement LeaderboardTable component
    - Create LeaderboardTable.tsx in web-client/src/components/Leaderboard/
    - Implement ranked list
    - Style with CSS modules
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 36. LeaderboardView component (TDD)
  - [ ] 36.1 Write tests for LeaderboardView component
    - Write tests in web-client/src/views/__tests__/LeaderboardView.test.tsx
    - Test leaderboard display
    - Test game type filtering
    - Test pagination
    - Test loading states
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 16.1, 16.2, 16.3, 16.4, 16.5_
  - [ ] 36.2 Implement LeaderboardView component
    - Create LeaderboardView.tsx in web-client/src/views/
    - Integrate LeaderboardTable
    - Style with CSS modules
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 16.1, 16.2, 16.3, 16.4, 16.5_


## Phase 13: Frontend Invitation System (TDD)

- [ ] 37. InviteModal component (TDD)
  - [ ] 37.1 Write tests for InviteModal component
    - Write tests in web-client/src/components/Invitations/__tests__/InviteModal.test.tsx
    - Test modal rendering
    - Test player selection
    - Test invitation submission
    - Test error handling
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  - [ ] 37.2 Implement InviteModal component
    - Create InviteModal.tsx in web-client/src/components/Invitations/
    - Implement player selection
    - Style with CSS modules
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 38. InvitationList component (TDD)
  - [ ] 38.1 Write tests for InvitationList component
    - Write tests in web-client/src/components/Invitations/__tests__/InvitationList.test.tsx
    - Test invitation list rendering
    - Test accept/decline buttons
    - Test empty state
    - _Requirements: 12.4, 12.5_
  - [ ] 38.2 Implement InvitationList component
    - Create InvitationList.tsx in web-client/src/components/Invitations/
    - Implement invitation list
    - Style with CSS modules
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 12.4, 12.5_

- [ ] 39. Integrate invitations into views (TDD)
  - [ ] 39.1 Write tests for invitation integration
    - Update tests in web-client/src/components/GameDetail/__tests__/GameDetail.test.tsx
    - Test invite button in game detail
    - Test invitation display in notifications
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  - [ ] 39.2 Implement invitation integration
    - Update GameDetail to include invite button
    - Integrate InviteModal
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

## Phase 14: Frontend Notification System (TDD)

- [ ] 40. NotificationBell component (TDD)
  - [ ] 40.1 Write tests for NotificationBell component
    - Write tests in web-client/src/components/Notifications/__tests__/NotificationBell.test.tsx
    - Test bell icon rendering
    - Test unread count display
    - Test dropdown toggle
    - _Requirements: 13.3, 13.4_
  - [ ] 40.2 Implement NotificationBell component
    - Create NotificationBell.tsx in web-client/src/components/Notifications/
    - Implement bell with count
    - Style with CSS modules
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 13.3, 13.4_

- [ ] 41. NotificationList component (TDD)
  - [ ] 41.1 Write tests for NotificationList component
    - Write tests in web-client/src/components/Notifications/__tests__/NotificationList.test.tsx
    - Test notification list rendering
    - Test mark as read
    - Test click to navigate
    - Test empty state
    - _Requirements: 13.3, 13.4_
  - [ ] 41.2 Implement NotificationList component
    - Create NotificationList.tsx in web-client/src/components/Notifications/
    - Implement notification list
    - Style with CSS modules
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 13.3, 13.4_

- [ ] 42. Integrate notifications with WebSocket (TDD)
  - [ ] 42.1 Write tests for notification WebSocket integration
    - Update tests in web-client/src/context/__tests__/NotificationContext.test.tsx
    - Test receiving turn notifications via WebSocket
    - Test notification display
    - Test notification count updates
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 14.1, 14.2_
  - [ ] 42.2 Implement notification WebSocket integration
    - Update NotificationContext to listen for WebSocket events
    - Implement notification display
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 14.1, 14.2_

## Phase 15: Update PlayerView (TDD)

- [ ] 43. Fix authentication loading state (TDD)
  - [ ] 43.1 Write tests for authentication fix
    - Update tests in web-client/src/views/__tests__/PlayerView.test.tsx
    - Test no loading flash for returning users
    - Test loading message only for new users
    - Test profile caching
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [ ] 43.2 Implement authentication fix
    - Update PlayerView.tsx
    - Check profile existence before showing loading
    - Cache profile state
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 44. Update game creation form (TDD)
  - [ ] 44.1 Write tests for game creation updates
    - Update tests in web-client/src/views/__tests__/PlayerView.test.tsx
    - Test game name input (required)
    - Test game description input (optional, max 500 chars)
    - Test form validation
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [ ] 44.2 Implement game creation updates
    - Update PlayerView game creation form
    - Add name and description inputs
    - Add validation
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 45. Integrate WebSocket for real-time updates (TDD)
  - [ ] 45.1 Write tests for WebSocket integration
    - Update tests in web-client/src/views/__tests__/PlayerView.test.tsx
    - Test game subscription on load
    - Test game state update on WebSocket message
    - Test connection status indicator
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_
  - [ ] 45.2 Implement WebSocket integration
    - Update PlayerView to use WebSocketContext
    - Subscribe to current game
    - Update game state on WebSocket events
    - Show connection status
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ] 46. Separate active and completed games (TDD)
  - [ ] 46.1 Write tests for game separation
    - Update tests in web-client/src/views/__tests__/PlayerView.test.tsx
    - Test active/completed tabs
    - Test game sorting
    - Test turn indicator
    - Test winner display
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  - [ ] 46.2 Implement game separation
    - Update PlayerView with tabs
    - Implement sorting logic
    - Add turn indicators
    - Show winner for completed games
    - Implement to pass all tests
    - Refactor for code quality
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

## Phase 16: Documentation and Deployment

- [ ] 47. Update documentation
  - [ ] 47.1 Update API documentation
    - Document new endpoints in docs/API.md
    - Add WebSocket protocol documentation
    - Document admin authorization
    - _Requirements: All requirements_
  - [ ] 47.2 Update environment configuration
    - Add ADMIN_USER_IDS to .env.example
    - Add notification delay configuration
    - Document WebSocket configuration
    - _Requirements: 8.1, 8.2, 13.1, 13.2_
  - [ ] 47.3 Update deployment documentation
    - Document WebSocket server deployment
    - Document database migration process
    - Update DEPLOYMENT.md
    - _Requirements: All requirements_

- [ ] 48. Create data migration script
  - [ ] 48.1 Write data migration script
    - Create script to generate profiles for existing users
    - Backfill game metadata for existing games
    - Add rollback capability
    - _Requirements: 4.1, 4.2, 9.1, 9.2_
  - [ ] 48.2 Test migration on staging
    - Run migration on staging environment
    - Verify data integrity
    - Test rollback
    - _Requirements: 4.1, 4.2, 9.1, 9.2_

## Phase 17: Manual Testing and Refinement

- [ ] 49. End-to-end testing
  - [ ] 49.1 Test authentication flow
    - Test new user signup with profile creation
    - Test returning user without loading flash
    - Test display name generation
    - Verify no bugs
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.2, 4.3, 4.4, 4.5_
  - [ ] 49.2 Test lobby and game creation
    - Test game creation with name and description
    - Test lobby filtering
    - Test joining games from lobby
    - Verify no bugs
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5_
  - [ ] 49.3 Test profile and stats
    - Test profile editing
    - Test display name validation
    - Test stats calculation
    - Test leaderboard ranking
    - Verify no bugs
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5, 10.1, 10.2, 10.3, 10.4, 10.5_
  - [ ] 49.4 Test invitations and notifications
    - Test sending invitations
    - Test accepting/declining invitations
    - Test turn notifications
    - Test notification delay
    - Verify no bugs
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 13.1, 13.2, 13.3, 13.4, 13.5_
  - [ ] 49.5 Test real-time updates
    - Test WebSocket connection
    - Test game updates without refresh
    - Test reconnection on disconnect
    - Test fallback to polling
    - Verify no bugs
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 15.1, 15.2, 15.3, 15.4, 15.5_
  - [ ] 49.6 Test admin authorization
    - Test admin view access as regular user
    - Test admin view access as admin user
    - Test admin navigation visibility
    - Verify no bugs
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  - [ ] 49.7 Test responsive design
    - Test all views on mobile (< 768px)
    - Test all views on tablet (768px-1023px)
    - Test all views on desktop (1024px+)
    - Test navigation on different screen sizes
    - Verify no bugs
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_
