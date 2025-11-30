import { IInvitationRepository } from '@domain/interfaces/IInvitationRepository';
import { IPlayerProfileRepository } from '@domain/interfaces/IPlayerProfileRepository';
import { GameRepository } from '@domain/interfaces';
import {
  GameInvitation,
  InvitationStatus,
  isInvitationExpired,
} from '@domain/models/GameInvitation';

/**
 * Service for managing game invitations
 * Handles invitation creation, validation, and responses
 */
export class InvitationService {
  constructor(
    private invitationRepository: IInvitationRepository,
    private profileRepository: IPlayerProfileRepository,
    private gameRepository: GameRepository
  ) {}

  /**
   * Create a new game invitation
   * @param gameId - The game to invite to
   * @param inviterId - The user sending the invitation
   * @param inviteeId - The user receiving the invitation
   * @returns The created invitation
   * @throws Error if validation fails
   */
  async createInvitation(
    gameId: string,
    inviterId: string,
    inviteeId: string
  ): Promise<GameInvitation> {
    // Validate game exists
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    // Validate inviter is a participant in the game
    const isInviterInGame = game.players.some((player) => player.id === inviterId);
    if (!isInviterInGame) {
      throw new Error('Inviter is not a participant in this game');
    }

    // Validate inviter profile exists
    const inviterProfile = await this.profileRepository.findByUserId(inviterId);
    if (!inviterProfile) {
      throw new Error('Inviter not found');
    }

    // Validate invitee profile exists
    const inviteeProfile = await this.profileRepository.findByUserId(inviteeId);
    if (!inviteeProfile) {
      throw new Error('Invitee not found');
    }

    // Validate invitee is not already in the game
    const isInviteeInGame = game.players.some((player) => player.id === inviteeId);
    if (isInviteeInGame) {
      throw new Error('Invitee is already in this game');
    }

    // Check for duplicate pending invitation
    const existingInvitations = await this.invitationRepository.findByGame(gameId);
    const hasPendingInvitation = existingInvitations.some(
      (inv) => inv.inviteeId === inviteeId && inv.status === InvitationStatus.PENDING
    );

    if (hasPendingInvitation) {
      throw new Error('Pending invitation already exists for this user and game');
    }

    // Create the invitation
    return await this.invitationRepository.create({
      gameId,
      inviterId,
      inviteeId,
    });
  }

  /**
   * Get invitations for a user
   * @param userId - The user ID to get invitations for
   * @param status - Optional status filter
   * @returns List of invitations
   */
  async getInvitations(userId: string, status?: InvitationStatus): Promise<GameInvitation[]> {
    const filters = status ? { status } : undefined;
    return await this.invitationRepository.findByInvitee(userId, filters);
  }

  /**
   * Respond to an invitation (accept or decline)
   * @param invitationId - The invitation to respond to
   * @param userId - The user responding (must be the invitee)
   * @param accept - True to accept, false to decline
   * @returns The updated invitation
   * @throws Error if validation fails
   */
  async respondToInvitation(
    invitationId: string,
    userId: string,
    accept: boolean
  ): Promise<GameInvitation> {
    // Find the invitation
    const invitation = await this.invitationRepository.findById(invitationId);
    if (!invitation) {
      throw new Error('Invitation not found');
    }

    // Validate user is the invitee
    if (invitation.inviteeId !== userId) {
      throw new Error('Only the invitee can respond to this invitation');
    }

    // Validate invitation is pending
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new Error('Invitation is not pending');
    }

    const respondedAt = new Date();
    const newStatus = accept ? InvitationStatus.ACCEPTED : InvitationStatus.DECLINED;

    // If accepting, add player to game
    if (accept) {
      // Validate game still exists
      const game = await this.gameRepository.findById(invitation.gameId);
      if (!game) {
        throw new Error('Game not found');
      }

      // Get invitee profile for display name
      const inviteeProfile = await this.profileRepository.findByUserId(userId);
      if (!inviteeProfile) {
        throw new Error('Invitee profile not found');
      }

      // Note: The actual joining of the game should be handled by GameManagerService
      // This service only manages the invitation state
      // The caller (e.g., API route) should call GameManagerService.joinGame after this
    }

    // Update invitation status
    return await this.invitationRepository.updateStatus(invitationId, newStatus, respondedAt);
  }

  /**
   * Expire old pending invitations
   * @param expirationMs - Optional custom expiration duration in milliseconds (default: 7 days)
   */
  async expireOldInvitations(expirationMs?: number): Promise<void> {
    // Get all pending invitations
    const allInvitations = await this.invitationRepository.findAll({
      status: InvitationStatus.PENDING,
    });

    // Check each invitation for expiration
    for (const invitation of allInvitations) {
      if (isInvitationExpired(invitation, expirationMs)) {
        await this.invitationRepository.updateStatus(
          invitation.invitationId,
          InvitationStatus.EXPIRED,
          undefined
        );
      }
    }
  }
}
