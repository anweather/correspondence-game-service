import { GameInvitation, InvitationStatus } from '../models/GameInvitation';

/**
 * Parameters for creating a new game invitation
 */
export interface CreateInvitationParams {
  gameId: string;
  inviterId: string;
  inviteeId: string;
}

/**
 * Filters for querying invitations
 */
export interface InvitationFilters {
  status?: InvitationStatus;
  gameId?: string;
  inviterId?: string;
  inviteeId?: string;
}

/**
 * Repository interface for game invitation persistence
 */
export interface IInvitationRepository {
  /**
   * Create a new game invitation
   */
  create(params: CreateInvitationParams): Promise<GameInvitation>;

  /**
   * Find an invitation by ID
   */
  findById(invitationId: string): Promise<GameInvitation | null>;

  /**
   * Find invitations for a user (as invitee)
   */
  findByInvitee(inviteeId: string, filters?: InvitationFilters): Promise<GameInvitation[]>;

  /**
   * Find invitations sent by a user (as inviter)
   */
  findByInviter(inviterId: string, filters?: InvitationFilters): Promise<GameInvitation[]>;

  /**
   * Find invitations for a specific game
   */
  findByGame(gameId: string, filters?: InvitationFilters): Promise<GameInvitation[]>;

  /**
   * Update invitation status
   */
  updateStatus(
    invitationId: string,
    status: InvitationStatus,
    respondedAt?: Date
  ): Promise<GameInvitation>;

  /**
   * Delete an invitation
   */
  delete(invitationId: string): Promise<void>;

  /**
   * Find all invitations matching filters
   */
  findAll(filters?: InvitationFilters): Promise<GameInvitation[]>;
}
