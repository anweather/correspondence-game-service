ALTER TABLE games ADD COLUMN IF NOT EXISTS game_name VARCHAR(100);

ALTER TABLE games ADD COLUMN IF NOT EXISTS game_description TEXT;

ALTER TABLE games ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_games_created_by ON games(created_by);

INSERT INTO schema_migrations (version) VALUES (5) ON CONFLICT (version) DO NOTHING;
