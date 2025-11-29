import { GameInvitation, InvitationStatus, isInvitationExpired } from '@domain/models/GameInvitation';

describe('GameInvitation', () => {
  describe('Model Creation', () => {
    it('should create a valid GameInvitation with all required fields', () => {
      const invitation: GameInvitation = {
        invitationId: 'inv_123',
        gameId: 'game_456',
        inviterId: 'user_789',
        inviteeId: 'user_012',
        status: InvitationStatus.PENDING,
        createdAt: new Date('2024-01-01'),
        respondedAt: undefined,
      };

      expect(invitation.invitationId).toBe('inv_123');
      expect(invitation.gameId).toBe('game_456');
      expect(invitation.inviterId).toBe('user_789');
      expect(invitation.inviteeId).toBe('user_012');
      expect(invitation.status).toBe(InvitationStatus.PENDING);
      expect(invitation.createdAt).toEqual(new Date('2024-01-01'));
      expect(invitation.respondedAt).toBeUndefined();
    });

    it('should create an invitation with respondedAt when accepted', () => {
      const invitation: GameInvitation = {
        invitationId: 'inv_123',
        gameId: 'game_456',
        inviterId: 'user_789',
        inviteeId: 'user_012',
        status: InvitationStatus.ACCEPTED,
        createdAt: new Date('2024-01-01'),
        respondedAt: new Date('2024-01-02'),
      };

      expect(invitation.status).toBe(InvitationStatus.ACCEPTED);
      expect(invitation.respondedAt).toEqual(new Date('2024-01-02'));
    });

    it('should create an invitation with respondedAt when declined', () => {
      const invitation: GameInvitation = {
        invitationId: 'inv_123',
        gameId: 'game_456',
        inviterId: 'user_789',
        inviteeId: 'user_012',
        status: InvitationStatus.DECLINED,
        createdAt: new Date('2024-01-01'),
        respondedAt: new Date('2024-01-02'),
      };

      expect(invitation.status).toBe(InvitationStatus.DECLINED);
      expect(invitation.respondedAt).toEqual(new Date('2024-01-02'));
    });
  });

  describe('Invitation States', () => {
    it('should support PENDING status', () => {
      const invitation: GameInvitation = {
        invitationId: 'inv_123',
        gameId: 'game_456',
        inviterId: 'user_789',
        inviteeId: 'user_012',
        status: InvitationStatus.PENDING,
        createdAt: new Date(),
      };

      expect(invitation.status).toBe(InvitationStatus.PENDING);
    });

    it('should support ACCEPTED status', () => {
      const invitation: GameInvitation = {
        invitationId: 'inv_123',
        gameId: 'game_456',
        inviterId: 'user_789',
        inviteeId: 'user_012',
        status: InvitationStatus.ACCEPTED,
        createdAt: new Date(),
        respondedAt: new Date(),
      };

      expect(invitation.status).toBe(InvitationStatus.ACCEPTED);
    });

    it('should support DECLINED status', () => {
      const invitation: GameInvitation = {
        invitationId: 'inv_123',
        gameId: 'game_456',
        inviterId: 'user_789',
        inviteeId: 'user_012',
        status: InvitationStatus.DECLINED,
        createdAt: new Date(),
        respondedAt: new Date(),
      };

      expect(invitation.status).toBe(InvitationStatus.DECLINED);
    });

    it('should support EXPIRED status', () => {
      const invitation: GameInvitation = {
        invitationId: 'inv_123',
        gameId: 'game_456',
        inviterId: 'user_789',
        inviteeId: 'user_012',
        status: InvitationStatus.EXPIRED,
        createdAt: new Date(),
      };

      expect(invitation.status).toBe(InvitationStatus.EXPIRED);
    });
  });

  describe('Expiration Logic', () => {
    it('should not be expired if created within expiration window', () => {
      const now = new Date();
      const invitation: GameInvitation = {
        invitationId: 'inv_123',
        gameId: 'game_456',
        inviterId: 'user_789',
        inviteeId: 'user_012',
        status: InvitationStatus.PENDING,
        createdAt: new Date(now.getTime() - 1000 * 60 * 60), // 1 hour ago
      };

      // Default expiration is 7 days
      expect(isInvitationExpired(invitation)).toBe(false);
    });

    it('should be expired if created beyond expiration window', () => {
      const now = new Date();
      const invitation: GameInvitation = {
        invitationId: 'inv_123',
        gameId: 'game_456',
        inviterId: 'user_789',
        inviteeId: 'user_012',
        status: InvitationStatus.PENDING,
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 8), // 8 days ago
      };

      // Default expiration is 7 days
      expect(isInvitationExpired(invitation)).toBe(true);
    });

    it('should support custom expiration duration', () => {
      const now = new Date();
      const invitation: GameInvitation = {
        invitationId: 'inv_123',
        gameId: 'game_456',
        inviterId: 'user_789',
        inviteeId: 'user_012',
        status: InvitationStatus.PENDING,
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 25), // 25 hours ago
      };

      // 24 hour expiration
      expect(isInvitationExpired(invitation, 24 * 60 * 60 * 1000)).toBe(true);
      // 48 hour expiration
      expect(isInvitationExpired(invitation, 48 * 60 * 60 * 1000)).toBe(false);
    });

    it('should not check expiration for already responded invitations', () => {
      const now = new Date();
      const invitation: GameInvitation = {
        invitationId: 'inv_123',
        gameId: 'game_456',
        inviterId: 'user_789',
        inviteeId: 'user_012',
        status: InvitationStatus.ACCEPTED,
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30), // 30 days ago
        respondedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 29), // 29 days ago
      };

      // Accepted invitations don't expire
      expect(isInvitationExpired(invitation)).toBe(false);
    });

    it('should not check expiration for declined invitations', () => {
      const now = new Date();
      const invitation: GameInvitation = {
        invitationId: 'inv_123',
        gameId: 'game_456',
        inviterId: 'user_789',
        inviteeId: 'user_012',
        status: InvitationStatus.DECLINED,
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30), // 30 days ago
        respondedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 29), // 29 days ago
      };

      // Declined invitations don't expire
      expect(isInvitationExpired(invitation)).toBe(false);
    });

    it('should handle edge case of exactly at expiration boundary', () => {
      const now = new Date();
      const expirationMs = 7 * 24 * 60 * 60 * 1000; // 7 days
      const invitation: GameInvitation = {
        invitationId: 'inv_123',
        gameId: 'game_456',
        inviterId: 'user_789',
        inviteeId: 'user_012',
        status: InvitationStatus.PENDING,
        createdAt: new Date(now.getTime() - expirationMs),
      };

      // At exactly the boundary, should be expired
      expect(isInvitationExpired(invitation, expirationMs)).toBe(true);
    });
  });
});
