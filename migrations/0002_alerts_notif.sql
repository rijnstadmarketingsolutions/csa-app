-- CSA 1.2: koersalerts en meldingenlog
CREATE TABLE IF NOT EXISTS price_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  sym TEXT NOT NULL,
  kind TEXT NOT NULL,          -- above | below | up1h | down1h | up24h | down24h
  value REAL NOT NULL,         -- koers in EUR/USD, of percentage
  active INTEGER NOT NULL DEFAULT 1,
  created INTEGER NOT NULL,
  fired INTEGER,
  note TEXT
);
CREATE INDEX IF NOT EXISTS price_alerts_user ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS price_alerts_active ON price_alerts(active);
CREATE TABLE IF NOT EXISTS notif (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  url TEXT,
  cat TEXT,
  score INTEGER,
  t INTEGER NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS notif_user_t ON notif(user_id, t);
