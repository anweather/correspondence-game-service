import { Button } from '../common/Button';
import type { GameInvitation } from '../../types/game';
import styles from './InvitationList.module.css';

export interface InvitationListProps {
  invitations: GameInvitation[];
  onAccept: (invitationId: string) => void;
  onDecline: (invitationId: string) => void;
  loading?: boolean;
  error?: string | null;
}

export function InvitationList({
  invitations,
  onAccept,
  onDecline,
  loading = false,
  error = null,
}: InvitationListProps) {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleAccept = (invitationId: string) => {
    onAccept(invitationId);
  };

  const handleDecline = (invitationId: string) => {
    onDecline(invitationId);
  };

  // Show loading state only when there are no invitations
  if (loading && invitations.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>Loading invitations...</div>
      </div>
    );
  }

  if (!loading && invitations.length === 0) {
    return (
      <div className={styles.container}>
        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}
        <div className={styles.emptyState}>
          No invitations yet. When someone invites you to a game, it will appear here.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      <div className={styles.invitationList}>
        {invitations.map((invitation) => {
          const isPending = invitation.status === 'pending';

          return (
            <div
              key={invitation.invitationId}
              className={`${styles.invitationCard} ${
                isPending ? styles.pending : styles[invitation.status]
              }`}
            >
              <div className={styles.invitationHeader}>
                <div className={styles.invitationId}>
                  Invitation: {invitation.invitationId}
                </div>
                <div className={styles.invitationDate}>
                  {formatDate(invitation.createdAt)}
                </div>
              </div>

              <div className={styles.invitationBody}>
                <div className={styles.invitationDetail}>
                  <span className={styles.label}>Game:</span>
                  <span className={styles.value}>{invitation.gameId}</span>
                </div>
                <div className={styles.invitationDetail}>
                  <span className={styles.label}>From:</span>
                  <span className={styles.value}>{invitation.inviterId}</span>
                </div>
                <div className={styles.invitationDetail}>
                  <span className={styles.label}>Status:</span>
                  <span className={`${styles.status} ${styles[invitation.status]}`}>
                    {invitation.status}
                  </span>
                </div>
              </div>

              {isPending && (
                <div className={styles.invitationActions}>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => handleAccept(invitation.invitationId)}
                    disabled={loading}
                    size="small"
                  >
                    Accept
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleDecline(invitation.invitationId)}
                    disabled={loading}
                    size="small"
                  >
                    Decline
                  </Button>
                </div>
              )}

              {invitation.respondedAt && (
                <div className={styles.respondedAt}>
                  Responded: {formatDate(invitation.respondedAt)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
