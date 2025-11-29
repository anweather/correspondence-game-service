import { WebSocketManager } from '@infrastructure/websocket/WebSocketManager';
import {
  WebSocketMessageType,
  GameUpdateMessage,
  TurnNotificationMessage,
} from '@domain/interfaces/IWebSocketService';
import { GameState, GameLifecycle } from '@domain/models';

// Mock WebSocket class
class MockWebSocket {
  public readyState: number = 1; // OPEN
  public sentMessages: any[] = [];
  public onclose?: () => void;
  public onerror?: (error: Error) => void;

  send(data: string): void {
    this.sentMessages.push(JSON.parse(data));
  }

  close(): void {
    this.readyState = 3; // CLOSED
    if (this.onclose) {
      this.onclose();
    }
  }

  simulateError(error: Error): void {
    if (this.onerror) {
      this.onerror(error);
    }
  }
}

// Helper function to create a test game state
function createTestGameState(gameId: string): GameState {
  return {
    gameId,
    gameType: 'tic-tac-toe',
    players: [],
    currentPlayerIndex: 0,
    phase: 'playing',
    lifecycle: GameLifecycle.ACTIVE,
    board: { spaces: [], metadata: {} },
    moveHistory: [],
    metadata: {},
    winner: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('WebSocketManager', () => {
  let manager: WebSocketManager;

  beforeEach(() => {
    manager = new WebSocketManager();
  });

  describe('Connection Management', () => {
    it('should register a new connection', () => {
      const ws = new MockWebSocket();
      const userId = 'user1';
      const connectionId = 'conn1';

      manager.registerConnection(userId, connectionId, ws as any);

      expect(manager.getConnectionCount()).toBe(1);
    });

    it('should allow multiple connections for the same user', () => {
      const ws1 = new MockWebSocket();
      const ws2 = new MockWebSocket();
      const userId = 'user1';

      manager.registerConnection(userId, 'conn1', ws1 as any);
      manager.registerConnection(userId, 'conn2', ws2 as any);

      expect(manager.getConnectionCount()).toBe(2);
    });

    it('should unregister a connection', () => {
      const ws = new MockWebSocket();
      const userId = 'user1';
      const connectionId = 'conn1';

      manager.registerConnection(userId, connectionId, ws as any);
      manager.unregisterConnection(connectionId);

      expect(manager.getConnectionCount()).toBe(0);
    });

    it('should handle unregistering non-existent connection gracefully', () => {
      expect(() => {
        manager.unregisterConnection('non-existent');
      }).not.toThrow();

      expect(manager.getConnectionCount()).toBe(0);
    });

    it('should clean up subscriptions when connection is unregistered', () => {
      const ws = new MockWebSocket();
      const userId = 'user1';
      const connectionId = 'conn1';
      const gameId = 'game1';

      manager.registerConnection(userId, connectionId, ws as any);
      manager.subscribe(userId, gameId);

      expect(manager.getGameSubscriberCount(gameId)).toBe(1);

      manager.unregisterConnection(connectionId);

      expect(manager.getGameSubscriberCount(gameId)).toBe(0);
    });
  });

  describe('Subscription Management', () => {
    it('should subscribe a user to a game', () => {
      const ws = new MockWebSocket();
      const userId = 'user1';
      const connectionId = 'conn1';
      const gameId = 'game1';

      manager.registerConnection(userId, connectionId, ws as any);
      manager.subscribe(userId, gameId);

      expect(manager.getGameSubscriberCount(gameId)).toBe(1);
    });

    it('should allow multiple users to subscribe to the same game', () => {
      const ws1 = new MockWebSocket();
      const ws2 = new MockWebSocket();
      const gameId = 'game1';

      manager.registerConnection('user1', 'conn1', ws1 as any);
      manager.registerConnection('user2', 'conn2', ws2 as any);

      manager.subscribe('user1', gameId);
      manager.subscribe('user2', gameId);

      expect(manager.getGameSubscriberCount(gameId)).toBe(2);
    });

    it('should allow a user to subscribe to multiple games', () => {
      const ws = new MockWebSocket();
      const userId = 'user1';
      const connectionId = 'conn1';

      manager.registerConnection(userId, connectionId, ws as any);
      manager.subscribe(userId, 'game1');
      manager.subscribe(userId, 'game2');

      expect(manager.getGameSubscriberCount('game1')).toBe(1);
      expect(manager.getGameSubscriberCount('game2')).toBe(1);
    });

    it('should not duplicate subscriptions for the same user and game', () => {
      const ws = new MockWebSocket();
      const userId = 'user1';
      const connectionId = 'conn1';
      const gameId = 'game1';

      manager.registerConnection(userId, connectionId, ws as any);
      manager.subscribe(userId, gameId);
      manager.subscribe(userId, gameId);

      expect(manager.getGameSubscriberCount(gameId)).toBe(1);
    });

    it('should unsubscribe a user from a game', () => {
      const ws = new MockWebSocket();
      const userId = 'user1';
      const connectionId = 'conn1';
      const gameId = 'game1';

      manager.registerConnection(userId, connectionId, ws as any);
      manager.subscribe(userId, gameId);
      manager.unsubscribe(userId, gameId);

      expect(manager.getGameSubscriberCount(gameId)).toBe(0);
    });

    it('should handle unsubscribing from non-existent game gracefully', () => {
      const ws = new MockWebSocket();
      const userId = 'user1';
      const connectionId = 'conn1';

      manager.registerConnection(userId, connectionId, ws as any);

      expect(() => {
        manager.unsubscribe(userId, 'non-existent-game');
      }).not.toThrow();
    });

    it('should handle subscribing without active connection gracefully', () => {
      expect(() => {
        manager.subscribe('user-without-connection', 'game1');
      }).not.toThrow();
    });
  });

  describe('Broadcasting', () => {
    it('should broadcast game update to all subscribers', async () => {
      const ws1 = new MockWebSocket();
      const ws2 = new MockWebSocket();
      const gameId = 'game1';

      manager.registerConnection('user1', 'conn1', ws1 as any);
      manager.registerConnection('user2', 'conn2', ws2 as any);
      manager.subscribe('user1', gameId);
      manager.subscribe('user2', gameId);

      const gameState = createTestGameState(gameId);

      const message: GameUpdateMessage = {
        type: WebSocketMessageType.GAME_UPDATE,
        gameId,
        gameState,
        timestamp: new Date(),
      };

      await manager.broadcastToGame(gameId, message);

      expect(ws1.sentMessages).toHaveLength(1);
      expect(ws2.sentMessages).toHaveLength(1);
      expect(ws1.sentMessages[0].type).toBe(WebSocketMessageType.GAME_UPDATE);
      expect(ws2.sentMessages[0].type).toBe(WebSocketMessageType.GAME_UPDATE);
    });

    it('should not broadcast to unsubscribed users', async () => {
      const ws1 = new MockWebSocket();
      const ws2 = new MockWebSocket();
      const gameId = 'game1';

      manager.registerConnection('user1', 'conn1', ws1 as any);
      manager.registerConnection('user2', 'conn2', ws2 as any);
      manager.subscribe('user1', gameId);
      // user2 is not subscribed

      const gameState = createTestGameState(gameId);

      const message: GameUpdateMessage = {
        type: WebSocketMessageType.GAME_UPDATE,
        gameId,
        gameState,
        timestamp: new Date(),
      };

      await manager.broadcastToGame(gameId, message);

      expect(ws1.sentMessages).toHaveLength(1);
      expect(ws2.sentMessages).toHaveLength(0);
    });

    it('should handle broadcasting to game with no subscribers', async () => {
      const gameState = createTestGameState('game1');

      const message: GameUpdateMessage = {
        type: WebSocketMessageType.GAME_UPDATE,
        gameId: 'game1',
        gameState,
        timestamp: new Date(),
      };

      await expect(manager.broadcastToGame('game1', message)).resolves.not.toThrow();
    });

    it('should broadcast to all connections of a user with multiple connections', async () => {
      const ws1 = new MockWebSocket();
      const ws2 = new MockWebSocket();
      const userId = 'user1';
      const gameId = 'game1';

      manager.registerConnection(userId, 'conn1', ws1 as any);
      manager.registerConnection(userId, 'conn2', ws2 as any);
      manager.subscribe(userId, gameId);

      const gameState = createTestGameState(gameId);

      const message: GameUpdateMessage = {
        type: WebSocketMessageType.GAME_UPDATE,
        gameId,
        gameState,
        timestamp: new Date(),
      };

      await manager.broadcastToGame(gameId, message);

      expect(ws1.sentMessages).toHaveLength(1);
      expect(ws2.sentMessages).toHaveLength(1);
    });
  });

  describe('Direct Messaging', () => {
    it('should send message to specific user', async () => {
      const ws = new MockWebSocket();
      const userId = 'user1';
      const connectionId = 'conn1';

      manager.registerConnection(userId, connectionId, ws as any);

      const message: TurnNotificationMessage = {
        type: WebSocketMessageType.TURN_NOTIFICATION,
        gameId: 'game1',
        currentPlayer: userId,
        timestamp: new Date(),
      };

      await manager.sendToUser(userId, message);

      expect(ws.sentMessages).toHaveLength(1);
      expect(ws.sentMessages[0].type).toBe(WebSocketMessageType.TURN_NOTIFICATION);
    });

    it('should send to all connections of a user', async () => {
      const ws1 = new MockWebSocket();
      const ws2 = new MockWebSocket();
      const userId = 'user1';

      manager.registerConnection(userId, 'conn1', ws1 as any);
      manager.registerConnection(userId, 'conn2', ws2 as any);

      const message: TurnNotificationMessage = {
        type: WebSocketMessageType.TURN_NOTIFICATION,
        gameId: 'game1',
        currentPlayer: userId,
        timestamp: new Date(),
      };

      await manager.sendToUser(userId, message);

      expect(ws1.sentMessages).toHaveLength(1);
      expect(ws2.sentMessages).toHaveLength(1);
    });

    it('should handle sending to non-existent user gracefully', async () => {
      const message: TurnNotificationMessage = {
        type: WebSocketMessageType.TURN_NOTIFICATION,
        gameId: 'game1',
        currentPlayer: 'user1',
        timestamp: new Date(),
      };

      await expect(manager.sendToUser('non-existent-user', message)).resolves.not.toThrow();
    });
  });

  describe('Connection Cleanup', () => {
    it('should skip sending to closed connections', async () => {
      const ws = new MockWebSocket();
      const userId = 'user1';
      const connectionId = 'conn1';

      manager.registerConnection(userId, connectionId, ws as any);
      ws.close();

      const message: TurnNotificationMessage = {
        type: WebSocketMessageType.TURN_NOTIFICATION,
        gameId: 'game1',
        currentPlayer: userId,
        timestamp: new Date(),
      };

      await manager.sendToUser(userId, message);

      // Should not throw, but also should not send
      expect(ws.sentMessages).toHaveLength(0);
    });

    it('should handle send errors gracefully', async () => {
      const ws = new MockWebSocket();
      ws.send = () => {
        throw new Error('Send failed');
      };

      const userId = 'user1';
      const connectionId = 'conn1';

      manager.registerConnection(userId, connectionId, ws as any);

      const message: TurnNotificationMessage = {
        type: WebSocketMessageType.TURN_NOTIFICATION,
        gameId: 'game1',
        currentPlayer: userId,
        timestamp: new Date(),
      };

      // Should not throw even if send fails
      await expect(manager.sendToUser(userId, message)).resolves.not.toThrow();
    });
  });

  describe('Statistics', () => {
    it('should return correct connection count', () => {
      const ws1 = new MockWebSocket();
      const ws2 = new MockWebSocket();
      const ws3 = new MockWebSocket();

      manager.registerConnection('user1', 'conn1', ws1 as any);
      manager.registerConnection('user2', 'conn2', ws2 as any);
      manager.registerConnection('user3', 'conn3', ws3 as any);

      expect(manager.getConnectionCount()).toBe(3);

      manager.unregisterConnection('conn2');

      expect(manager.getConnectionCount()).toBe(2);
    });

    it('should return correct subscriber count for a game', () => {
      const ws1 = new MockWebSocket();
      const ws2 = new MockWebSocket();
      const ws3 = new MockWebSocket();
      const gameId = 'game1';

      manager.registerConnection('user1', 'conn1', ws1 as any);
      manager.registerConnection('user2', 'conn2', ws2 as any);
      manager.registerConnection('user3', 'conn3', ws3 as any);

      manager.subscribe('user1', gameId);
      manager.subscribe('user2', gameId);

      expect(manager.getGameSubscriberCount(gameId)).toBe(2);

      manager.unsubscribe('user1', gameId);

      expect(manager.getGameSubscriberCount(gameId)).toBe(1);
    });

    it('should return 0 for non-existent game subscriber count', () => {
      expect(manager.getGameSubscriberCount('non-existent-game')).toBe(0);
    });
  });
});
