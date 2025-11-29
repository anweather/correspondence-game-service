/**
 * Invitation status enum
 */
export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  EXPIRED = 'expired',
}

/**
 * Game Invitation
 * Represents an invitation for a player to join a game
 */
export interface GameInvitation {
  /** Unique invitation ID */
  invitationId: string;
  /** ID of the game being invited to */
  gameId: string;
  /** User ID of the player sending the invitation */
  inviterId: string;
  /** User ID of the player receiving the invitation */
  inviteeId: string;
  /** Current status of the invitation */
  status: InvitationStatus;
  /** Timestamp when invitation was created */
  createdAt: Date;
  /** Timestamp when invitation was responded to (accepted/declined) */
  respondedAt?: Date;
}

/**
 * Default expiration duration for invitations (7 days in milliseconds)
 */
const DEFAULT_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Checks if an invitation has expired based on its creation time
 * 
 * @param invitation - The invitation to check
 * @param expirationMs - Optional custom expiration duration in milliseconds (default: 7 days)
 * @returns true if the invitation is expired, false otherwise
 */
export function isInvitationExpired(
  invitation: GameInvitation,
  expirationMs: number = DEFAULT_EXPIRATION_MS
): boolean {
  // Already responded invitations don't expire
  if (invitation.status === InvitationStatus.ACCEPTED || 
      invitation.status === InvitationStatus.DECLINED) {
    return false;
  }

  const now = new Date();
  const ageMs = now.getTime() - invitation.createdAt.getTime();
  
  return ageMs >= expirationMs;
}
