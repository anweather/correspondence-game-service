import { InvitationService } from '@application/services/InvitationService';
import { IInvitationRepository } from '@domain/interfaces/IInvitationRepository';
import { IPlayerProfileRepository } from '@domain/interfaces/IPlayerProfileRepository';
import { GameRepository } from '@domain/interfaces';
import { GameInvitation, InvitationStatus } from '@domain/models/GameInvitation';
import { PlayerProfile } from '@domain/models/PlayerProfile';
import { GameState, GameLifecycle } from '@domain/models';

describe('InvitationService', () => {
  let service: InvitationService;
  let mockInvitationRepo: jest.Mocked<IInvitationRepository>;
  let mockProfileRepo: jest.Mocked<IPlayerProfileRepository>;
  let mockGameRepo: jest.Mocked<GameRepository>;

  const mockInviter: PlayerProfile = {
    userId: 'user_inviter',
    displayName: 'inviter_user',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInvitee: PlayerProfile = {
    userId: 'user_invitee',
    displayName: 'invitee_user',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockGame: GameState = {
    gameId: 'game_123',
    gameType: 'tic-tac-toe',
    lifecycle: GameLifecycle.WAITING_FOR_PLAYERS,
    players: [{ id: 'user_inviter', name: 'inviter_user', joinedAt: new Date() }],
    currentPlayerIndex: 0,
    phase: 'playing',
    board: { spaces: [], metadata: {} },
    moveHistory: [],
    metadata: {},
    winner: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Create mock repositories
    mockInvitationRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByInvitee: jest.fn(),
      findByInviter: jest.fn(),
      findByGame: jest.fn(),
      updateStatus: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
    };

    mockProfileRepo = {
      create: jest.fn(),
      findByUserId: jest.fn(),
      findByDisplayName: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      isDisplayNameAvailable: jest.fn(),
      findAll: jest.fn(),
    };

    mockGameRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findByPlayer: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      healthCheck: jest.fn(),
    };

    service = new InvitationService(mockInvitationRepo, mockProfileRepo, mockGameRepo);
  });

  describe('createInvitation', () => {
    it('should create an invitation with valid parameters', async () => {
      const gameId = 'game_123';
      const inviterId = 'user_inviter';
      const inviteeId = 'user_invitee';

      const expectedInvitation: GameInvitation = {
        invitationId: 'inv_123',
        gameId,
        inviterId,
        inviteeId,
        status: InvitationStatus.PENDING,
        createdAt: new Date(),
      };

      // Mock successful validation
      mockGameRepo.findById.mockResolvedValue(mockGame);
      mockProfileRepo.findByUserId.mockResolvedValueOnce(mockInviter);
      mockProfileRepo.findByUserId.mockResolvedValueOnce(mockInvitee);
      mockInvitationRepo.findByGame.mockResolvedValue([]);
      mockInvitationRepo.create.mockResolvedValue(expectedInvitation);

      const result = await service.createInvitation(gameId, inviterId, inviteeId);

      expect(result).toEqual(expectedInvitation);
      expect(mockInvitationRepo.create).toHaveBeenCalledWith({
        gameId,
        inviterId,
        inviteeId,
      });
    });

    it('should reject invitation if game does not exist', async () => {
      const gameId = 'nonexistent_game';
      const inviterId = 'user_inviter';
      const inviteeId = 'user_invitee';

      mockGameRepo.findById.mockResolvedValue(null);

      await expect(service.createInvitation(gameId, inviterId, inviteeId)).rejects.toThrow(
        'Game not found'
      );

      expect(mockInvitationRepo.create).not.toHaveBeenCalled();
    });

    it('should reject invitation if inviter is not a participant in the game', async () => {
      const gameId = 'game_123';
      const inviterId = 'user_not_in_game';
      const inviteeId = 'user_invitee';

      const gameWithoutInviter: GameState = {
        ...mockGame,
        players: [{ id: 'other_user', name: 'other', joinedAt: new Date() }],
      };

      mockGameRepo.findById.mockResolvedValue(gameWithoutInviter);
      mockProfileRepo.findByUserId.mockResolvedValue(mockInviter);

      await expect(service.createInvitation(gameId, inviterId, inviteeId)).rejects.toThrow(
        'Inviter is not a participant in this game'
      );

      expect(mockInvitationRepo.create).not.toHaveBeenCalled();
    });

    it('should reject invitation if invitee does not exist', async () => {
      const gameId = 'game_123';
      const inviterId = 'user_inviter';
      const inviteeId = 'nonexistent_user';

      mockGameRepo.findById.mockResolvedValue(mockGame);
      mockProfileRepo.findByUserId.mockResolvedValueOnce(mockInviter);
      mockProfileRepo.findByUserId.mockResolvedValueOnce(null);

      await expect(service.createInvitation(gameId, inviterId, inviteeId)).rejects.toThrow(
        'Invitee not found'
      );

      expect(mockInvitationRepo.create).not.toHaveBeenCalled();
    });

    it('should reject invitation if invitee is already in the game', async () => {
      const gameId = 'game_123';
      const inviterId = 'user_inviter';
      const inviteeId = 'user_invitee';

      const gameWithInvitee: GameState = {
        ...mockGame,
        players: [
          { id: 'user_inviter', name: 'inviter_user', joinedAt: new Date() },
          { id: 'user_invitee', name: 'invitee_user', joinedAt: new Date() },
        ],
      };

      mockGameRepo.findById.mockResolvedValue(gameWithInvitee);
      mockProfileRepo.findByUserId.mockResolvedValueOnce(mockInviter);
      mockProfileRepo.findByUserId.mockResolvedValueOnce(mockInvitee);

      await expect(service.createInvitation(gameId, inviterId, inviteeId)).rejects.toThrow(
        'Invitee is already in this game'
      );

      expect(mockInvitationRepo.create).not.toHaveBeenCalled();
    });

    it('should reject duplicate pending invitation', async () => {
      const gameId = 'game_123';
      const inviterId = 'user_inviter';
      const inviteeId = 'user_invitee';

      const existingInvitation: GameInvitation = {
        invitationId: 'inv_existing',
        gameId,
        inviterId,
        inviteeId,
        status: InvitationStatus.PENDING,
        createdAt: new Date(),
      };

      mockGameRepo.findById.mockResolvedValue(mockGame);
      mockProfileRepo.findByUserId.mockResolvedValueOnce(mockInviter);
      mockProfileRepo.findByUserId.mockResolvedValueOnce(mockInvitee);
      mockInvitationRepo.findByGame.mockResolvedValue([existingInvitation]);

      await expect(service.createInvitation(gameId, inviterId, inviteeId)).rejects.toThrow(
        'Pending invitation already exists for this user and game'
      );

      expect(mockInvitationRepo.create).not.toHaveBeenCalled();
    });

    it('should allow creating new invitation if previous one was declined', async () => {
      const gameId = 'game_123';
      const inviterId = 'user_inviter';
      const inviteeId = 'user_invitee';

      const declinedInvitation: GameInvitation = {
        invitationId: 'inv_declined',
        gameId,
        inviterId,
        inviteeId,
        status: InvitationStatus.DECLINED,
        createdAt: new Date(),
        respondedAt: new Date(),
      };

      const newInvitation: GameInvitation = {
        invitationId: 'inv_new',
        gameId,
        inviterId,
        inviteeId,
        status: InvitationStatus.PENDING,
        createdAt: new Date(),
      };

      mockGameRepo.findById.mockResolvedValue(mockGame);
      mockProfileRepo.findByUserId.mockResolvedValueOnce(mockInviter);
      mockProfileRepo.findByUserId.mockResolvedValueOnce(mockInvitee);
      mockInvitationRepo.findByGame.mockResolvedValue([declinedInvitation]);
      mockInvitationRepo.create.mockResolvedValue(newInvitation);

      const result = await service.createInvitation(gameId, inviterId, inviteeId);

      expect(result).toEqual(newInvitation);
      expect(mockInvitationRepo.create).toHaveBeenCalled();
    });
  });

  describe('getInvitations', () => {
    it('should get invitations for a user', async () => {
      const userId = 'user_invitee';
      const invitations: GameInvitation[] = [
        {
          invitationId: 'inv_1',
          gameId: 'game_1',
          inviterId: 'user_inviter',
          inviteeId: userId,
          status: InvitationStatus.PENDING,
          createdAt: new Date(),
        },
        {
          invitationId: 'inv_2',
          gameId: 'game_2',
          inviterId: 'user_inviter',
          inviteeId: userId,
          status: InvitationStatus.PENDING,
          createdAt: new Date(),
        },
      ];

      mockInvitationRepo.findByInvitee.mockResolvedValue(invitations);

      const result = await service.getInvitations(userId);

      expect(result).toEqual(invitations);
      expect(mockInvitationRepo.findByInvitee).toHaveBeenCalledWith(userId, undefined);
    });

    it('should filter invitations by status', async () => {
      const userId = 'user_invitee';
      const status = InvitationStatus.PENDING;
      const invitations: GameInvitation[] = [
        {
          invitationId: 'inv_1',
          gameId: 'game_1',
          inviterId: 'user_inviter',
          inviteeId: userId,
          status: InvitationStatus.PENDING,
          createdAt: new Date(),
        },
      ];

      mockInvitationRepo.findByInvitee.mockResolvedValue(invitations);

      const result = await service.getInvitations(userId, status);

      expect(result).toEqual(invitations);
      expect(mockInvitationRepo.findByInvitee).toHaveBeenCalledWith(userId, { status });
    });
  });

  describe('respondToInvitation', () => {
    const invitationId = 'inv_123';
    const inviteeId = 'user_invitee';

    const pendingInvitation: GameInvitation = {
      invitationId,
      gameId: 'game_123',
      inviterId: 'user_inviter',
      inviteeId,
      status: InvitationStatus.PENDING,
      createdAt: new Date(),
    };

    it('should accept invitation and add player to game', async () => {
      const updatedInvitation: GameInvitation = {
        ...pendingInvitation,
        status: InvitationStatus.ACCEPTED,
        respondedAt: new Date(),
      };

      mockInvitationRepo.findById.mockResolvedValue(pendingInvitation);
      mockProfileRepo.findByUserId.mockResolvedValue(mockInvitee);
      mockGameRepo.findById.mockResolvedValue(mockGame);
      mockInvitationRepo.updateStatus.mockResolvedValue(updatedInvitation);

      const result = await service.respondToInvitation(invitationId, inviteeId, true);

      expect(result).toEqual(updatedInvitation);
      expect(mockInvitationRepo.updateStatus).toHaveBeenCalledWith(
        invitationId,
        InvitationStatus.ACCEPTED,
        expect.any(Date)
      );
    });

    it('should decline invitation without adding player to game', async () => {
      const updatedInvitation: GameInvitation = {
        ...pendingInvitation,
        status: InvitationStatus.DECLINED,
        respondedAt: new Date(),
      };

      mockInvitationRepo.findById.mockResolvedValue(pendingInvitation);
      mockInvitationRepo.updateStatus.mockResolvedValue(updatedInvitation);

      const result = await service.respondToInvitation(invitationId, inviteeId, false);

      expect(result).toEqual(updatedInvitation);
      expect(mockInvitationRepo.updateStatus).toHaveBeenCalledWith(
        invitationId,
        InvitationStatus.DECLINED,
        expect.any(Date)
      );
      expect(mockGameRepo.findById).not.toHaveBeenCalled();
    });

    it('should reject response if invitation not found', async () => {
      mockInvitationRepo.findById.mockResolvedValue(null);

      await expect(service.respondToInvitation(invitationId, inviteeId, true)).rejects.toThrow(
        'Invitation not found'
      );

      expect(mockInvitationRepo.updateStatus).not.toHaveBeenCalled();
    });

    it('should reject response if user is not the invitee', async () => {
      const wrongUserId = 'wrong_user';

      mockInvitationRepo.findById.mockResolvedValue(pendingInvitation);

      await expect(service.respondToInvitation(invitationId, wrongUserId, true)).rejects.toThrow(
        'Only the invitee can respond to this invitation'
      );

      expect(mockInvitationRepo.updateStatus).not.toHaveBeenCalled();
    });

    it('should reject response if invitation is not pending', async () => {
      const acceptedInvitation: GameInvitation = {
        ...pendingInvitation,
        status: InvitationStatus.ACCEPTED,
        respondedAt: new Date(),
      };

      mockInvitationRepo.findById.mockResolvedValue(acceptedInvitation);

      await expect(service.respondToInvitation(invitationId, inviteeId, true)).rejects.toThrow(
        'Invitation is not pending'
      );

      expect(mockInvitationRepo.updateStatus).not.toHaveBeenCalled();
    });

    it('should reject acceptance if game no longer exists', async () => {
      mockInvitationRepo.findById.mockResolvedValue(pendingInvitation);
      mockProfileRepo.findByUserId.mockResolvedValue(mockInvitee);
      mockGameRepo.findById.mockResolvedValue(null);

      await expect(service.respondToInvitation(invitationId, inviteeId, true)).rejects.toThrow(
        'Game not found'
      );

      expect(mockInvitationRepo.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('expireOldInvitations', () => {
    it('should expire pending invitations older than expiration time', async () => {
      const now = new Date();
      const oldDate = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000); // 8 days ago

      const oldInvitation: GameInvitation = {
        invitationId: 'inv_old',
        gameId: 'game_123',
        inviterId: 'user_inviter',
        inviteeId: 'user_invitee',
        status: InvitationStatus.PENDING,
        createdAt: oldDate,
      };

      const recentInvitation: GameInvitation = {
        invitationId: 'inv_recent',
        gameId: 'game_456',
        inviterId: 'user_inviter',
        inviteeId: 'user_invitee',
        status: InvitationStatus.PENDING,
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      };

      mockInvitationRepo.findAll.mockResolvedValue([oldInvitation, recentInvitation]);
      mockInvitationRepo.updateStatus.mockResolvedValue({
        ...oldInvitation,
        status: InvitationStatus.EXPIRED,
      });

      await service.expireOldInvitations();

      // Should only expire the old invitation
      expect(mockInvitationRepo.updateStatus).toHaveBeenCalledTimes(1);
      expect(mockInvitationRepo.updateStatus).toHaveBeenCalledWith(
        'inv_old',
        InvitationStatus.EXPIRED,
        undefined
      );
    });

    it('should not expire already responded invitations', async () => {
      const now = new Date();
      const oldDate = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000); // 8 days ago

      const acceptedInvitation: GameInvitation = {
        invitationId: 'inv_accepted',
        gameId: 'game_123',
        inviterId: 'user_inviter',
        inviteeId: 'user_invitee',
        status: InvitationStatus.ACCEPTED,
        createdAt: oldDate,
        respondedAt: oldDate,
      };

      mockInvitationRepo.findAll.mockResolvedValue([acceptedInvitation]);

      await service.expireOldInvitations();

      // Should not expire already accepted invitation
      expect(mockInvitationRepo.updateStatus).not.toHaveBeenCalled();
    });

    it('should handle custom expiration duration', async () => {
      const now = new Date();
      const customExpirationMs = 2 * 24 * 60 * 60 * 1000; // 2 days
      const oldDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago

      const oldInvitation: GameInvitation = {
        invitationId: 'inv_old',
        gameId: 'game_123',
        inviterId: 'user_inviter',
        inviteeId: 'user_invitee',
        status: InvitationStatus.PENDING,
        createdAt: oldDate,
      };

      mockInvitationRepo.findAll.mockResolvedValue([oldInvitation]);
      mockInvitationRepo.updateStatus.mockResolvedValue({
        ...oldInvitation,
        status: InvitationStatus.EXPIRED,
      });

      await service.expireOldInvitations(customExpirationMs);

      expect(mockInvitationRepo.updateStatus).toHaveBeenCalledWith(
        'inv_old',
        InvitationStatus.EXPIRED,
        undefined
      );
    });
  });
});
