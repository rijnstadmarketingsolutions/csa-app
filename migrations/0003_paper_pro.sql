-- Uitgebreide oefenhandel: orders (limiet/stop, winst nemen/stop-loss), waardehistorie, gerealiseerd resultaat
CREATE TABLE IF NOT EXISTS paper_orders (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, sym TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'crypto', type TEXT NOT NULL, side TEXT NOT NULL, eur REAL, qty REAL, allq INTEGER NOT NULL DEFAULT 0, lvl REAL NOT NULL, oco INTEGER, status TEXT NOT NULL DEFAULT 'open', created INTEGER NOT NULL, done INTEGER, price REAL, note TEXT);
CREATE INDEX IF NOT EXISTS paper_orders_open ON paper_orders(status);
CREATE INDEX IF NOT EXISTS paper_orders_user ON paper_orders(user_id, created);
CREATE TABLE IF NOT EXISTS paper_hist (user_id TEXT NOT NULL, t INTEGER NOT NULL, value REAL NOT NULL, PRIMARY KEY (user_id, t));
ALTER TABLE paper ADD COLUMN realized REAL NOT NULL DEFAULT 0;
ALTER TABLE paper ADD COLUMN fees REAL NOT NULL DEFAULT 0;
ALTER TABLE paper ADD COLUMN created INTEGER;
ALTER TABLE paper_trades ADD COLUMN kind TEXT;
ALTER TABLE paper_trades ADD COLUMN fee REAL;
ALTER TABLE paper_trades ADD COLUMN pnl REAL;
ALTER TABLE paper_trades ADD COLUMN src TEXT;
ALTER TABLE paper_trades ADD COLUMN via TEXT;
