import { NotificationService } from '@application/services/NotificationService';
import {
  INotificationChannel,
  NotificationData,
  NotificationType,
  TurnNotificationData,
} from '@domain/interfaces/INotificationChannel';

// Mock notification channel for testing
class MockNotificationChannel implements INotificationChannel {
  public sentNotifications: NotificationData[] = [];
  public shouldFail: boolean = false;
  public available: boolean = true;
  public name: string;

  constructor(name: string = 'mock-channel') {
    this.name = name;
  }

  getName(): string {
    return this.name;
  }

  async send(notification: NotificationData): Promise<void> {
    if (this.shouldFail) {
      throw new Error(`${this.name} failed to send notification`);
    }
    this.sentNotifications.push(notification);
  }

  async isAvailable(): Promise<boolean> {
    return this.available;
  }

  reset(): void {
    this.sentNotifications = [];
    this.shouldFail = false;
    this.available = true;
  }
}

describe('NotificationService', () => {
  let service: NotificationService;
  let mockChannel1: MockNotificationChannel;
  let mockChannel2: MockNotificationChannel;

  beforeEach(() => {
    mockChannel1 = new MockNotificationChannel('channel-1');
    mockChannel2 = new MockNotificationChannel('channel-2');
  });

  describe('constructor', () => {
    it('should create a NotificationService with notification channels', () => {
      service = new NotificationService([mockChannel1, mockChannel2]);

      expect(service).toBeInstanceOf(NotificationService);
    });

    it('should create a NotificationService with empty channels array', () => {
      service = new NotificationService([]);

      expect(service).toBeInstanceOf(NotificationService);
    });
  });

  describe('notifyTurn - basic functionality', () => {
    beforeEach(() => {
      service = new NotificationService([mockChannel1]);
    });

    it('should send turn notification immediately when no delay is specified', async () => {
      await service.notifyTurn('user_123', 'game_456');

      expect(mockChannel1.sentNotifications).toHaveLength(1);
      expect(mockChannel1.sentNotifications[0]).toMatchObject({
        type: NotificationType.TURN,
        userId: 'user_123',
        gameId: 'game_456',
        message: expect.stringContaining('your turn'),
      });
    });

    it('should send turn notification with correct data structure', async () => {
      await service.notifyTurn('user_123', 'game_456');

      const notification = mockChannel1.sentNotifications[0] as TurnNotificationData;
      expect(notification.type).toBe(NotificationType.TURN);
      expect(notification.userId).toBe('user_123');
      expect(notification.gameId).toBe('game_456');
      expect(notification.currentPlayer).toBe('user_123');
      expect(notification.message).toBeTruthy();
    });
  });

  describe('notifyTurn - with delay', () => {
    beforeEach(() => {
      service = new NotificationService([mockChannel1]);
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should delay notification when delay is specified', async () => {
      const notifyPromise = service.notifyTurn('user_123', 'game_456', 5000);

      // Notification should not be sent immediately
      expect(mockChannel1.sentNotifications).toHaveLength(0);

      // Fast-forward time by 5 seconds
      jest.advanceTimersByTime(5000);

      // Wait for the promise to resolve
      await notifyPromise;

      // Notification should now be sent
      expect(mockChannel1.sentNotifications).toHaveLength(1);
    });

    it('should not send notification before delay expires', async () => {
      const notifyPromise = service.notifyTurn('user_123', 'game_456', 10000);

      // Fast-forward time by 5 seconds (half the delay)
      jest.advanceTimersByTime(5000);

      // Notification should not be sent yet
      expect(mockChannel1.sentNotifications).toHaveLength(0);

      // Fast-forward remaining time
      jest.advanceTimersByTime(5000);
      await notifyPromise;

      // Now notification should be sent
      expect(mockChannel1.sentNotifications).toHaveLength(1);
    });

    it('should handle multiple delayed notifications independently', async () => {
      const notify1 = service.notifyTurn('user_1', 'game_1', 1000);
      const notify2 = service.notifyTurn('user_2', 'game_2', 2000);

      // Fast-forward 1 second
      jest.advanceTimersByTime(1000);
      await notify1;

      // First notification should be sent
      expect(mockChannel1.sentNotifications).toHaveLength(1);
      expect(mockChannel1.sentNotifications[0].userId).toBe('user_1');

      // Fast-forward another second
      jest.advanceTimersByTime(1000);
      await notify2;

      // Second notification should now be sent
      expect(mockChannel1.sentNotifications).toHaveLength(2);
      expect(mockChannel1.sentNotifications[1].userId).toBe('user_2');
    });
  });

  describe('notifyTurn - duplicate prevention', () => {
    beforeEach(() => {
      service = new NotificationService([mockChannel1]);
    });

    it('should prevent duplicate notifications for same user and game', async () => {
      await service.notifyTurn('user_123', 'game_456');
      await service.notifyTurn('user_123', 'game_456');

      // Should only send one notification
      expect(mockChannel1.sentNotifications).toHaveLength(1);
    });

    it('should allow notifications for different users in same game', async () => {
      await service.notifyTurn('user_1', 'game_456');
      await service.notifyTurn('user_2', 'game_456');

      // Should send both notifications
      expect(mockChannel1.sentNotifications).toHaveLength(2);
      expect(mockChannel1.sentNotifications[0].userId).toBe('user_1');
      expect(mockChannel1.sentNotifications[1].userId).toBe('user_2');
    });

    it('should allow notifications for same user in different games', async () => {
      await service.notifyTurn('user_123', 'game_1');
      await service.notifyTurn('user_123', 'game_2');

      // Should send both notifications
      expect(mockChannel1.sentNotifications).toHaveLength(2);
      expect(mockChannel1.sentNotifications[0].gameId).toBe('game_1');
      expect(mockChannel1.sentNotifications[1].gameId).toBe('game_2');
    });

    it('should reset duplicate tracking after successful notification', async () => {
      await service.notifyTurn('user_123', 'game_456');

      // Clear the sent notifications to simulate time passing
      mockChannel1.sentNotifications = [];

      // Reset the tracking (simulating a new turn)
      service.resetNotificationTracking('user_123', 'game_456');

      await service.notifyTurn('user_123', 'game_456');

      // Should send the notification again
      expect(mockChannel1.sentNotifications).toHaveLength(1);
    });
  });

  describe('notifyTurn - multiple channels', () => {
    beforeEach(() => {
      service = new NotificationService([mockChannel1, mockChannel2]);
    });

    it('should send notification through all available channels', async () => {
      await service.notifyTurn('user_123', 'game_456');

      expect(mockChannel1.sentNotifications).toHaveLength(1);
      expect(mockChannel2.sentNotifications).toHaveLength(1);
    });

    it('should send same notification data to all channels', async () => {
      await service.notifyTurn('user_123', 'game_456');

      const notif1 = mockChannel1.sentNotifications[0];
      const notif2 = mockChannel2.sentNotifications[0];

      expect(notif1).toMatchObject({
        type: notif2.type,
        userId: notif2.userId,
        gameId: notif2.gameId,
        message: notif2.message,
      });
    });

    it('should skip unavailable channels', async () => {
      mockChannel2.available = false;

      await service.notifyTurn('user_123', 'game_456');

      expect(mockChannel1.sentNotifications).toHaveLength(1);
      expect(mockChannel2.sentNotifications).toHaveLength(0);
    });
  });

  describe('notifyTurn - error handling', () => {
    beforeEach(() => {
      service = new NotificationService([mockChannel1, mockChannel2]);
    });

    it('should continue sending to other channels when one fails', async () => {
      mockChannel1.shouldFail = true;

      await service.notifyTurn('user_123', 'game_456');

      // Channel 1 should have failed, but channel 2 should succeed
      expect(mockChannel1.sentNotifications).toHaveLength(0);
      expect(mockChannel2.sentNotifications).toHaveLength(1);
    });

    it('should not throw error when all channels fail', async () => {
      mockChannel1.shouldFail = true;
      mockChannel2.shouldFail = true;

      // Should not throw
      await expect(service.notifyTurn('user_123', 'game_456')).resolves.not.toThrow();
    });

    it('should log errors when channel fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockChannel1.shouldFail = true;

      await service.notifyTurn('user_123', 'game_456');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send notification'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('notifyInvitation', () => {
    beforeEach(() => {
      service = new NotificationService([mockChannel1]);
    });

    it('should send invitation notification', async () => {
      await service.notifyInvitation('user_123', 'game_456', 'inv_789', 'alice');

      expect(mockChannel1.sentNotifications).toHaveLength(1);
      expect(mockChannel1.sentNotifications[0]).toMatchObject({
        type: NotificationType.INVITATION,
        userId: 'user_123',
        gameId: 'game_456',
      });
    });

    it('should include invitation metadata', async () => {
      await service.notifyInvitation('user_123', 'game_456', 'inv_789', 'alice');

      const notification = mockChannel1.sentNotifications[0];
      expect(notification).toHaveProperty('invitationId', 'inv_789');
      expect(notification).toHaveProperty('inviterName', 'alice');
    });

    it('should send invitation through all channels', async () => {
      service = new NotificationService([mockChannel1, mockChannel2]);

      await service.notifyInvitation('user_123', 'game_456', 'inv_789', 'alice');

      expect(mockChannel1.sentNotifications).toHaveLength(1);
      expect(mockChannel2.sentNotifications).toHaveLength(1);
    });
  });

  describe('notifyGameComplete', () => {
    beforeEach(() => {
      service = new NotificationService([mockChannel1]);
    });

    it('should send game complete notification with winner', async () => {
      await service.notifyGameComplete('user_123', 'game_456', 'user_789');

      expect(mockChannel1.sentNotifications).toHaveLength(1);
      expect(mockChannel1.sentNotifications[0]).toMatchObject({
        type: NotificationType.GAME_COMPLETE,
        userId: 'user_123',
        gameId: 'game_456',
      });
    });

    it('should send game complete notification with no winner (draw)', async () => {
      await service.notifyGameComplete('user_123', 'game_456', null);

      expect(mockChannel1.sentNotifications).toHaveLength(1);
      const notification = mockChannel1.sentNotifications[0];
      expect(notification).toHaveProperty('winner', null);
    });

    it('should send game complete through all channels', async () => {
      service = new NotificationService([mockChannel1, mockChannel2]);

      await service.notifyGameComplete('user_123', 'game_456', 'user_789');

      expect(mockChannel1.sentNotifications).toHaveLength(1);
      expect(mockChannel2.sentNotifications).toHaveLength(1);
    });
  });

  describe('getChannels', () => {
    it('should return list of registered channels', () => {
      service = new NotificationService([mockChannel1, mockChannel2]);

      const channels = service.getChannels();

      expect(channels).toHaveLength(2);
      expect(channels[0].getName()).toBe('channel-1');
      expect(channels[1].getName()).toBe('channel-2');
    });

    it('should return empty array when no channels registered', () => {
      service = new NotificationService([]);

      const channels = service.getChannels();

      expect(channels).toEqual([]);
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      service = new NotificationService([mockChannel1]);
    });

    it('should handle empty user ID', async () => {
      await expect(service.notifyTurn('', 'game_456')).rejects.toThrow();
    });

    it('should handle empty game ID', async () => {
      await expect(service.notifyTurn('user_123', '')).rejects.toThrow();
    });

    it('should handle negative delay', async () => {
      // Negative delay should be treated as immediate
      await service.notifyTurn('user_123', 'game_456', -1000);

      expect(mockChannel1.sentNotifications).toHaveLength(1);
    });

    it('should handle zero delay', async () => {
      await service.notifyTurn('user_123', 'game_456', 0);

      expect(mockChannel1.sentNotifications).toHaveLength(1);
    });
  });
});
