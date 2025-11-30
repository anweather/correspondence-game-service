import {
  INotificationChannel,
  NotificationData,
  NotificationType,
  TurnNotificationData,
  InvitationNotificationData,
  GameCompleteNotificationData,
} from '@domain/interfaces/INotificationChannel';

/**
 * Service for managing notifications across multiple channels
 * Handles turn notifications, invitations, and game completion notifications
 * with support for delayed delivery and duplicate prevention
 */
export class NotificationService {
  private channels: INotificationChannel[];
  private notificationTracking: Map<string, Date>;

  constructor(channels: INotificationChannel[]) {
    this.channels = channels;
    this.notificationTracking = new Map();
  }

  /**
   * Send a turn notification to a user
   * @param userId - The user to notify
   * @param gameId - The game ID
   * @param delayMs - Optional delay in milliseconds before sending
   * @throws Error if userId or gameId is empty
   */
  async notifyTurn(userId: string, gameId: string, delayMs?: number): Promise<void> {
    // Validate inputs
    if (!userId || userId.trim() === '') {
      throw new Error('User ID cannot be empty');
    }
    if (!gameId || gameId.trim() === '') {
      throw new Error('Game ID cannot be empty');
    }

    // Check for duplicate notification
    const trackingKey = `${userId}:${gameId}`;
    if (this.notificationTracking.has(trackingKey)) {
      // Duplicate notification, skip
      return;
    }

    // Mark as tracked
    this.notificationTracking.set(trackingKey, new Date());

    // Create notification data
    const notification: TurnNotificationData = {
      type: NotificationType.TURN,
      userId,
      gameId,
      currentPlayer: userId,
      message: `It's your turn in game ${gameId}`,
    };

    // Handle delay
    if (delayMs && delayMs > 0) {
      await this.scheduleNotification(notification, delayMs);
    } else {
      await this.sendToChannels(notification);
    }
  }

  /**
   * Send an invitation notification to a user
   * @param userId - The user to notify
   * @param gameId - The game ID
   * @param invitationId - The invitation ID
   * @param inviterName - The name of the user who sent the invitation
   */
  async notifyInvitation(
    userId: string,
    gameId: string,
    invitationId: string,
    inviterName: string
  ): Promise<void> {
    const notification: InvitationNotificationData = {
      type: NotificationType.INVITATION,
      userId,
      gameId,
      invitationId,
      inviterName,
      message: `${inviterName} has invited you to join game ${gameId}`,
    };

    await this.sendToChannels(notification);
  }

  /**
   * Send a game complete notification to a user
   * @param userId - The user to notify
   * @param gameId - The game ID
   * @param winner - The winner's user ID, or null for a draw
   */
  async notifyGameComplete(userId: string, gameId: string, winner: string | null): Promise<void> {
    const message = winner
      ? `Game ${gameId} has ended. Winner: ${winner}`
      : `Game ${gameId} has ended in a draw`;

    const notification: GameCompleteNotificationData = {
      type: NotificationType.GAME_COMPLETE,
      userId,
      gameId,
      winner,
      message,
    };

    await this.sendToChannels(notification);
  }

  /**
   * Reset notification tracking for a specific user and game
   * This allows sending a new notification after a previous one was sent
   * @param userId - The user ID
   * @param gameId - The game ID
   */
  resetNotificationTracking(userId: string, gameId: string): void {
    const trackingKey = `${userId}:${gameId}`;
    this.notificationTracking.delete(trackingKey);
  }

  /**
   * Get the list of registered notification channels
   * @returns Array of notification channels
   */
  getChannels(): INotificationChannel[] {
    return [...this.channels];
  }

  /**
   * Schedule a notification to be sent after a delay
   * @param notification - The notification to send
   * @param delayMs - Delay in milliseconds
   */
  private async scheduleNotification(
    notification: NotificationData,
    delayMs: number
  ): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(async () => {
        await this.sendToChannels(notification);
        resolve();
      }, delayMs);
    });
  }

  /**
   * Send a notification through all available channels
   * Continues sending to other channels even if one fails
   * @param notification - The notification to send
   */
  private async sendToChannels(notification: NotificationData): Promise<void> {
    const sendPromises = this.channels.map(async (channel) => {
      try {
        // Check if channel is available
        const isAvailable = await channel.isAvailable();
        if (!isAvailable) {
          console.warn(`Channel ${channel.getName()} is not available, skipping`);
          return;
        }

        // Send notification
        await channel.send(notification);
      } catch (error) {
        // Log error but don't throw - continue with other channels
        console.error(`Failed to send notification through channel ${channel.getName()}:`, error);
      }
    });

    // Wait for all channels to complete (or fail)
    await Promise.all(sendPromises);
  }
}
