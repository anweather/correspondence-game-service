import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import { usePlayer } from '../../context/PlayerContext';
import { useNotifications } from '../../context/NotificationContext';
import { NotificationBell } from '../Notifications/NotificationBell';
import styles from './Header.module.css';

interface HeaderProps {
  currentView: string;
}

/**
 * Header component
 * Displays persistent navigation across all player views
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 16.1, 16.2, 16.3, 16.4, 16.5
 */
export function Header({ currentView }: HeaderProps) {
  const { displayName } = usePlayer();
  const { notifications, unreadCount, markAsRead, clearAll } = useNotifications();

  const navLinks = [
    { name: 'Home', path: '/', view: 'home' },
    { name: 'Lobby', path: '/lobby', view: 'lobby' },
    { name: 'My Games', path: '/games', view: 'games' },
    { name: 'Stats', path: '/stats', view: 'stats' },
    { name: 'Leaderboard', path: '/leaderboard', view: 'leaderboard' },
  ];

  return (
    <header className={styles.header} role="banner">
      <nav className={styles.nav} role="navigation">
        <SignedIn>
          <div className={styles.navLinks}>
            {navLinks.map((link) => (
              <a
                key={link.view}
                href={link.path}
                className={`${styles.navLink} ${
                  currentView === link.view ? styles.active : ''
                }`}
                aria-current={currentView === link.view ? 'page' : undefined}
              >
                {link.name}
              </a>
            ))}
          </div>
        </SignedIn>

        <SignedOut>
          <div className={styles.navLinks}>
            <h1 className={styles.appTitle}>Async Boardgame</h1>
          </div>
        </SignedOut>

        <div className={styles.profileSection}>
          <SignedIn>
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAsRead={markAsRead}
              onClearAll={clearAll}
            />

            <a
              href="/profile"
              className={`${styles.profileLink} ${
                currentView === 'profile' ? styles.active : ''
              }`}
              aria-current={currentView === 'profile' ? 'page' : undefined}
            >
              <span className={styles.displayName}>{displayName}</span>
            </a>

            <div className={styles.userButton}>
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>

          <SignedOut>
            <div className={styles.signInButton}>
              <SignInButton mode="modal" />
            </div>
          </SignedOut>
        </div>
      </nav>
    </header>
  );
}
