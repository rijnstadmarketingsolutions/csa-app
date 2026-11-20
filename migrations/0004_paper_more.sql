-- Ronde 1: periodiek kopen, trailing stop, benchmark, ranglijst, dagboek
CREATE TABLE IF NOT EXISTS paper_dca (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, sym TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'crypto', eur REAL NOT NULL, every TEXT NOT NULL, next INTEGER NOT NULL, active INTEGER NOT NULL DEFAULT 1, created INTEGER NOT NULL, last INTEGER, runs INTEGER NOT NULL DEFAULT 0, note TEXT);
CREATE INDEX IF NOT EXISTS paper_dca_due ON paper_dca(active, next);
ALTER TABLE paper_orders ADD COLUMN trail REAL;
ALTER TABLE paper_orders ADD COLUMN peak REAL;
ALTER TABLE paper_trades ADD COLUMN note TEXT;
ALTER TABLE paper_hist ADD COLUMN btc REAL;
ALTER TABLE paper_hist ADD COLUMN spy REAL;
ALTER TABLE paper ADD COLUMN board INTEGER NOT NULL DEFAULT 0;
ALTER TABLE paper ADD COLUMN nick TEXT;
