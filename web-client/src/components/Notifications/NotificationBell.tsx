import { useState, useEffect, useRef } from 'react';
import type { Notification } from '../../context/NotificationContext';
import styles from './NotificationBell.module.css';

export interface NotificationBellProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (notificationId: string) => void;
  onClearAll: () => void;
}

/**
 * NotificationBell component
 * Displays a bell icon with unread count badge and dropdown list of notifications
 * Requirements: 13.3, 13.4
 */
export function NotificationBell({
  notifications,
  unreadCount,
  onMarkAsRead,
  onClearAll,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  /**
   * Toggle dropdown open/closed
   */
  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  /**
   * Handle notification click - mark as read
   */
  const handleNotificationClick = (notificationId: string) => {
    onMarkAsRead(notificationId);
  };

  /**
   * Handle clear all button click
   */
  const handleClearAll = () => {
    onClearAll();
    setIsOpen(false);
  };

  /**
   * Close dropdown when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  /**
   * Close dropdown on Escape key
   */
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle();
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

  const ariaLabel = unreadCount > 0 
    ? `Notifications: ${unreadCount} unread` 
    : 'Notifications';

  return (
    <div className={styles.container}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.bellButton}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className={styles.bellIcon} aria-hidden="true">
          🔔
        </span>
        {unreadCount > 0 && (
          <span className={styles.badge} aria-label={`${unreadCount} unread`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div ref={dropdownRef} className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <h3 className={styles.dropdownTitle}>Notifications</h3>
            {notifications.length > 0 && (
              <button
                type="button"
                className={styles.clearButton}
                onClick={handleClearAll}
                aria-label="Clear all notifications"
              >
                Clear all
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No notifications</p>
            </div>
          ) : (
            <ul className={styles.notificationList} role="list">
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={`${styles.notificationItem} ${
                    !notification.read ? styles.unread : ''
                  }`}
                  onClick={() => handleNotificationClick(notification.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleNotificationClick(notification.id);
                    }
                  }}
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
                    <div className={styles.unreadIndicator} aria-label="Unread" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
