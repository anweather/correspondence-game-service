/**
 * Player Identity
 * Maps player names to their persistent IDs
 */
export interface PlayerIdentity {
  name: string;
  id: string;
  createdAt: Date;
  lastUsed: Date;
}
