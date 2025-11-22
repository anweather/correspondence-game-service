-- Initial schema for async boardgame service
-- Creates games table with JSONB state storage and schema_migrations tracking table

-- Create schema_migrations table to track applied migrations
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create games table with JSONB state column
CREATE TABLE IF NOT EXISTS games (
    game_id VARCHAR(255) PRIMARY KEY,
    game_type VARCHAR(100) NOT NULL,
    lifecycle VARCHAR(50) NOT NULL,
    state JSONB NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_games_lifecycle ON games(lifecycle);
CREATE INDEX IF NOT EXISTS idx_games_game_type ON games(game_type);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at);

-- Create GIN index on players array in JSONB for fast player-based queries
CREATE INDEX IF NOT EXISTS idx_games_players ON games USING GIN ((state->'players'));

-- Record this migration as applied
INSERT INTO schema_migrations (version) VALUES (1)
ON CONFLICT (version) DO NOTHING;
