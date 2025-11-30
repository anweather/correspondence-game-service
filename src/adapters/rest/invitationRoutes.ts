/**
 * REST API routes for game invitations
 * Handles invitation creation, listing, acceptance, and decline
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */

import { Router, Response, NextFunction } from 'express';
import { InvitationService } from '../../application/services/InvitationService';
import { requireAuth } from './auth/requireAuth';
import { AuthenticatedRequest } from './auth/types';
import { InvitationStatus } from '../../domain/models/GameInvitation';

/**
 * Create invitation routes
 * @param invitationService - The invitation service instance
 * @returns Express router with invitation routes
 */
export function createInvitationRoutes(invitationService: InvitationService): Router {
  const router = Router();

  /**
   * POST /api/invitations
   * Create a new game invitation
   *
   * Request body:
   * - gameId: string (required) - The game to invite to
   * - inviteeId: string (required) - The user to invite
   *
   * Response: 201 Created with invitation object
   * Errors:
   * - 400 Bad Request: Missing or invalid parameters
   * - 401 Unauthorized: Not authenticated
   * - 403 Forbidden: Inviter is not a participant in the game
   * - 404 Not Found: Game or invitee not found
   * - 409 Conflict: Duplicate pending invitation
   */
  router.post(
    '/invitations',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const { gameId, inviteeId } = req.body;

        // Validate required fields
        if (!gameId) {
          return res.status(400).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'gameId is required',
            },
          });
        }

        if (!inviteeId) {
          return res.status(400).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'inviteeId is required',
            },
          });
        }

        const inviterId = req.user!.externalId || req.user!.id;

        const invitation = await invitationService.createInvitation(gameId, inviterId, inviteeId);

        return res.status(201).json(invitation);
      } catch (error: any) {
        // Handle specific error cases
        if (error.message === 'Game not found') {
          return res.status(404).json({
            error: {
              code: 'GAME_NOT_FOUND',
              message: 'Game not found',
            },
          });
        }

        if (error.message === 'Inviter is not a participant in this game') {
          return res.status(403).json({
            error: {
              code: 'FORBIDDEN',
              message: 'Inviter is not a participant in this game',
            },
          });
        }

        if (error.message === 'Invitee not found') {
          return res.status(404).json({
            error: {
              code: 'INVITEE_NOT_FOUND',
              message: 'Invitee not found',
            },
          });
        }

        if (
          error.message === 'Invitee is already in this game' ||
          error.message === 'Pending invitation already exists for this user and game'
        ) {
          return res.status(409).json({
            error: {
              code: 'CONFLICT',
              message: error.message,
            },
          });
        }

        return next(error);
      }
    }
  );

  /**
   * GET /api/invitations
   * Get invitations for the authenticated user
   *
   * Query parameters:
   * - status: InvitationStatus (optional) - Filter by status
   *
   * Response: 200 OK with array of invitations
   * Errors:
   * - 401 Unauthorized: Not authenticated
   */
  router.get(
    '/invitations',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const userId = req.user!.externalId || req.user!.id;
        const status = req.query.status as InvitationStatus | undefined;

        const invitations = await invitationService.getInvitations(userId, status);

        return res.status(200).json(invitations);
      } catch (error: any) {
        return next(error);
      }
    }
  );

  /**
   * PUT /api/invitations/:id/accept
   * Accept a game invitation
   *
   * Response: 200 OK with updated invitation
   * Errors:
   * - 400 Bad Request: Invitation is not pending
   * - 401 Unauthorized: Not authenticated
   * - 403 Forbidden: User is not the invitee
   * - 404 Not Found: Invitation not found
   */
  router.put(
    '/invitations/:id/accept',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const invitationId = req.params.id;
        const userId = req.user!.externalId || req.user!.id;

        const invitation = await invitationService.respondToInvitation(invitationId, userId, true);

        return res.status(200).json(invitation);
      } catch (error: any) {
        // Handle specific error cases
        if (error.message === 'Invitation not found') {
          return res.status(404).json({
            error: {
              code: 'INVITATION_NOT_FOUND',
              message: 'Invitation not found',
            },
          });
        }

        if (error.message === 'Only the invitee can respond to this invitation') {
          return res.status(403).json({
            error: {
              code: 'FORBIDDEN',
              message: 'Only the invitee can respond to this invitation',
            },
          });
        }

        if (error.message === 'Invitation is not pending') {
          return res.status(400).json({
            error: {
              code: 'INVALID_STATUS',
              message: 'Invitation is not pending',
            },
          });
        }

        return next(error);
      }
    }
  );

  /**
   * PUT /api/invitations/:id/decline
   * Decline a game invitation
   *
   * Response: 200 OK with updated invitation
   * Errors:
   * - 400 Bad Request: Invitation is not pending
   * - 401 Unauthorized: Not authenticated
   * - 403 Forbidden: User is not the invitee
   * - 404 Not Found: Invitation not found
   */
  router.put(
    '/invitations/:id/decline',
    requireAuth,
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const invitationId = req.params.id;
        const userId = req.user!.externalId || req.user!.id;

        const invitation = await invitationService.respondToInvitation(invitationId, userId, false);

        return res.status(200).json(invitation);
      } catch (error: any) {
        // Handle specific error cases
        if (error.message === 'Invitation not found') {
          return res.status(404).json({
            error: {
              code: 'INVITATION_NOT_FOUND',
              message: 'Invitation not found',
            },
          });
        }

        if (error.message === 'Only the invitee can respond to this invitation') {
          return res.status(403).json({
            error: {
              code: 'FORBIDDEN',
              message: 'Only the invitee can respond to this invitation',
            },
          });
        }

        if (error.message === 'Invitation is not pending') {
          return res.status(400).json({
            error: {
              code: 'INVALID_STATUS',
              message: 'Invitation is not pending',
            },
          });
        }

        return next(error);
      }
    }
  );

  return router;
}
