import { ReactNode } from 'react';
import { Header } from './Header';

interface PlayerLayoutProps {
  children: ReactNode;
  currentView: string;
}

/**
 * Layout wrapper for player views with header
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
export function PlayerLayout({ children, currentView }: PlayerLayoutProps) {
  return (
    <>
      <Header currentView={currentView} />
      {children}
    </>
  );
}
