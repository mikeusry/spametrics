-- Georgia Spa Company Sales Dashboard - Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- REFERENCE TABLES
-- =============================================

-- Table: dates (Date Dimension)
CREATE TABLE dates (
    date_id DATE PRIMARY KEY,
    day_of_week VARCHAR(10) NOT NULL,
    day_of_month INT NOT NULL,
    month INT NOT NULL,
    year INT NOT NULL,
    is_workday BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: stores
CREATE TABLE stores (
    store_id SERIAL PRIMARY KEY,
    store_name VARCHAR(50) NOT NULL UNIQUE,
    store_type VARCHAR(20) NOT NULL, -- 'Retail', 'Warehouse', 'Partnership'
    region VARCHAR(50), -- 'NGA', 'Metro Atlanta', etc.
    is_active BOOLEAN DEFAULT true,
    opened_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: sales_reps
CREATE TABLE sales_reps (
    rep_id SERIAL PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    full_name VARCHAR(100) NOT NULL UNIQUE,
    role VARCHAR(50), -- 'Sales Pro', 'Manager', 'Floater', etc.
    hire_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- GOALS TABLES
-- =============================================

-- Table: monthly_goals
CREATE TABLE monthly_goals (
    goal_id SERIAL PRIMARY KEY,
    month DATE NOT NULL, -- First day of month
    store_id INT REFERENCES stores(store_id),
    store_goal DECIMAL(12, 2),
    company_goal DECIMAL(12, 2),
    ly_revenue DECIMAL(12, 2), -- Last year revenue for comparison
    work_days INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(month, store_id)
);

-- Table: sales_rep_goals
CREATE TABLE sales_rep_goals (
    rep_goal_id SERIAL PRIMARY KEY,
    month DATE NOT NULL, -- First day of month
    rep_id INT REFERENCES sales_reps(rep_id),
    monthly_goal DECIMAL(12, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(month, rep_id)
);

-- =============================================
-- DAILY PERFORMANCE TABLES
-- =============================================

-- Table: daily_store_revenue
CREATE TABLE daily_store_revenue (
    revenue_id SERIAL PRIMARY KEY,
    date_id DATE REFERENCES dates(date_id),
    store_id INT REFERENCES stores(store_id),
    daily_revenue DECIMAL(12, 2), -- Calculated from MTD difference
    mtd_revenue DECIMAL(12, 2), -- As recorded in sheet
    ly_revenue DECIMAL(12, 2), -- Last year comparison
    goal_revenue DECIMAL(12, 2),
    percent_to_ly DECIMAL(6, 2),
    percent_to_goal DECIMAL(6, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date_id, store_id)
);

-- Table: daily_sales_rep_revenue
CREATE TABLE daily_sales_rep_revenue (
    rep_revenue_id SERIAL PRIMARY KEY,
    date_id DATE REFERENCES dates(date_id),
    rep_id INT REFERENCES sales_reps(rep_id),
    daily_revenue DECIMAL(12, 2), -- Calculated
    mtd_revenue DECIMAL(12, 2), -- As recorded
    goal_revenue DECIMAL(12, 2),
    mtd_variance DECIMAL(12, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date_id, rep_id)
);

-- Table: daily_activities (HubSpot data)
CREATE TABLE daily_activities (
    activity_id SERIAL PRIMARY KEY,
    date_id DATE REFERENCES dates(date_id),
    rep_id INT REFERENCES sales_reps(rep_id),
    in_store BOOLEAN DEFAULT false, -- X marking for in-store
    calls INT DEFAULT 0,
    email_replies INT DEFAULT 0,
    emails_sent INT DEFAULT 0,
    sms_sent INT DEFAULT 0,
    chat_interactions INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date_id, rep_id)
);

-- Table: daily_traffic (Walk-ins and Sales)
CREATE TABLE daily_traffic (
    traffic_id SERIAL PRIMARY KEY,
    date_id DATE REFERENCES dates(date_id),
    rep_id INT REFERENCES sales_reps(rep_id),
    ht_walk_in INT DEFAULT 0, -- Hot Tub walk-ins
    ss_walk_in INT DEFAULT 0, -- Swim Spa walk-ins
    sau_walk_in INT DEFAULT 0, -- Sauna walk-ins
    cp_walk_in INT DEFAULT 0, -- Cold Plunge walk-ins
    ht_sold_store INT DEFAULT 0, -- Hot Tubs sold in-store
    ht_sold_outside INT DEFAULT 0, -- Hot Tubs sold outside
    sauna_sold_store INT DEFAULT 0,
    sauna_sold_outside INT DEFAULT 0,
    ss_sold_store INT DEFAULT 0, -- Swim Spas sold in-store
    ss_sold_outside INT DEFAULT 0,
    cp_sold INT DEFAULT 0, -- Cold Plunge sold
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date_id, rep_id)
);

-- Table: daily_internet_leads
CREATE TABLE daily_internet_leads (
    lead_id SERIAL PRIMARY KEY,
    date_id DATE REFERENCES dates(date_id),
    store_id INT REFERENCES stores(store_id),
    lead_count INT DEFAULT 0,
    ooa_leads INT DEFAULT 0, -- Out of Area leads
    unaddressed_leads INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date_id, store_id)
);

-- Table: daily_summary_metrics (Company-wide daily metrics)
CREATE TABLE daily_summary_metrics (
    summary_id SERIAL PRIMARY KEY,
    date_id DATE REFERENCES dates(date_id) UNIQUE,
    month_goal DECIMAL(12, 2),
    mtd_revenue DECIMAL(12, 2),
    daily_revenue DECIMAL(12, 2), -- Calculated from store totals
    ly_mtd_revenue DECIMAL(12, 2),
    oconee_mtd_rev DECIMAL(12, 2),
    nga_revenue DECIMAL(12, 2), -- Oconee + Blue Ridge + Blairsville
    per_day_to_beat_ly DECIMAL(12, 2),
    goal_per_day DECIMAL(12, 2),
    days_passed INT,
    days_remaining INT,
    percent_to_goal DECIMAL(6, 2),
    standing_to_goal DECIMAL(12, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- AUDIT & METADATA
-- =============================================

-- Table: audit_log (Track data imports)
CREATE TABLE audit_log (
    log_id SERIAL PRIMARY KEY,
    date_imported DATE NOT NULL,
    sheet_name VARCHAR(100),
    rows_imported INT,
    import_status VARCHAR(20), -- 'success', 'partial', 'failed'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Date-based queries
CREATE INDEX idx_daily_store_revenue_date ON daily_store_revenue(date_id);
CREATE INDEX idx_daily_sales_rep_revenue_date ON daily_sales_rep_revenue(date_id);
CREATE INDEX idx_daily_activities_date ON daily_activities(date_id);
CREATE INDEX idx_daily_traffic_date ON daily_traffic(date_id);
CREATE INDEX idx_daily_internet_leads_date ON daily_internet_leads(date_id);

-- Store-based queries
CREATE INDEX idx_daily_store_revenue_store ON daily_store_revenue(store_id);
CREATE INDEX idx_monthly_goals_store ON monthly_goals(store_id);
CREATE INDEX idx_daily_internet_leads_store ON daily_internet_leads(store_id);

-- Rep-based queries
CREATE INDEX idx_daily_sales_rep_revenue_rep ON daily_sales_rep_revenue(rep_id);
CREATE INDEX idx_daily_activities_rep ON daily_activities(rep_id);
CREATE INDEX idx_daily_traffic_rep ON daily_traffic(rep_id);
CREATE INDEX idx_sales_rep_goals_rep ON sales_rep_goals(rep_id);

-- Month-based queries
CREATE INDEX idx_monthly_goals_month ON monthly_goals(month);
CREATE INDEX idx_sales_rep_goals_month ON sales_rep_goals(month);

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_reps_updated_at BEFORE UPDATE ON sales_reps
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_monthly_goals_updated_at BEFORE UPDATE ON monthly_goals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_rep_goals_updated_at BEFORE UPDATE ON sales_rep_goals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_store_revenue_updated_at BEFORE UPDATE ON daily_store_revenue
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_sales_rep_revenue_updated_at BEFORE UPDATE ON daily_sales_rep_revenue
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_activities_updated_at BEFORE UPDATE ON daily_activities
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_traffic_updated_at BEFORE UPDATE ON daily_traffic
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_internet_leads_updated_at BEFORE UPDATE ON daily_internet_leads
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_summary_metrics_updated_at BEFORE UPDATE ON daily_summary_metrics
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- View: Current MTD Revenue by Store
CREATE VIEW v_current_mtd_store_revenue AS
SELECT
    s.store_name,
    s.store_type,
    s.region,
    SUM(dsr.daily_revenue) as mtd_revenue,
    mg.store_goal,
    mg.ly_revenue,
    (SUM(dsr.daily_revenue) / NULLIF(mg.store_goal, 0) * 100) as percent_to_goal,
    (SUM(dsr.daily_revenue) / NULLIF(mg.ly_revenue, 0) * 100) as percent_to_ly
FROM stores s
LEFT JOIN daily_store_revenue dsr ON s.store_id = dsr.store_id
LEFT JOIN monthly_goals mg ON s.store_id = mg.store_id
    AND mg.month = DATE_TRUNC('month', CURRENT_DATE)
WHERE dsr.date_id >= DATE_TRUNC('month', CURRENT_DATE)
    AND s.is_active = true
GROUP BY s.store_id, s.store_name, s.store_type, s.region, mg.store_goal, mg.ly_revenue;

-- View: Current MTD Revenue by Sales Rep
CREATE VIEW v_current_mtd_rep_revenue AS
SELECT
    sr.full_name,
    sr.role,
    SUM(dsrr.daily_revenue) as mtd_revenue,
    srg.monthly_goal,
    (SUM(dsrr.daily_revenue) - srg.monthly_goal) as variance_to_goal,
    (SUM(dsrr.daily_revenue) / NULLIF(srg.monthly_goal, 0) * 100) as percent_to_goal
FROM sales_reps sr
LEFT JOIN daily_sales_rep_revenue dsrr ON sr.rep_id = dsrr.rep_id
LEFT JOIN sales_rep_goals srg ON sr.rep_id = srg.rep_id
    AND srg.month = DATE_TRUNC('month', CURRENT_DATE)
WHERE dsrr.date_id >= DATE_TRUNC('month', CURRENT_DATE)
    AND sr.is_active = true
GROUP BY sr.rep_id, sr.full_name, sr.role, srg.monthly_goal;

-- View: NGA Revenue (North Georgia Region)
CREATE VIEW v_nga_revenue AS
SELECT
    dsr.date_id,
    SUM(dsr.daily_revenue) as daily_nga_revenue,
    SUM(dsr.mtd_revenue) as mtd_nga_revenue
FROM daily_store_revenue dsr
JOIN stores s ON dsr.store_id = s.store_id
WHERE s.store_name IN ('Oconee', 'Blue Ridge', 'Blairsville')
GROUP BY dsr.date_id;

-- =============================================
-- SEED DATA
-- =============================================

-- Insert Stores
INSERT INTO stores (store_name, store_type, region, is_active, opened_date) VALUES
('Buford', 'Retail', 'Metro Atlanta', true, '2010-01-01'),
('Athens', 'Retail', 'Northeast Georgia', true, '2012-01-01'),
('Warehouse', 'Warehouse', 'Operations', true, '2010-01-01'),
('Kennesaw', 'Retail', 'Metro Atlanta', true, '2013-01-01'),
('Alpharetta', 'Retail', 'Metro Atlanta', true, '2015-01-01'),
('Augusta', 'Retail', 'East Georgia', true, '2016-01-01'),
('Newnan', 'Retail', 'South Atlanta', true, '2018-01-01'),
('Oconee', 'Retail', 'NGA', true, '2023-01-01'),
('Blue Ridge', 'Retail', 'NGA', true, '2024-01-01'),
('Blairsville', 'Retail', 'NGA', true, '2024-01-01'),
('Costco', 'Partnership', 'Partnership', true, '2020-01-01');

-- Insert Sales Reps (from the analysis)
INSERT INTO sales_reps (full_name, role, is_active) VALUES
('Cherry Durand', 'Sales Pro', true),
('Jodi Martin', 'Sales Pro', true),
('Colleen Hall', 'Sales Pro', true),
('Brian Shedd', 'Sales Pro', true),
('Ronnie Armento', 'Sales Pro', true),
('Tim Tillman', 'Sales Pro', true),
('Joe Brooks', 'Sales Pro', true),
('Donna Jensen', 'Sales Pro', true),
('Katie Cannington', 'Sales Pro', true),
('Larry Cheshier', 'Sales Pro', true),
('Glen Sanford', 'Sales Pro', true),
('David Wheaton', 'Sales Pro', true),
('Carter Hughes', 'Sales Pro', true),
('Jody Morgan', 'Sales Pro', true),
('Mike Ruffolo', 'Sales Pro', true),
('Nicole Orozco', 'Sales Pro', true),
('Rich Feggeler', 'Sales Pro', true),
('Kameron Helms', 'Sales Pro', true),
('Elliott Hood', 'Sales Pro', true),
('Danyel Straut', 'Sales Pro', true),
('Erica McCoy', 'Sales Pro', true),
('Ashley Norton', 'Sales Pro', true),
('Chad Shafer', 'Warehouse Manager', true),
('Christina Nicholson', 'Sales Pro', true),
('Candy Johnson', 'Sales Pro', true),
('Mark Baker', 'Sales Pro', true);

-- Generate date dimension for 2024-2025 (can be extended)
INSERT INTO dates (date_id, day_of_week, day_of_month, month, year, is_workday)
SELECT
    date_series::date,
    TO_CHAR(date_series, 'Day'),
    EXTRACT(DAY FROM date_series)::int,
    EXTRACT(MONTH FROM date_series)::int,
    EXTRACT(YEAR FROM date_series)::int,
    CASE WHEN EXTRACT(DOW FROM date_series) IN (0, 6) THEN false ELSE true END
FROM generate_series('2024-01-01'::date, '2025-12-31'::date, '1 day'::interval) AS date_series;

-- =============================================
-- ROW LEVEL SECURITY (Optional - for later)
-- =============================================

-- Enable RLS on tables (uncomment when ready to implement auth)
-- ALTER TABLE daily_store_revenue ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE daily_sales_rep_revenue ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE daily_activities ENABLE ROW LEVEL SECURITY;

-- Create policies (example - adjust based on your auth strategy)
-- CREATE POLICY "Allow read access to authenticated users" ON daily_store_revenue
--   FOR SELECT USING (auth.role() = 'authenticated');
