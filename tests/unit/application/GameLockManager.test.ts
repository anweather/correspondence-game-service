import { GameLockManager } from '@application/GameLockManager';

describe('GameLockManager', () => {
  let lockManager: GameLockManager;

  beforeEach(() => {
    lockManager = new GameLockManager();
  });

  describe('sequential processing of operations on same game', () => {
    it('should process operations sequentially for the same game', async () => {
      const gameId = 'game-1';
      const executionOrder: number[] = [];

      // Create three operations that should execute sequentially
      const operation1 = lockManager.withLock(gameId, async () => {
        executionOrder.push(1);
        await new Promise(resolve => setTimeout(resolve, 50));
        executionOrder.push(2);
        return 'result1';
      });

      const operation2 = lockManager.withLock(gameId, async () => {
        executionOrder.push(3);
        await new Promise(resolve => setTimeout(resolve, 50));
        executionOrder.push(4);
        return 'result2';
      });

      const operation3 = lockManager.withLock(gameId, async () => {
        executionOrder.push(5);
        return 'result3';
      });

      const results = await Promise.all([operation1, operation2, operation3]);

      // Verify operations executed sequentially
      expect(executionOrder).toEqual([1, 2, 3, 4, 5]);
      expect(results).toEqual(['result1', 'result2', 'result3']);
    });

    it('should maintain order even with fast operations', async () => {
      const gameId = 'game-2';
      const executionOrder: string[] = [];

      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          lockManager.withLock(gameId, async () => {
            executionOrder.push(`op-${i}`);
            return i;
          })
        );
      }

      await Promise.all(promises);

      expect(executionOrder).toEqual(['op-0', 'op-1', 'op-2', 'op-3', 'op-4']);
    });

    it('should return correct results from sequential operations', async () => {
      const gameId = 'game-3';
      let counter = 0;

      const increment = () =>
        lockManager.withLock(gameId, async () => {
          const current = counter;
          await new Promise(resolve => setTimeout(resolve, 10));
          counter = current + 1;
          return counter;
        });

      const results = await Promise.all([
        increment(),
        increment(),
        increment(),
      ]);

      expect(results).toEqual([1, 2, 3]);
      expect(counter).toBe(3);
    });
  });

  describe('concurrent operations on different games', () => {
    it('should allow concurrent operations on different games', async () => {
      const game1 = 'game-1';
      const game2 = 'game-2';
      const startTimes: Record<string, number> = {};
      const endTimes: Record<string, number> = {};

      const operation1 = lockManager.withLock(game1, async () => {
        startTimes[game1] = Date.now();
        await new Promise(resolve => setTimeout(resolve, 100));
        endTimes[game1] = Date.now();
        return 'result1';
      });

      const operation2 = lockManager.withLock(game2, async () => {
        startTimes[game2] = Date.now();
        await new Promise(resolve => setTimeout(resolve, 100));
        endTimes[game2] = Date.now();
        return 'result2';
      });

      const results = await Promise.all([operation1, operation2]);

      expect(results).toEqual(['result1', 'result2']);
      
      // Both operations should have started around the same time (within 50ms)
      const timeDiff = Math.abs(startTimes[game1] - startTimes[game2]);
      expect(timeDiff).toBeLessThan(50);
    });

    it('should handle multiple games with multiple operations each', async () => {
      const executionLog: string[] = [];

      const createOperations = (gameId: string, count: number) => {
        return Array.from({ length: count }, (_, i) =>
          lockManager.withLock(gameId, async () => {
            executionLog.push(`${gameId}-op${i}-start`);
            await new Promise(resolve => setTimeout(resolve, 10));
            executionLog.push(`${gameId}-op${i}-end`);
            return `${gameId}-${i}`;
          })
        );
      };

      const game1Ops = createOperations('game-1', 3);
      const game2Ops = createOperations('game-2', 3);
      const game3Ops = createOperations('game-3', 2);

      await Promise.all([...game1Ops, ...game2Ops, ...game3Ops]);

      // Verify each game's operations were sequential
      const game1Log = executionLog.filter(log => log.startsWith('game-1'));
      expect(game1Log).toEqual([
        'game-1-op0-start',
        'game-1-op0-end',
        'game-1-op1-start',
        'game-1-op1-end',
        'game-1-op2-start',
        'game-1-op2-end',
      ]);

      const game2Log = executionLog.filter(log => log.startsWith('game-2'));
      expect(game2Log).toEqual([
        'game-2-op0-start',
        'game-2-op0-end',
        'game-2-op1-start',
        'game-2-op1-end',
        'game-2-op2-start',
        'game-2-op2-end',
      ]);
    });
  });

  describe('lock cleanup after operation', () => {
    it('should clean up lock after successful operation', async () => {
      const gameId = 'game-1';

      await lockManager.withLock(gameId, async () => {
        return 'result';
      });

      // Verify lock is cleaned up by checking that a new operation can start immediately
      const startTime = Date.now();
      await lockManager.withLock(gameId, async () => {
        const elapsed = Date.now() - startTime;
        // Should start immediately (within 10ms) if lock was cleaned up
        expect(elapsed).toBeLessThan(10);
        return 'result2';
      });
    });

    it('should clean up lock after operation throws error', async () => {
      const gameId = 'game-2';

      await expect(
        lockManager.withLock(gameId, async () => {
          throw new Error('Operation failed');
        })
      ).rejects.toThrow('Operation failed');

      // Verify lock is cleaned up even after error
      const result = await lockManager.withLock(gameId, async () => {
        return 'success';
      });

      expect(result).toBe('success');
    });

    it('should handle multiple cleanup cycles', async () => {
      const gameId = 'game-3';

      for (let i = 0; i < 5; i++) {
        const result = await lockManager.withLock(gameId, async () => {
          return `iteration-${i}`;
        });
        expect(result).toBe(`iteration-${i}`);
      }

      // Final operation should still work
      const finalResult = await lockManager.withLock(gameId, async () => {
        return 'final';
      });
      expect(finalResult).toBe('final');
    });

    it('should not interfere with locks on other games during cleanup', async () => {
      const game1 = 'game-1';
      const game2 = 'game-2';

      // Start operation on game1
      const op1 = lockManager.withLock(game1, async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'game1-result';
      });

      // Start and complete operation on game2
      await lockManager.withLock(game2, async () => {
        return 'game2-result';
      });

      // game2 should be cleaned up, game1 should still be locked
      const game2Op2 = lockManager.withLock(game2, async () => {
        return 'game2-result2';
      });

      const [result1, result2] = await Promise.all([op1, game2Op2]);

      expect(result1).toBe('game1-result');
      expect(result2).toBe('game2-result2');
    });
  });

  describe('error handling within locked operations', () => {
    it('should propagate errors from locked operations', async () => {
      const gameId = 'game-1';

      await expect(
        lockManager.withLock(gameId, async () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');
    });

    it('should propagate custom error types', async () => {
      const gameId = 'game-2';

      class CustomError extends Error {
        constructor(message: string, public code: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      await expect(
        lockManager.withLock(gameId, async () => {
          throw new CustomError('Custom error message', 'CUSTOM_CODE');
        })
      ).rejects.toThrow(CustomError);

      try {
        await lockManager.withLock(gameId, async () => {
          throw new CustomError('Custom error message', 'CUSTOM_CODE');
        });
      } catch (error) {
        expect(error).toBeInstanceOf(CustomError);
        expect((error as CustomError).code).toBe('CUSTOM_CODE');
      }
    });

    it('should continue processing subsequent operations after error', async () => {
      const gameId = 'game-3';
      const results: string[] = [];

      const op1 = lockManager
        .withLock(gameId, async () => {
          results.push('op1');
          throw new Error('Op1 failed');
        })
        .catch((err: Error) => `error: ${err.message}`);

      const op2 = lockManager.withLock(gameId, async () => {
        results.push('op2');
        return 'op2-success';
      });

      const op3 = lockManager.withLock(gameId, async () => {
        results.push('op3');
        return 'op3-success';
      });

      const [result1, result2, result3] = await Promise.all([op1, op2, op3]);

      expect(results).toEqual(['op1', 'op2', 'op3']);
      expect(result1).toBe('error: Op1 failed');
      expect(result2).toBe('op2-success');
      expect(result3).toBe('op3-success');
    });

    it('should handle errors in middle of operation queue', async () => {
      const gameId = 'game-4';
      const executionOrder: string[] = [];

      const op1 = lockManager.withLock(gameId, async () => {
        executionOrder.push('op1');
        return 'success1';
      });

      const op2 = lockManager
        .withLock(gameId, async () => {
          executionOrder.push('op2');
          throw new Error('Op2 failed');
        })
        .catch((err: Error) => `caught: ${err.message}`);

      const op3 = lockManager.withLock(gameId, async () => {
        executionOrder.push('op3');
        return 'success3';
      });

      const results = await Promise.all([op1, op2, op3]);

      expect(executionOrder).toEqual(['op1', 'op2', 'op3']);
      expect(results).toEqual(['success1', 'caught: Op2 failed', 'success3']);
    });

    it('should maintain lock integrity when operation rejects', async () => {
      const gameId = 'game-5';
      let counter = 0;

      const increment = async (shouldFail: boolean) => {
        try {
          return await lockManager.withLock(gameId, async () => {
            const current = counter;
            await new Promise(resolve => setTimeout(resolve, 10));
            if (shouldFail) {
              throw new Error('Intentional failure');
            }
            counter = current + 1;
            return counter;
          });
        } catch (error) {
          return -1;
        }
      };

      const results = await Promise.all([
        increment(false), // Should succeed: counter = 1
        increment(true),  // Should fail: counter stays 1
        increment(false), // Should succeed: counter = 2
      ]);

      expect(results).toEqual([1, -1, 2]);
      expect(counter).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('should handle empty game ID', async () => {
      const result = await lockManager.withLock('', async () => {
        return 'result';
      });

      expect(result).toBe('result');
    });

    it('should handle very long game IDs', async () => {
      const longGameId = 'a'.repeat(1000);
      const result = await lockManager.withLock(longGameId, async () => {
        return 'result';
      });

      expect(result).toBe('result');
    });

    it('should handle operations that return undefined', async () => {
      const gameId = 'game-1';
      const result = await lockManager.withLock(gameId, async () => {
        return undefined;
      });

      expect(result).toBeUndefined();
    });

    it('should handle operations that return null', async () => {
      const gameId = 'game-2';
      const result = await lockManager.withLock(gameId, async () => {
        return null;
      });

      expect(result).toBeNull();
    });

    it('should handle operations with different return types', async () => {
      const gameId = 'game-3';

      const stringResult = await lockManager.withLock(gameId, async () => 'string');
      const numberResult = await lockManager.withLock(gameId, async () => 42);
      const objectResult = await lockManager.withLock(gameId, async () => ({ key: 'value' }));
      const arrayResult = await lockManager.withLock(gameId, async () => [1, 2, 3]);

      expect(stringResult).toBe('string');
      expect(numberResult).toBe(42);
      expect(objectResult).toEqual({ key: 'value' });
      expect(arrayResult).toEqual([1, 2, 3]);
    });
  });
});
