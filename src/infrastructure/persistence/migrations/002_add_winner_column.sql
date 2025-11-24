-- Add winner column to games table
-- This migration adds a winner field to track game outcomes at the database level

-- Add winner column (nullable to support draws and in-progress games)
ALTER TABLE games ADD COLUMN IF NOT EXISTS winner VARCHAR(255);

-- Create index on winner for efficient querying of completed games by winner
CREATE INDEX IF NOT EXISTS idx_games_winner ON games(winner) WHERE winner IS NOT NULL;

-- Record this migration as applied
INSERT INTO schema_migrations (version) VALUES (2)
ON CONFLICT (version) DO NOTHING;
