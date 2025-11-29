import { Pool, PoolConfig } from 'pg';
import {
  INotificationChannel,
  NotificationData,
  NotificationType,
} from '@domain/interfaces/INotificationChannel';

/**
 * Stored notification record from database
 */
export interface StoredNotification {
  notificationId: string;
  userId: string;
  gameId: string;
  notificationType: NotificationType;
  message: string;
  metadata: Record<string, any> | null;
  status: 'pending' | 'sent' | 'read' | 'failed';
  createdAt: Date;
  sentAt: Date | null;
}

/**
 * In-app notification channel that stores notifications in the database
 * for display in the web UI
 */
export class InAppNotificationChannel implements INotificationChannel {
  private pool: Pool;

  constructor(connectionString: string, maxPoolSize: number = 10) {
    const config: PoolConfig = {
      connectionString,
      max: maxPoolSize,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 30000,
    };

    this.pool = new Pool(config);

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  /**
   * Get the name of this notification channel
   */
  getName(): string {
    return 'in-app';
  }

  /**
   * Check if the database connection is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1 as result');
      return true;
    } catch (error) {
      console.error('InAppNotificationChannel availability check failed:', error);
      return false;
    }
  }

  /**
   * Send a notification by storing it in the database
   * @param notification - The notification data to send
   */
  async send(notification: NotificationData): Promise<void> {
    try {
      // Extract type-specific metadata
      const metadata = this.extractMetadata(notification);

      const query = `
        INSERT INTO turn_notifications (
          user_id,
          game_id,
          notification_type,
          message,
          metadata,
          status,
          sent_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING 
          notification_id,
          user_id,
          game_id,
          notification_type,
          message,
          metadata,
          status,
          created_at,
          sent_at
      `;

      const values = [
        notification.userId,
        notification.gameId,
        notification.type,
        notification.message,
        JSON.stringify(metadata),
        'sent', // Mark as sent immediately for in-app notifications
      ];

      await this.pool.query(query, values);
    } catch (error) {
      console.error('Failed to send in-app notification:', error);
      throw error;
    }
  }

  /**
   * Extract type-specific metadata from notification
   */
  private extractMetadata(notification: NotificationData): Record<string, any> {
    const metadata: Record<string, any> = { ...notification.metadata };

    // Add type-specific fields to metadata
    switch (notification.type) {
      case NotificationType.TURN:
        if ('currentPlayer' in notification) {
          metadata.currentPlayer = notification.currentPlayer;
        }
        break;
      case NotificationType.INVITATION:
        if ('invitationId' in notification) {
          metadata.invitationId = notification.invitationId;
        }
        if ('inviterName' in notification) {
          metadata.inviterName = notification.inviterName;
        }
        break;
      case NotificationType.GAME_COMPLETE:
        if ('winner' in notification) {
          metadata.winner = notification.winner;
        }
        break;
    }

    return metadata;
  }

  /**
   * Retrieve notifications for a user
   * @param userId - The user ID to retrieve notifications for
   * @param status - Optional status filter
   */
  async getNotifications(
    userId: string,
    status?: 'pending' | 'sent' | 'read' | 'failed'
  ): Promise<StoredNotification[]> {
    try {
      let query = `
        SELECT 
          notification_id,
          user_id,
          game_id,
          notification_type,
          message,
          metadata,
          status,
          created_at,
          sent_at
        FROM turn_notifications
        WHERE user_id = $1
      `;

      const values: any[] = [userId];

      if (status) {
        query += ' AND status = $2';
        values.push(status);
      }

      query += ' ORDER BY created_at DESC';

      const result = await this.pool.query(query, values);

      return result.rows.map((row) => ({
        notificationId: row.notification_id,
        userId: row.user_id,
        gameId: row.game_id,
        notificationType: row.notification_type as NotificationType,
        message: row.message,
        metadata: row.metadata,
        status: row.status,
        createdAt: new Date(row.created_at),
        sentAt: row.sent_at ? new Date(row.sent_at) : null,
      }));
    } catch (error) {
      console.error('Failed to retrieve notifications:', error);
      throw error;
    }
  }

  /**
   * Mark a notification as read
   * @param notificationId - The notification ID to mark as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const query = `
        UPDATE turn_notifications
        SET status = 'read'
        WHERE notification_id = $1
        RETURNING notification_id
      `;

      const result = await this.pool.query(query, [notificationId]);

      if (result.rowCount === 0) {
        throw new Error('Notification not found');
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications for a user as read
   * @param userId - The user ID to mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const query = `
        UPDATE turn_notifications
        SET status = 'read'
        WHERE user_id = $1 AND status != 'read'
      `;

      await this.pool.query(query, [userId]);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete a notification
   * @param notificationId - The notification ID to delete
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const query = `
        DELETE FROM turn_notifications
        WHERE notification_id = $1
        RETURNING notification_id
      `;

      const result = await this.pool.query(query, [notificationId]);

      if (result.rowCount === 0) {
        throw new Error('Notification not found');
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw error;
    }
  }

  /**
   * Close the database connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
