import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';

interface ProtectedAdminRouteProps {
  children: ReactNode;
}

/**
 * Protected route component for admin access
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */
export function ProtectedAdminRoute({ children }: ProtectedAdminRouteProps) {
  const { user, isLoaded } = useUser();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !user) {
      return;
    }

    // Get admin user IDs from environment variable
    // In production, this should be fetched from the backend
    const adminIds = import.meta.env.VITE_ADMIN_USER_IDS || '';
    const adminIdList = adminIds.split(',').map((id: string) => id.trim()).filter(Boolean);

    if (adminIdList.includes(user.id)) {
      setIsAuthorized(true);
      setError(null);
    } else {
      setIsAuthorized(false);
      setError('Unauthorized: Admin access required');
    }
  }, [user, isLoaded]);

  // Still loading
  if (!isLoaded || isAuthorized === null) {
    return <div>Loading...</div>;
  }

  // Not authorized - redirect to player view with error
  if (!isAuthorized) {
    return (
      <Navigate 
        to="/" 
        replace 
        state={{ error }} 
      />
    );
  }

  // Authorized - render children
  return <>{children}</>;
}
