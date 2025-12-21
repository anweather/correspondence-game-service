import { useState, useEffect } from 'react';
import { AIStrategy } from '../types/game';
import { GameClient } from '../api/gameClient';
import { useAuth } from '@clerk/clerk-react';

/**
 * Custom hook for managing AI strategies for a specific game type
 */
export function useAIStrategies(gameType?: string) {
  const [strategies, setStrategies] = useState<AIStrategy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();

  useEffect(() => {
    if (!gameType) {
      setStrategies([]);
      setError(null);
      return;
    }

    const fetchStrategies = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const gameClient = new GameClient('/api', getToken);
        const fetchedStrategies = await gameClient.getAIStrategies(gameType);
        setStrategies(fetchedStrategies);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch AI strategies';
        setError(errorMessage);
        setStrategies([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStrategies();
  }, [gameType, getToken]);

  return {
    strategies,
    loading,
    error,
    refetch: () => {
      if (gameType) {
        // Trigger re-fetch by updating a dependency
        setError(null);
        setStrategies([]);
      }
    }
  };
}