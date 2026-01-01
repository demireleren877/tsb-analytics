-- Subscriptions table for data update notifications
CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_notified_at DATETIME DEFAULT NULL,
  unsubscribe_token TEXT NOT NULL UNIQUE
);

-- Data check history to track when new data was found
CREATE TABLE IF NOT EXISTS data_check_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  check_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  latest_period TEXT,
  new_data_found INTEGER DEFAULT 0,
  notification_sent INTEGER DEFAULT 0,
  notification_count INTEGER DEFAULT 0
);

-- Settings for the worker
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT OR IGNORE INTO app_settings (key, value) VALUES
  ('last_known_period', ''),
  ('check_enabled', 'true');

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(is_active);
