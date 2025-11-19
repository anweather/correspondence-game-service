/**
 * GameLockManager provides per-game-instance locking to ensure
 * sequential processing of operations on the same game while allowing
 * concurrent operations on different games.
 */
export class GameLockManager {
  private locks: Map<string, Promise<unknown>>;

  constructor() {
    this.locks = new Map();
  }

  /**
   * Executes a function with exclusive access to a specific game instance.
   * Operations on the same gameId are processed sequentially.
   * Operations on different gameIds can run concurrently.
   *
   * @param gameId - The unique identifier of the game instance
   * @param fn - The async function to execute with the lock
   * @returns The result of the function execution
   * @throws Any error thrown by the function
   */
  async withLock<T>(gameId: string, fn: () => Promise<T>): Promise<T> {
    // Get the current lock promise for this game (if any)
    const currentLock = this.locks.get(gameId) || Promise.resolve();

    // Create a new promise that waits for the current lock and then executes fn
    // We need to catch errors in the chain to prevent breaking subsequent operations
    const newLock = currentLock
      .catch(() => {
        // Ignore errors from previous operations in the chain
        // Each operation handles its own errors
      })
      .then(() => fn());

    // Store the new lock promise
    this.locks.set(gameId, newLock);

    // Wait for the operation to complete and clean up
    try {
      const result = await newLock;
      // Clean up: remove the lock if this is still the current lock
      if (this.locks.get(gameId) === newLock) {
        this.locks.delete(gameId);
      }
      return result;
    } catch (error) {
      // Clean up even on error
      if (this.locks.get(gameId) === newLock) {
        this.locks.delete(gameId);
      }
      throw error;
    }
  }
}
