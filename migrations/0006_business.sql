-- Ronde 4/5: proefperiode, widget-sleutels, laatst actief
ALTER TABLE users ADD COLUMN trial_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN last_seen INTEGER;
CREATE TABLE IF NOT EXISTS widget_keys (key TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE, created INTEGER NOT NULL);
