import type { Notification } from '../../context/NotificationContext';
import styles from './NotificationList.module.css';

export interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead: (notificationId: string) => void;
  onNavigate: (gameId: string) => void;
}

/**
 * NotificationList component
 * Displays a full list of notifications with click to navigate functionality
 * Requirements: 13.3, 13.4
 */
export function NotificationList({
  notifications,
  onMarkAsRead,
  onNavigate,
}: NotificationListProps) {
  /**
   * Handle notification click - mark as read and navigate to game
   */
  const handleNotificationClick = (notification: Notification) => {
    onMarkAsRead(notification.id);
    onNavigate(notification.gameId);
  };

  /**
   * Handle keyboard activation
   */
  const handleKeyDown = (
    event: React.KeyboardEvent,
    notification: Notification
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleNotificationClick(notification);
    }
  };

  /**
   * Format timestamp for display
   */
  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  /**
   * Get icon for notification type
   */
  const getNotificationIcon = (type: Notification['type']): string => {
    switch (type) {
      case 'turn':
        return '🎮';
      case 'invitation':
        return '✉️';
      case 'game_complete':
        return '🏆';
      default:
        return '📢';
    }
  };

  /**
   * Sort notifications by date (newest first)
   */
  const sortedNotifications = [...notifications].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  // Empty state
  if (notifications.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>🔔</div>
        <p className={styles.emptyMessage}>No notifications</p>
        <p className={styles.emptySubtext}>
          You'll see notifications here when there's activity in your games
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <ul className={styles.notificationList} role="list">
        {sortedNotifications.map((notification) => (
          <li
            key={notification.id}
            className={`${styles.notificationItem} ${
              !notification.read ? styles.unread : ''
            }`}
            onClick={() => handleNotificationClick(notification)}
            onKeyDown={(e) => handleKeyDown(e, notification)}
            role="listitem"
            tabIndex={0}
            aria-label={`${notification.message}${
              !notification.read ? ' (unread)' : ''
            }`}
          >
            <div className={styles.notificationIcon}>
              {getNotificationIcon(notification.type)}
            </div>

            <div className={styles.notificationContent}>
              <p className={styles.notificationMessage}>
                {notification.message}
              </p>
              <span className={styles.notificationTime}>
                {formatTimestamp(notification.createdAt)}
              </span>
            </div>

            {!notification.read && (
              <div
                className={styles.unreadIndicator}
                aria-label="Unread"
                title="Unread notification"
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
