import { InAppNotificationChannel } from '@infrastructure/persistence/InAppNotificationChannel';
import {
  NotificationType,
  TurnNotificationData,
  InvitationNotificationData,
  GameCompleteNotificationData,
} from '@domain/interfaces/INotificationChannel';
import { Pool } from 'pg';

// Mock the pg module
jest.mock('pg', () => {
  const mPool = {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

describe('InAppNotificationChannel', () => {
  let channel: InAppNotificationChannel;
  let mockPool: any;

  beforeEach(() => {
    jest.clearAllMocks();
    const PoolConstructor = Pool as unknown as jest.Mock;
    mockPool = PoolConstructor();
  });

  describe('constructor and initialization', () => {
    it('should create an InAppNotificationChannel with connection string', () => {
      channel = new InAppNotificationChannel('postgresql://localhost:5432/test');

      expect(Pool).toHaveBeenCalledWith({
        connectionString: 'postgresql://localhost:5432/test',
        max: 10,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 30000,
      });
      expect(channel).toBeInstanceOf(InAppNotificationChannel);
    });

    it('should set up error handler for the pool', () => {
      channel = new InAppNotificationChannel('postgresql://localhost:5432/test');

      expect(mockPool.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('getName', () => {
    beforeEach(() => {
      channel = new InAppNotificationChannel('postgresql://localhost:5432/test');
    });

    it('should return "in-app" as the channel name', () => {
      expect(channel.getName()).toBe('in-app');
    });
  });

  describe('isAvailable', () => {
    beforeEach(() => {
      channel = new InAppNotificationChannel('postgresql://localhost:5432/test');
    });

    it('should return true when database connection is available', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [{ result: 1 }] });

      const result = await channel.isAvailable();

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith('SELECT 1 as result');
    });

    it('should return false when database connection fails', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Connection failed'));

      const result = await channel.isAvailable();

      expect(result).toBe(false);
    });
  });

  describe('send - turn notifications', () => {
    beforeEach(() => {
      channel = new InAppNotificationChannel('postgresql://localhost:5432/test');
    });

    it('should create a turn notification in the database', async () => {
      const notification: TurnNotificationData = {
        type: NotificationType.TURN,
        userId: 'user_123',
        gameId: 'game_456',
        message: 'It is your turn in the game',
        currentPlayer: 'user_123',
      };

      const now = new Date('2025-01-01T00:00:00.000Z');
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            notification_id: 'notif_789',
            user_id: 'user_123',
            game_id: 'game_456',
            notification_type: 'turn',
            message: 'It is your turn in the game',
            metadata: { currentPlayer: 'user_123' },
            status: 'pending',
            created_at: now,
            sent_at: null,
          },
        ],
        rowCount: 1,
      });

      await channel.send(notification);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO turn_notifications'),
        expect.arrayContaining([
          'user_123',
          'game_456',
          'turn',
          'It is your turn in the game',
          expect.any(String), // JSON stringified metadata
        ])
      );
    });

    it('should mark notification as sent immediately', async () => {
      const notification: TurnNotificationData = {
        type: NotificationType.TURN,
        userId: 'user_123',
        gameId: 'game_456',
        message: 'It is your turn',
        currentPlayer: 'user_123',
      };

      const now = new Date('2025-01-01T00:00:00.000Z');
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            notification_id: 'notif_789',
            user_id: 'user_123',
            game_id: 'game_456',
            notification_type: 'turn',
            message: 'It is your turn',
            metadata: { currentPlayer: 'user_123' },
            status: 'sent',
            created_at: now,
            sent_at: now,
          },
        ],
        rowCount: 1,
      });

      await channel.send(notification);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO turn_notifications'),
        expect.arrayContaining([
          'user_123',
          'game_456',
          'turn',
          'It is your turn',
          expect.any(String),
        ])
      );
    });
  });

  describe('send - invitation notifications', () => {
    beforeEach(() => {
      channel = new InAppNotificationChannel('postgresql://localhost:5432/test');
    });

    it('should create an invitation notification in the database', async () => {
      const notification: InvitationNotificationData = {
        type: NotificationType.INVITATION,
        userId: 'user_123',
        gameId: 'game_456',
        message: 'You have been invited to a game',
        invitationId: 'inv_789',
        inviterName: 'alice',
      };

      const now = new Date('2025-01-01T00:00:00.000Z');
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            notification_id: 'notif_789',
            user_id: 'user_123',
            game_id: 'game_456',
            notification_type: 'invitation',
            message: 'You have been invited to a game',
            metadata: { invitationId: 'inv_789', inviterName: 'alice' },
            status: 'sent',
            created_at: now,
            sent_at: now,
          },
        ],
        rowCount: 1,
      });

      await channel.send(notification);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO turn_notifications'),
        expect.arrayContaining([
          'user_123',
          'game_456',
          'invitation',
          'You have been invited to a game',
          expect.any(String),
        ])
      );
    });
  });

  describe('send - game complete notifications', () => {
    beforeEach(() => {
      channel = new InAppNotificationChannel('postgresql://localhost:5432/test');
    });

    it('should create a game complete notification in the database', async () => {
      const notification: GameCompleteNotificationData = {
        type: NotificationType.GAME_COMPLETE,
        userId: 'user_123',
        gameId: 'game_456',
        message: 'The game has ended',
        winner: 'user_789',
      };

      const now = new Date('2025-01-01T00:00:00.000Z');
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            notification_id: 'notif_789',
            user_id: 'user_123',
            game_id: 'game_456',
            notification_type: 'game_complete',
            message: 'The game has ended',
            metadata: { winner: 'user_789' },
            status: 'sent',
            created_at: now,
            sent_at: now,
          },
        ],
        rowCount: 1,
      });

      await channel.send(notification);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO turn_notifications'),
        expect.arrayContaining([
          'user_123',
          'game_456',
          'game_complete',
          'The game has ended',
          expect.any(String),
        ])
      );
    });
  });

  describe('send - error handling', () => {
    beforeEach(() => {
      channel = new InAppNotificationChannel('postgresql://localhost:5432/test');
    });

    it('should throw error when database insert fails', async () => {
      const notification: TurnNotificationData = {
        type: NotificationType.TURN,
        userId: 'user_123',
        gameId: 'game_456',
        message: 'It is your turn',
        currentPlayer: 'user_123',
      };

      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(channel.send(notification)).rejects.toThrow('Database error');
    });

    it('should throw error when user does not exist', async () => {
      const notification: TurnNotificationData = {
        type: NotificationType.TURN,
        userId: 'nonexistent_user',
        gameId: 'game_456',
        message: 'It is your turn',
        currentPlayer: 'nonexistent_user',
      };

      const dbError = new Error('foreign key constraint violation');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(channel.send(notification)).rejects.toThrow();
    });
  });

  describe('getNotifications', () => {
    beforeEach(() => {
      channel = new InAppNotificationChannel('postgresql://localhost:5432/test');
    });

    it('should retrieve all notifications for a user', async () => {
      const now = new Date('2025-01-01T00:00:00.000Z');
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            notification_id: 'notif_1',
            user_id: 'user_123',
            game_id: 'game_456',
            notification_type: 'turn',
            message: 'It is your turn',
            metadata: { currentPlayer: 'user_123' },
            status: 'sent',
            created_at: now,
            sent_at: now,
          },
          {
            notification_id: 'notif_2',
            user_id: 'user_123',
            game_id: 'game_789',
            notification_type: 'invitation',
            message: 'You have been invited',
            metadata: { invitationId: 'inv_123', inviterName: 'alice' },
            status: 'sent',
            created_at: now,
            sent_at: now,
          },
        ],
        rowCount: 2,
      });

      const notifications = await channel.getNotifications('user_123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM turn_notifications'),
        ['user_123']
      );
      expect(notifications).toHaveLength(2);
      expect(notifications[0].notificationId).toBe('notif_1');
      expect(notifications[1].notificationId).toBe('notif_2');
    });

    it('should retrieve notifications filtered by status', async () => {
      const now = new Date('2025-01-01T00:00:00.000Z');
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            notification_id: 'notif_1',
            user_id: 'user_123',
            game_id: 'game_456',
            notification_type: 'turn',
            message: 'It is your turn',
            metadata: { currentPlayer: 'user_123' },
            status: 'pending',
            created_at: now,
            sent_at: null,
          },
        ],
        rowCount: 1,
      });

      const notifications = await channel.getNotifications('user_123', 'pending');

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('AND status = $2'), [
        'user_123',
        'pending',
      ]);
      expect(notifications).toHaveLength(1);
      expect(notifications[0].status).toBe('pending');
    });

    it('should return empty array when no notifications exist', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const notifications = await channel.getNotifications('user_123');

      expect(notifications).toEqual([]);
    });
  });

  describe('markAsRead', () => {
    beforeEach(() => {
      channel = new InAppNotificationChannel('postgresql://localhost:5432/test');
    });

    it('should update notification status to read', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            notification_id: 'notif_123',
            status: 'read',
          },
        ],
        rowCount: 1,
      });

      await channel.markAsRead('notif_123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE turn_notifications'),
        expect.arrayContaining(['notif_123'])
      );
    });

    it('should throw error when notification does not exist', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await expect(channel.markAsRead('nonexistent_notif')).rejects.toThrow(
        'Notification not found'
      );
    });
  });

  describe('markAllAsRead', () => {
    beforeEach(() => {
      channel = new InAppNotificationChannel('postgresql://localhost:5432/test');
    });

    it('should update all notifications for a user to read status', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 3,
      });

      await channel.markAllAsRead('user_123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE turn_notifications'),
        expect.arrayContaining(['user_123'])
      );
    });

    it('should not throw error when user has no notifications', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await expect(channel.markAllAsRead('user_123')).resolves.not.toThrow();
    });
  });

  describe('deleteNotification', () => {
    beforeEach(() => {
      channel = new InAppNotificationChannel('postgresql://localhost:5432/test');
    });

    it('should delete a notification by ID', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      });

      await channel.deleteNotification('notif_123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM turn_notifications'),
        ['notif_123']
      );
    });

    it('should throw error when notification does not exist', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      await expect(channel.deleteNotification('nonexistent_notif')).rejects.toThrow(
        'Notification not found'
      );
    });
  });

  describe('close', () => {
    beforeEach(() => {
      channel = new InAppNotificationChannel('postgresql://localhost:5432/test');
    });

    it('should close the database connection pool', async () => {
      mockPool.end.mockResolvedValueOnce(undefined);

      await channel.close();

      expect(mockPool.end).toHaveBeenCalled();
    });
  });
});
