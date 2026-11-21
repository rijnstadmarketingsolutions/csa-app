-- Startkapitaal per oefenaccount (standaard € 10.000; kan hoger worden door een storting van het team)
ALTER TABLE paper ADD COLUMN start REAL NOT NULL DEFAULT 10000;
