import { GameState } from '../models';

/**
 * WebSocket message types
 */
export enum WebSocketMessageType {
  GAME_UPDATE = 'game_update',
  TURN_NOTIFICATION = 'turn_notification',
  INVITATION = 'invitation',
  GAME_COMPLETE = 'game_complete',
  PING = 'ping',
  PONG = 'pong',
}

/**
 * Base WebSocket message
 */
export interface WebSocketMessage {
  type: WebSocketMessageType;
  timestamp: Date;
}

/**
 * Game update message
 */
export interface GameUpdateMessage extends WebSocketMessage {
  type: WebSocketMessageType.GAME_UPDATE;
  gameId: string;
  gameState: GameState;
}

/**
 * Turn notification message
 */
export interface TurnNotificationMessage extends WebSocketMessage {
  type: WebSocketMessageType.TURN_NOTIFICATION;
  gameId: string;
  currentPlayer: string;
}

/**
 * Invitation message
 */
export interface InvitationMessage extends WebSocketMessage {
  type: WebSocketMessageType.INVITATION;
  invitationId: string;
  gameId: string;
  inviterName: string;
}

/**
 * Game complete message
 */
export interface GameCompleteMessage extends WebSocketMessage {
  type: WebSocketMessageType.GAME_COMPLETE;
  gameId: string;
  winner: string | null;
}

/**
 * Interface for WebSocket service
 * Manages real-time connections and message broadcasting
 */
export interface IWebSocketService {
  /**
   * Register a user connection
   * @param userId - The user ID
   * @param connectionId - Unique connection identifier
   */
  registerConnection(userId: string, connectionId: string): void;

  /**
   * Unregister a user connection
   * @param connectionId - Unique connection identifier
   */
  unregisterConnection(connectionId: string): void;

  /**
   * Subscribe a user to game updates
   * @param userId - The user ID
   * @param gameId - The game ID to subscribe to
   */
  subscribe(userId: string, gameId: string): void;

  /**
   * Unsubscribe a user from game updates
   * @param userId - The user ID
   * @param gameId - The game ID to unsubscribe from
   */
  unsubscribe(userId: string, gameId: string): void;

  /**
   * Broadcast a message to all subscribers of a game
   * @param gameId - The game ID
   * @param message - The message to broadcast
   */
  broadcastToGame(gameId: string, message: WebSocketMessage): Promise<void>;

  /**
   * Send a message to a specific user
   * @param userId - The user ID
   * @param message - The message to send
   */
  sendToUser(userId: string, message: WebSocketMessage): Promise<void>;

  /**
   * Get the number of active connections
   */
  getConnectionCount(): number;

  /**
   * Get the number of subscribers for a game
   */
  getGameSubscriberCount(gameId: string): number;
}
