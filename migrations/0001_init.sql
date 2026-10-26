CREATE TABLE stays (
  id         TEXT PRIMARY KEY,
  country    TEXT NOT NULL,
  entry_date TEXT NOT NULL,
  exit_date  TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
