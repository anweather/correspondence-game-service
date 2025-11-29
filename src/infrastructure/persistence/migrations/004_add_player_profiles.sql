CREATE TABLE IF NOT EXISTS player_profiles (user_id VARCHAR(255) PRIMARY KEY, display_name VARCHAR(50) NOT NULL UNIQUE, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());

CREATE INDEX IF NOT EXISTS idx_player_profiles_display_name ON player_profiles(display_name);

INSERT INTO schema_migrations (version) VALUES (4) ON CONFLICT (version) DO NOTHING;
