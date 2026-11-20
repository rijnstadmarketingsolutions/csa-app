-- Ronde 3: Telegram-koppeling
CREATE TABLE IF NOT EXISTS tg_links (user_id TEXT PRIMARY KEY, chat_id TEXT NOT NULL UNIQUE, username TEXT, created INTEGER);
CREATE TABLE IF NOT EXISTS tg_codes (code TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires INTEGER NOT NULL);
