-- TSB Analytics Platform - Initial Schema
-- Created: 2025-12-31

-- Companies Table
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('HD', 'HY')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_companies_code ON companies(code);
CREATE INDEX idx_companies_type ON companies(type);

-- Branch Codes Table
CREATE TABLE IF NOT EXISTS branch_codes (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT
);

INSERT INTO branch_codes (code, name, description) VALUES
  ('701', 'Kaza', 'Kaza Sigortası'),
  ('715', 'Nakliyat', 'Nakliyat Sigortası'),
  ('716', 'Yangın ve Doğal Afetler', 'Yangın ve Doğal Afetler Sigortası'),
  ('717', 'Genel Zararlar', 'Genel Zararlar Sigortası'),
  ('719', 'Genel Sorumluluk', 'Genel Sorumluluk Sigortası'),
  ('855', 'Kredi', 'Kredi Sigortası'),
  ('856', 'Kefalet', 'Kefalet Sigortası');

-- Periods Table
CREATE TABLE IF NOT EXISTS periods (
  period TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL CHECK(quarter BETWEEN 1 AND 4)
);

CREATE INDEX idx_periods_year ON periods(year);
CREATE INDEX idx_periods_quarter ON periods(quarter);

-- Financial Data Table
CREATE TABLE IF NOT EXISTS financial_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  branch_code TEXT NOT NULL,
  period TEXT NOT NULL,

  -- Brüt Değerler
  gross_written_premium REAL DEFAULT 0,
  ceded_to_reinsurer REAL DEFAULT 0,
  transferred_to_sgk REAL DEFAULT 0,
  unearned_premium_reserve REAL DEFAULT 0,
  previous_unearned_premium_reserve REAL DEFAULT 0,
  reinsurer_share_unearned REAL DEFAULT 0,
  previous_reinsurer_share_unearned REAL DEFAULT 0,
  sgk_share_unearned REAL DEFAULT 0,
  previous_sgk_share_unearned REAL DEFAULT 0,
  technical_investment_income REAL DEFAULT 0,
  gross_paid_claims REAL DEFAULT 0,
  reinsurer_share_paid_claims REAL DEFAULT 0,
  incurred_claims REAL DEFAULT 0,
  unreported_claims REAL DEFAULT 0,
  reinsurer_share_incurred REAL DEFAULT 0,
  reinsurer_share_unreported REAL DEFAULT 0,

  -- Net Hesaplamalar
  net_premium REAL DEFAULT 0,
  net_unearned_reserve REAL DEFAULT 0,
  net_payment REAL DEFAULT 0,
  net_unreported REAL DEFAULT 0,
  net_incurred REAL DEFAULT 0,
  net_earned_premium REAL DEFAULT 0,

  -- Previous Year End (PYE)
  pye_net_payment REAL DEFAULT NULL,
  pye_net_unreported REAL DEFAULT NULL,
  pye_net_incurred REAL DEFAULT NULL,
  pye_net_earned_premium REAL DEFAULT NULL,

  -- Previous Quarter (PQ)
  pq_net_payment REAL DEFAULT NULL,
  pq_net_unreported REAL DEFAULT NULL,
  pq_net_incurred REAL DEFAULT NULL,
  pq_net_earned_premium REAL DEFAULT NULL,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_code) REFERENCES branch_codes(code),
  FOREIGN KEY (period) REFERENCES periods(period),
  UNIQUE(company_id, branch_code, period)
);

CREATE INDEX idx_financial_data_company ON financial_data(company_id);
CREATE INDEX idx_financial_data_branch ON financial_data(branch_code);
CREATE INDEX idx_financial_data_period ON financial_data(period);
CREATE INDEX idx_financial_data_composite ON financial_data(company_id, branch_code, period);
