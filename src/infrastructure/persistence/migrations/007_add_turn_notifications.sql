CREATE TABLE IF NOT EXISTS turn_notifications (notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id VARCHAR(255) NOT NULL, game_id VARCHAR(255) NOT NULL REFERENCES games(game_id) ON DELETE CASCADE, created_at TIMESTAMP NOT NULL DEFAULT NOW(), sent_at TIMESTAMP, status VARCHAR(20) NOT NULL DEFAULT 'pending', CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES player_profiles(user_id));

CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON turn_notifications(user_id, status);

CREATE INDEX IF NOT EXISTS idx_notifications_game ON turn_notifications(game_id);

INSERT INTO schema_migrations (version) VALUES (7) ON CONFLICT (version) DO NOTHING;
