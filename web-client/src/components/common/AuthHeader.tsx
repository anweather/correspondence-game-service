import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import styles from './AuthHeader.module.css';

interface AuthHeaderProps {
  title: string;
  children?: React.ReactNode;
}

/**
 * AuthHeader component
 * Displays authentication status and controls
 */
export function AuthHeader({ title, children }: AuthHeaderProps) {
  return (
    <header className={styles.authHeader}>
      <div className={styles.headerLeft}>
        <h1>{title}</h1>
      </div>
      <div className={styles.headerRight}>
        {children}
        <div className={styles.authControls}>
          <SignedOut>
            <SignInButton mode="modal">
              <button className={styles.signInButton}>Sign In</button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
