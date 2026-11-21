-- Vrienden, chat en crypto sturen
ALTER TABLE users ADD COLUMN username TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS users_username ON users(username);
CREATE TABLE IF NOT EXISTS friends (a TEXT NOT NULL, b TEXT NOT NULL, status TEXT NOT NULL, req TEXT NOT NULL, created INTEGER NOT NULL, updated INTEGER, PRIMARY KEY (a, b));
CREATE INDEX IF NOT EXISTS friends_b ON friends(b);
CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, conv TEXT NOT NULL, sender TEXT NOT NULL, recipient TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'text', body TEXT, data TEXT, t INTEGER NOT NULL, read INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS messages_conv ON messages(conv, id);
CREATE INDEX IF NOT EXISTS messages_unread ON messages(recipient, read);
