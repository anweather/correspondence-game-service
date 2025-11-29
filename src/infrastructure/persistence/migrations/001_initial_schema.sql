CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TIMESTAMP NOT NULL DEFAULT NOW());

CREATE TABLE IF NOT EXISTS games (game_id VARCHAR(255) PRIMARY KEY, game_type VARCHAR(100) NOT NULL, lifecycle VARCHAR(50) NOT NULL, winner VARCHAR(255), state JSONB NOT NULL, version INTEGER NOT NULL DEFAULT 1, created_at TIMESTAMP NOT NULL DEFAULT NOW(), updated_at TIMESTAMP NOT NULL DEFAULT NOW());

CREATE INDEX IF NOT EXISTS idx_games_lifecycle ON games(lifecycle);

CREATE INDEX IF NOT EXISTS idx_games_game_type ON games(game_type);

CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at);

CREATE INDEX IF NOT EXISTS idx_games_players ON games USING GIN ((state->'players'));

INSERT INTO schema_migrations (version) VALUES (1) ON CONFLICT (version) DO NOTHING;
