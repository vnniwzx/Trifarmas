-- Trifarmas — schema do banco de dados (SQLite real, via node:sqlite)
-- Rode isto automaticamente ao iniciar o servidor (server.js já faz isso sozinho).

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  avatar        TEXT,
  points        INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pharmacies (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT NOT NULL,
  dist_km   REAL NOT NULL,
  map_x     REAL NOT NULL,
  map_y     REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS medicines (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  name     TEXT NOT NULL,
  category TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS prices (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  medicine_id  INTEGER NOT NULL REFERENCES medicines(id),
  pharmacy_id  INTEGER NOT NULL REFERENCES pharmacies(id),
  price        REAL NOT NULL,
  UNIQUE(medicine_id, pharmacy_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  medicine_id   INTEGER NOT NULL REFERENCES medicines(id),
  pharmacy_id   INTEGER NOT NULL REFERENCES pharmacies(id),
  price         REAL NOT NULL,
  points_value  INTEGER NOT NULL,
  pickup_code   TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'Pedido recebido', -- vira 'Concluído' só na confirmação de retirada
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  concluded_at  TEXT
);

CREATE TABLE IF NOT EXISTS reminders (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id  INTEGER NOT NULL REFERENCES users(id),
  med_name TEXT NOT NULL,
  time     TEXT NOT NULL,
  day      INTEGER NOT NULL,
  month    INTEGER NOT NULL,
  year     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS points_ledger (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  delta      INTEGER NOT NULL,       -- positivo = ganhou, negativo = resgatou
  reason     TEXT NOT NULL,
  order_id   INTEGER REFERENCES orders(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rewards (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  cost        INTEGER NOT NULL
);
