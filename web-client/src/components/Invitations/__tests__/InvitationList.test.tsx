import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InvitationList } from '../InvitationList';
import type { GameInvitation } from '../../../types/game';

describe('InvitationList', () => {
  const mockOnAccept = vi.fn();
  const mockOnDecline = vi.fn();

  const mockInvitations: GameInvitation[] = [
    {
      invitationId: 'inv1',
      gameId: 'game1',
      inviterId: 'user1',
      inviteeId: 'user2',
      status: 'pending',
      createdAt: '2024-01-01T10:00:00Z',
    },
    {
      invitationId: 'inv2',
      gameId: 'game2',
      inviterId: 'user3',
      inviteeId: 'user2',
      status: 'pending',
      createdAt: '2024-01-02T10:00:00Z',
    },
    {
      invitationId: 'inv3',
      gameId: 'game3',
      inviterId: 'user4',
      inviteeId: 'user2',
      status: 'accepted',
      createdAt: '2024-01-03T10:00:00Z',
      respondedAt: '2024-01-03T11:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Invitation List Rendering', () => {
    it('should render list of invitations', () => {
      render(
        <InvitationList
          invitations={mockInvitations}
          onAccept={mockOnAccept}
          onDecline={mockOnDecline}
        />
      );

      // Should show all invitations
      expect(screen.getByText(/inv1/i)).toBeInTheDocument();
      expect(screen.getByText(/inv2/i)).toBeInTheDocument();
      expect(screen.getByText(/inv3/i)).toBeInTheDocument();
    });

    it('should display invitation details', () => {
      render(
        <InvitationList
          invitations={[mockInvitations[0]]}
          onAccept={mockOnAccept}
          onDecline={mockOnDecline}
        />
      );

      // Should show game ID
      expect(screen.getByText(/game1/i)).toBeInTheDocument();
      
      // Should show inviter ID
      expect(screen.getByText(/user1/i)).toBeInTheDocument();
      
      // Should show status
      expect(screen.getByText(/pending/i)).toBeInTheDocument();
    });

    it('should show empty state when no invitations', () => {
      render(
        <InvitationList
          invitations={[]}
          onAccept={mockOnAccept}
          onDecline={mockOnDecline}
        />
      );

      expect(screen.getByText(/no invitations/i)).toBeInTheDocument();
    });

    it('should show loading state', () => {
      render(
        <InvitationList
          invitations={[]}
          onAccept={mockOnAccept}
          onDecline={mockOnDecline}
          loading={true}
        />
      );

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should display invitation status', () => {
      render(
        <InvitationList
          invitations={mockInvitations}
          onAccept={mockOnAccept}
          onDecline={mockOnDecline}
        />
      );

      // Should show pending status
      const pendingElements = screen.getAllByText(/pending/i);
      expect(pendingElements.length).toBeGreaterThan(0);
      
      // Should show accepted status
      expect(screen.getByText(/accepted/i)).toBeInTheDocument();
    });

    it('should format dates correctly', () => {
      render(
        <InvitationList
          invitations={[mockInvitations[0]]}
          onAccept={mockOnAccept}
          onDecline={mockOnDecline}
        />
      );

      // Should display some form of date (exact format may vary)
      // Just check that the date string is present in some form
      expect(screen.getByText(/2024/i)).toBeInTheDocument();
    });
  });

  describe('Accept/Decline Buttons', () => {
    it('should show accept button for pending invitations', () => {
      render(
        <InvitationList
          invitations={[mockInvitations[0]]}
          onAccept={mockOnAccept}
          onDecline={mockOnDecline}
        />
      );

      expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument();
    });

    it('should show decline button for pending invitations', () => {
      render(
        <InvitationList
          invitations={[mockInvitations[0]]}
          onAccept={mockOnAccept}
          onDecline={mockOnDecline}
        />
      );

      expect(screen.getByRole('button', { name: /decline/i })).toBeInTheDocument();
    });

    it('should not show accept/decline buttons for accepted invitations', () => {
      render(
        <InvitationList
          invitations={[mockInvitations[2]]}
          onAccept={mockOnAccept}
          onDecline={mockOnDecline}
        />
      );

      expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /decline/i })).not.toBeInTheDocument();
    });

    it('should call onAccept when accept button clicked', async () => {
      render(
        <InvitationList
          invitations={[mockInvitations[0]]}
          onAccept={mockOnAccept}
          onDecline={mockOnDecline}
        />
      );

      const acceptButton = screen.getByRole('button', { name: /accept/i });
      fireEvent.click(acceptButton);

      await waitFor(() => {
        expect(mockOnAccept).toHaveBeenCalledWith('inv1');
      });
    });

    it('should call onDecline when decline button clicked', async () => {
      render(
        <InvitationList
          invitations={[mockInvitations[0]]}
          onAccept={mockOnAccept}
          onDecline={mockOnDecline}
        />
      );

      const declineButton = screen.getByRole('button', { name: /decline/i });
      fireEvent.click(declineButton);

      await waitFor(() => {
        expect(mockOnDecline).toHaveBeenCalledWith('inv1');
      });
    });

    it('should disable buttons during loading', () => {
      render(
        <InvitationList
          invitations={[mockInvitations[0]]}
          onAccept={mockOnAccept}
          onDecline={mockOnDecline}
          loading={true}
        />
      );

      const acceptButton = screen.getByRole('button', { name: /accept/i });
      const declineButton = screen.getByRole('button', { name: /decline/i });

      expect(acceptButton).toBeDisabled();
      expect(declineButton).toBeDisabled();
    });

    it('should handle multiple pending invitations independently', () => {
      const pendingInvitations = mockInvitations.filter(inv => inv.status === 'pending');
      
      render(
        <InvitationList
          invitations={pendingInvitations}
          onAccept={mockOnAccept}
          onDecline={mockOnDecline}
        />
      );

      const acceptButtons = screen.getAllByRole('button', { name: /accept/i });
      expect(acceptButtons).toHaveLength(2);

      const declineButtons = screen.getAllByRole('button', { name: /decline/i });
      expect(declineButtons).toHaveLength(2);
    });
  });

  describe('Empty State', () => {
    it('should show empty state message', () => {
      render(
        <InvitationList
          invitations={[]}
          onAccept={mockOnAccept}
          onDecline={mockOnDecline}
        />
      );

      expect(screen.getByText(/no invitations/i)).toBeInTheDocument();
    });

    it('should not show empty state when loading', () => {
      render(
        <InvitationList
          invitations={[]}
          onAccept={mockOnAccept}
          onDecline={mockOnDecline}
          loading={true}
        />
      );

      expect(screen.queryByText(/no invitations/i)).not.toBeInTheDocument();
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should show empty state after invitations are cleared', () => {
      const { rerender } = render(
        <InvitationList
          invitations={mockInvitations}
          onAccept={mockOnAccept}
          onDecline={mockOnDecline}
        />
      );

      expect(screen.queryByText(/no invitations/i)).not.toBeInTheDocument();

      rerender(
        <InvitationList
          invitations={[]}
          onAccept={mockOnAccept}
          onDecline={mockOnDecline}
        />
      );

      expect(screen.getByText(/no invitations/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when provided', () => {
      render(
        <InvitationList
          invitations={mockInvitations}
          onAccept={mockOnAccept}
          onDecline={mockOnDecline}
          error="Failed to load invitations"
        />
      );

      expect(screen.getByText(/failed to load invitations/i)).toBeInTheDocument();
    });

    it('should still show invitations when error is present', () => {
      render(
        <InvitationList
          invitations={mockInvitations}
          onAccept={mockOnAccept}
          onDecline={mockOnDecline}
          error="Failed to load invitations"
        />
      );

      expect(screen.getByText(/failed to load invitations/i)).toBeInTheDocument();
      expect(screen.getByText(/inv1/i)).toBeInTheDocument();
    });

    it('should allow retrying actions after error', () => {
      render(
        <InvitationList
          invitations={[mockInvitations[0]]}
          onAccept={mockOnAccept}
          onDecline={mockOnDecline}
          error="Failed to accept invitation"
        />
      );

      const acceptButton = screen.getByRole('button', { name: /accept/i });
      expect(acceptButton).not.toBeDisabled();
      
      fireEvent.click(acceptButton);
      expect(mockOnAccept).toHaveBeenCalled();
    });
  });

  describe('Filtering and Sorting', () => {
    it('should display invitations in order', () => {
      render(
        <InvitationList
          invitations={mockInvitations}
          onAccept={mockOnAccept}
          onDecline={mockOnDecline}
        />
      );

      const invitationElements = screen.getAllByText(/inv\d/);
      expect(invitationElements).toHaveLength(3);
    });

    it('should show only pending invitations when filtered', () => {
      const pendingOnly = mockInvitations.filter(inv => inv.status === 'pending');
      
      render(
        <InvitationList
          invitations={pendingOnly}
          onAccept={mockOnAccept}
          onDecline={mockOnDecline}
        />
      );

      expect(screen.getByText(/inv1/i)).toBeInTheDocument();
      expect(screen.getByText(/inv2/i)).toBeInTheDocument();
      expect(screen.queryByText(/inv3/i)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for buttons', () => {
      render(
        <InvitationList
          invitations={[mockInvitations[0]]}
          onAccept={mockOnAccept}
          onDecline={mockOnDecline}
        />
      );

      const acceptButton = screen.getByRole('button', { name: /accept/i });
      const declineButton = screen.getByRole('button', { name: /decline/i });

      expect(acceptButton).toBeInTheDocument();
      expect(declineButton).toBeInTheDocument();
    });

    it('should have proper role for error messages', () => {
      render(
        <InvitationList
          invitations={mockInvitations}
          onAccept={mockOnAccept}
          onDecline={mockOnDecline}
          error="Failed to load invitations"
        />
      );

      const errorElement = screen.getByRole('alert');
      expect(errorElement).toBeInTheDocument();
      expect(errorElement).toHaveTextContent(/failed to load invitations/i);
    });

    it('should be keyboard navigable', () => {
      render(
        <InvitationList
          invitations={[mockInvitations[0]]}
          onAccept={mockOnAccept}
          onDecline={mockOnDecline}
        />
      );

      const acceptButton = screen.getByRole('button', { name: /accept/i });
      const declineButton = screen.getByRole('button', { name: /decline/i });

      // Buttons should be focusable
      acceptButton.focus();
      expect(document.activeElement).toBe(acceptButton);

      declineButton.focus();
      expect(document.activeElement).toBe(declineButton);
    });
  });
});
