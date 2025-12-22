import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { GameClient } from '../api/gameClient';

/**
 * Player profile data structure
 */
export interface PlayerProfile {
  userId: string;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Custom hook for managing player profile data with caching
 * 
 * Features:
 * - Automatic profile loading on mount
 * - localStorage caching for instant display
 * - Profile update functionality
 * - Profile creation for new users
 * - Error handling
 * 
 * @returns Profile state and management functions
 */
export function useProfile() {
  const { getToken } = useAuth();
  
  const [profile, setProfile] = useState<PlayerProfile | null>(() => {
    // Try to load from cache immediately
    try {
      const cached = localStorage.getItem('playerProfile');
      if (cached) {
        const parsed = JSON.parse(cached);
        // Convert date strings back to Date objects
        return {
          ...parsed,
          createdAt: new Date(parsed.createdAt),
          updatedAt: new Date(parsed.updatedAt),
        };
      }
    } catch (error) {
      console.warn('Error loading cached profile:', error);
    }
    return null;
  });

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create client instance once and memoize it properly
  const client = useMemo(() => new GameClient('/api', getToken), [getToken]);

  /**
   * Cache profile in localStorage
   */
  const cacheProfile = (profileData: PlayerProfile | null) => {
    try {
      if (profileData) {
        localStorage.setItem('playerProfile', JSON.stringify(profileData));
      } else {
        localStorage.removeItem('playerProfile');
      }
    } catch (error) {
      console.warn('Error caching profile:', error);
    }
  };

  /**
   * Load profile from server
   */
  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const profileData = await client.getProfile();
      setProfile(profileData);
      cacheProfile(profileData);
      setError(null); // Clear any previous errors
    } catch (err: any) {
      // 404 means profile doesn't exist yet - not an error
      if (err.status === 404) {
        setProfile(null);
        cacheProfile(null);
        setError(null);
      } else {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
        setProfile(null);
        cacheProfile(null);
      }
    } finally {
      setLoading(false);
    }
  }, [client]);

  /**
   * Update profile display name
   */
  const updateProfile = useCallback(
    async (displayName: string): Promise<boolean> => {
      setUpdating(true);
      setError(null);

      try {
        const updatedProfile = await client.updateProfile(displayName);
        setProfile(updatedProfile);
        cacheProfile(updatedProfile);
        setError(null);
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
        return false;
      } finally {
        setUpdating(false);
      }
    },
    [client]
  );

  /**
   * Create new profile
   */
  const createProfile = useCallback(
    async (displayName?: string): Promise<boolean> => {
      setUpdating(true);
      setError(null);

      try {
        const newProfile = await client.createProfile(displayName);
        setProfile(newProfile);
        cacheProfile(newProfile);
        setError(null);
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
        return false;
      } finally {
        setUpdating(false);
      }
    },
    [client]
  );

  /**
   * Reload profile from server
   */
  const reload = useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return {
    profile,
    loading,
    updating,
    error,
    updateProfile,
    createProfile,
    reload,
  };
}
