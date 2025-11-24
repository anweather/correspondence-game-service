-- Add authentication support
-- Creates player_identities table and adds creator tracking to games table

-- Create player_identities table
CREATE TABLE IF NOT EXISTS player_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    external_auth_provider VARCHAR(50),
    external_auth_id VARCHAR(255),
    email VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_used TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create unique index on (external_auth_provider, external_auth_id)
-- This ensures one player per external auth account
-- Partial index only applies when both fields are not null
CREATE UNIQUE INDEX IF NOT EXISTS idx_player_identities_external_auth 
    ON player_identities(external_auth_provider, external_auth_id)
    WHERE external_auth_provider IS NOT NULL AND external_auth_id IS NOT NULL;

-- Create index on name for efficient lookups
CREATE INDEX IF NOT EXISTS idx_player_identities_name ON player_identities(name);

-- Add creator_player_id foreign key to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS creator_player_id UUID REFERENCES player_identities(id);

-- Create index on creator_player_id for efficient queries
CREATE INDEX IF NOT EXISTS idx_games_creator ON games(creator_player_id);

-- Record this migration as applied
INSERT INTO schema_migrations (version) VALUES (3)
ON CONFLICT (version) DO NOTHING;
