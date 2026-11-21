-- Discord in plaats van Telegram
CREATE TABLE IF NOT EXISTS dc_links (user_id TEXT PRIMARY KEY, discord_id TEXT NOT NULL UNIQUE, username TEXT, dm TEXT, created INTEGER NOT NULL, synced INTEGER);
DROP TABLE IF EXISTS tg_links;
DROP TABLE IF EXISTS tg_codes;
