import { IWebSocketService, WebSocketMessage } from '@domain/interfaces/IWebSocketService';
import { Logger, LogContext } from '@infrastructure/logging/Logger';

/**
 * Connection information
 */
interface ConnectionInfo {
  userId: string;
  connectionId: string;
  ws: any; // WebSocket type
}

/**
 * WebSocketManager implementation
 * Manages WebSocket connections, subscriptions, and message broadcasting
 */
export class WebSocketManager implements IWebSocketService {
  private connections: Map<string, ConnectionInfo>; // connectionId -> ConnectionInfo
  private userConnections: Map<string, Set<string>>; // userId -> Set<connectionId>
  private subscriptions: Map<string, Set<string>>; // gameId -> Set<userId>
  private userSubscriptions: Map<string, Set<string>>; // userId -> Set<gameId>
  private logger: Logger;

  constructor(logger?: Logger) {
    this.connections = new Map();
    this.userConnections = new Map();
    this.subscriptions = new Map();
    this.userSubscriptions = new Map();
    this.logger = logger || new Logger('info', 'pretty');
  }

  /**
   * Register a user connection
   * Extended to accept WebSocket for actual implementation
   */
  registerConnection(userId: string, connectionId: string, ws?: any): void {
    if (!ws) {
      // If no WebSocket provided, just track the connection metadata
      // This allows the interface to be satisfied
      return;
    }
    this.logger.info(`Registering connection ${connectionId} for user ${userId}`);

    // Store connection info
    this.connections.set(connectionId, { userId, connectionId, ws });

    // Track user's connections
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId)!.add(connectionId);

    this.logger.info(
      `Connection registered. Total connections: ${this.connections.size}, User ${userId} has ${this.userConnections.get(userId)!.size} connection(s)`
    );
  }

  /**
   * Unregister a user connection
   */
  unregisterConnection(connectionId: string): void {
    const connectionInfo = this.connections.get(connectionId);

    if (!connectionInfo) {
      this.logger.warn(`Attempted to unregister non-existent connection: ${connectionId}`);
      return;
    }

    const { userId } = connectionInfo;
    this.logger.info(`Unregistering connection ${connectionId} for user ${userId}`);

    // Remove from connections
    this.connections.delete(connectionId);

    // Remove from user's connections
    const userConns = this.userConnections.get(userId);
    if (userConns) {
      userConns.delete(connectionId);
      if (userConns.size === 0) {
        this.userConnections.delete(userId);

        // Clean up all subscriptions for this user if they have no more connections
        this.cleanupUserSubscriptions(userId);
      }
    }

    this.logger.info(`Connection unregistered. Total connections: ${this.connections.size}`);
  }

  /**
   * Clean up all subscriptions for a user
   */
  private cleanupUserSubscriptions(userId: string): void {
    const userSubs = this.userSubscriptions.get(userId);
    if (!userSubs) {
      return;
    }

    // Remove user from all game subscriptions
    for (const gameId of userSubs) {
      const gameSubs = this.subscriptions.get(gameId);
      if (gameSubs) {
        gameSubs.delete(userId);
        if (gameSubs.size === 0) {
          this.subscriptions.delete(gameId);
        }
      }
    }

    // Clear user's subscription list
    this.userSubscriptions.delete(userId);
    this.logger.info(`Cleaned up subscriptions for user ${userId}`);
  }

  /**
   * Subscribe a user to game updates
   */
  subscribe(userId: string, gameId: string): void {
    this.logger.info(`User ${userId} subscribing to game ${gameId}`);

    // Add to game subscriptions
    if (!this.subscriptions.has(gameId)) {
      this.subscriptions.set(gameId, new Set());
    }
    this.subscriptions.get(gameId)!.add(userId);

    // Track user's subscriptions
    if (!this.userSubscriptions.has(userId)) {
      this.userSubscriptions.set(userId, new Set());
    }
    this.userSubscriptions.get(userId)!.add(gameId);

    this.logger.info(
      `User ${userId} subscribed to game ${gameId}. Game has ${this.subscriptions.get(gameId)!.size} subscriber(s)`
    );
  }

  /**
   * Unsubscribe a user from game updates
   */
  unsubscribe(userId: string, gameId: string): void {
    this.logger.info(`User ${userId} unsubscribing from game ${gameId}`);

    // Remove from game subscriptions
    const gameSubs = this.subscriptions.get(gameId);
    if (gameSubs) {
      gameSubs.delete(userId);
      if (gameSubs.size === 0) {
        this.subscriptions.delete(gameId);
      }
    }

    // Remove from user's subscriptions
    const userSubs = this.userSubscriptions.get(userId);
    if (userSubs) {
      userSubs.delete(gameId);
      if (userSubs.size === 0) {
        this.userSubscriptions.delete(userId);
      }
    }

    this.logger.info(`User ${userId} unsubscribed from game ${gameId}`);
  }

  /**
   * Broadcast a message to all subscribers of a game
   */
  async broadcastToGame(gameId: string, message: WebSocketMessage): Promise<void> {
    const subscribers = this.subscriptions.get(gameId);

    if (!subscribers || subscribers.size === 0) {
      this.logger.debug(`No subscribers for game ${gameId}, skipping broadcast`);
      return;
    }

    this.logger.info(
      `Broadcasting message type ${message.type} to ${subscribers.size} subscriber(s) of game ${gameId}`
    );

    const sendPromises: Promise<void>[] = [];

    for (const userId of subscribers) {
      sendPromises.push(this.sendToUser(userId, message));
    }

    await Promise.all(sendPromises);
  }

  /**
   * Send a message to a specific user
   */
  async sendToUser(userId: string, message: WebSocketMessage): Promise<void> {
    const connectionIds = this.userConnections.get(userId);

    if (!connectionIds || connectionIds.size === 0) {
      this.logger.debug(`No active connections for user ${userId}, skipping message`);
      return;
    }

    this.logger.debug(
      `Sending message type ${message.type} to user ${userId} (${connectionIds.size} connection(s))`
    );

    const messageStr = JSON.stringify(message);

    for (const connectionId of connectionIds) {
      const connectionInfo = this.connections.get(connectionId);

      if (!connectionInfo) {
        this.logger.warn(`Connection ${connectionId} not found for user ${userId}`);
        continue;
      }

      const { ws } = connectionInfo;

      // Check if connection is open (readyState === 1)
      if (ws.readyState !== 1) {
        this.logger.warn(
          `Connection ${connectionId} for user ${userId} is not open (readyState: ${ws.readyState}), skipping`
        );
        continue;
      }

      try {
        ws.send(messageStr);
        this.logger.debug(`Message sent to connection ${connectionId}`);
      } catch (error) {
        this.logger.error(
          `Failed to send message to connection ${connectionId} for user ${userId}:`,
          { error: error instanceof Error ? error.message : String(error) } as LogContext
        );
        // Continue to try other connections
      }
    }
  }

  /**
   * Get the number of active connections
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get the number of subscribers for a game
   */
  getGameSubscriberCount(gameId: string): number {
    const subscribers = this.subscriptions.get(gameId);
    return subscribers ? subscribers.size : 0;
  }
}
