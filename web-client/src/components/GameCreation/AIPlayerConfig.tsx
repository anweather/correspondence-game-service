import React, { useState, useEffect } from 'react';
import { AIPlayerConfig as AIPlayerConfigType, AIStrategy } from '../../types/game';
import { useAIStrategies } from '../../hooks/useAIStrategies';
import styles from './AIPlayerConfig.module.css';

interface AIPlayerConfigProps {
  gameType: string;
  maxPlayers: number;
  currentPlayerCount: number;
  onAIPlayersChange: (aiPlayers: AIPlayerConfigType[]) => void;
}

export function AIPlayerConfig({ 
  gameType, 
  maxPlayers, 
  currentPlayerCount, 
  onAIPlayersChange 
}: AIPlayerConfigProps) {
  const [enableAI, setEnableAI] = useState(false);
  const [aiPlayerCount, setAIPlayerCount] = useState(1);
  const [aiPlayers, setAIPlayers] = useState<AIPlayerConfigType[]>([]);
  
  const { strategies, loading: strategiesLoading, error: strategiesError } = useAIStrategies(gameType);

  const maxAIPlayers = maxPlayers - currentPlayerCount;

  // Initialize AI players when count changes
  useEffect(() => {
    if (enableAI && aiPlayerCount > 0) {
      const newAIPlayers: AIPlayerConfigType[] = [];
      
      for (let i = 0; i < aiPlayerCount; i++) {
        const existingPlayer = aiPlayers[i];
        newAIPlayers.push({
          name: existingPlayer?.name || `AI Player ${i + 1}`,
          strategyId: existingPlayer?.strategyId || strategies[0]?.id,
          difficulty: existingPlayer?.difficulty || strategies[0]?.difficulty,
          configuration: existingPlayer?.configuration || {}
        });
      }
      
      setAIPlayers(newAIPlayers);
      onAIPlayersChange(newAIPlayers);
    } else {
      setAIPlayers([]);
      onAIPlayersChange([]);
    }
  }, [enableAI, aiPlayerCount, strategies, onAIPlayersChange]);

  // Update AI player configuration
  const updateAIPlayer = (index: number, updates: Partial<AIPlayerConfigType>) => {
    const updatedPlayers = aiPlayers.map((player, i) => 
      i === index ? { ...player, ...updates } : player
    );
    setAIPlayers(updatedPlayers);
    onAIPlayersChange(updatedPlayers);
  };

  // Don't show AI config if no strategies available or loading
  if (strategiesLoading) {
    return <div className={styles.loading}>Loading AI options...</div>;
  }

  if (strategiesError) {
    return <div className={styles.error}>Error loading AI options: {strategiesError}</div>;
  }

  if (!strategies || strategies.length === 0) {
    return null; // Game doesn't support AI
  }

  if (maxAIPlayers <= 0) {
    return (
      <div className={styles.warning}>
        Maximum players reached. Cannot add AI players.
      </div>
    );
  }

  return (
    <div className={styles.aiConfig}>
      <div className={styles.header}>
        <label className={styles.enableCheckbox}>
          <input
            type="checkbox"
            checked={enableAI}
            onChange={(e) => setEnableAI(e.target.checked)}
          />
          <span>Add AI Players</span>
        </label>
        {strategies.length > 0 && (
          <span className={styles.aiSupported}>✓ AI Supported</span>
        )}
      </div>

      {enableAI && (
        <div className={styles.configSection}>
          <div className={styles.formGroup}>
            <label htmlFor="ai-count-select">Number of AI Players</label>
            <select
              id="ai-count-select"
              value={aiPlayerCount}
              onChange={(e) => setAIPlayerCount(parseInt(e.target.value))}
              className={styles.select}
            >
              {Array.from({ length: maxAIPlayers }, (_, i) => i + 1).map(count => (
                <option key={count} value={count}>
                  {count} AI Player{count > 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.aiPlayersList}>
            {aiPlayers.map((aiPlayer, index) => (
              <div key={index} className={styles.aiPlayerCard}>
                <h4>AI Player {index + 1}</h4>
                
                <div className={styles.formGroup}>
                  <label htmlFor={`ai-name-${index}`}>Name</label>
                  <input
                    id={`ai-name-${index}`}
                    type="text"
                    value={aiPlayer.name}
                    onChange={(e) => updateAIPlayer(index, { name: e.target.value })}
                    placeholder={`AI Player ${index + 1}`}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor={`ai-strategy-${index}`}>Strategy</label>
                  <select
                    id={`ai-strategy-${index}`}
                    value={aiPlayer.strategyId || ''}
                    onChange={(e) => {
                      const selectedStrategy = strategies.find(s => s.id === e.target.value);
                      updateAIPlayer(index, { 
                        strategyId: e.target.value,
                        difficulty: selectedStrategy?.difficulty 
                      });
                    }}
                    className={styles.select}
                  >
                    {strategies.map(strategy => (
                      <option key={strategy.id} value={strategy.id}>
                        {strategy.name}
                        {strategy.difficulty && ` (${strategy.difficulty})`}
                      </option>
                    ))}
                  </select>
                  {strategies.find(s => s.id === aiPlayer.strategyId)?.description && (
                    <p className={styles.strategyDescription}>
                      {strategies.find(s => s.id === aiPlayer.strategyId)?.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.preview}>
            <h4>Game Setup Preview</h4>
            <div className={styles.playerSummary}>
              <span>Human Players: {currentPlayerCount}</span>
              <span>AI Players: {aiPlayers.length}</span>
              <span>Total: {currentPlayerCount + aiPlayers.length} / {maxPlayers}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}