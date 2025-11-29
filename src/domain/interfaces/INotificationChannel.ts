/**
 * Notification types
 */
export enum NotificationType {
  TURN = 'turn',
  INVITATION = 'invitation',
  GAME_COMPLETE = 'game_complete',
}

/**
 * Base notification data
 */
export interface NotificationData {
  type: NotificationType;
  userId: string;
  gameId: string;
  message: string;
  metadata?: Record<string, any>;
}

/**
 * Turn notification data
 */
export interface TurnNotificationData extends NotificationData {
  type: NotificationType.TURN;
  currentPlayer: string;
}

/**
 * Invitation notification data
 */
export interface InvitationNotificationData extends NotificationData {
  type: NotificationType.INVITATION;
  invitationId: string;
  inviterName: string;
}

/**
 * Game complete notification data
 */
export interface GameCompleteNotificationData extends NotificationData {
  type: NotificationType.GAME_COMPLETE;
  winner: string | null;
}

/**
 * Interface for notification channels (email, push, in-app, etc.)
 * Allows pluggable notification delivery mechanisms
 */
export interface INotificationChannel {
  /**
   * Get the name of this notification channel
   */
  getName(): string;

  /**
   * Send a notification through this channel
   * @param notification - The notification data to send
   * @returns Promise that resolves when notification is sent
   * @throws Error if notification fails to send
   */
  send(notification: NotificationData): Promise<void>;

  /**
   * Check if this channel is available/configured
   */
  isAvailable(): Promise<boolean>;
}
