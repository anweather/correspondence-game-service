import { useState, useMemo } from 'react';
import { GameClient } from '../api/gameClient';

/**
 * Custom hook for making API calls with loading and error state management
 */
export function useGameApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create a single client instance that persists across renders
  const client = useMemo(() => new GameClient(), []);

  /**
   * Execute an API call with automatic loading and error state management
   */
  const execute = async <T>(apiCall: () => Promise<T>): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiCall();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    client,
    loading,
    error,
    execute,
  };
}
