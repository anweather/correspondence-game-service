CREATE TABLE IF NOT EXISTS game_invitations (invitation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(), game_id VARCHAR(255) NOT NULL REFERENCES games(game_id) ON DELETE CASCADE, inviter_id VARCHAR(255) NOT NULL, invitee_id VARCHAR(255) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'pending', created_at TIMESTAMP NOT NULL DEFAULT NOW(), responded_at TIMESTAMP, CONSTRAINT fk_inviter FOREIGN KEY (inviter_id) REFERENCES player_profiles(user_id), CONSTRAINT fk_invitee FOREIGN KEY (invitee_id) REFERENCES player_profiles(user_id));

CREATE INDEX IF NOT EXISTS idx_invitations_invitee ON game_invitations(invitee_id, status);

CREATE INDEX IF NOT EXISTS idx_invitations_game ON game_invitations(game_id);

INSERT INTO schema_migrations (version) VALUES (6) ON CONFLICT (version) DO NOTHING;
