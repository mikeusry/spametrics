-- Migration: Add HubSpot Sync Support
-- Created: 2025-10-30
-- Description: Adds hubspot_owner_id to sales_reps and creates sales_rep_activities table

-- Add hubspot_owner_id column to sales_reps table
ALTER TABLE sales_reps
ADD COLUMN IF NOT EXISTS hubspot_owner_id VARCHAR(50) UNIQUE;

-- Create sales_rep_activities table for HubSpot sync
CREATE TABLE IF NOT EXISTS sales_rep_activities (
    activity_id SERIAL PRIMARY KEY,
    date_id DATE NOT NULL REFERENCES dates(date_id),
    rep_id INT NOT NULL REFERENCES sales_reps(rep_id),
    calls INT DEFAULT 0,
    emails INT DEFAULT 0,
    meetings INT DEFAULT 0,
    notes INT DEFAULT 0,
    sms INT DEFAULT 0,
    total_activities INT DEFAULT 0,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date_id, rep_id)
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_sales_rep_activities_date ON sales_rep_activities(date_id);
CREATE INDEX IF NOT EXISTS idx_sales_rep_activities_rep ON sales_rep_activities(rep_id);
CREATE INDEX IF NOT EXISTS idx_sales_rep_activities_synced ON sales_rep_activities(synced_at);

-- Add comment explaining the table
COMMENT ON TABLE sales_rep_activities IS 'Daily activity metrics synced from HubSpot (calls, emails, meetings, notes, SMS)';

-- Add trigger for updated_at
CREATE TRIGGER update_sales_rep_activities_updated_at
BEFORE UPDATE ON sales_rep_activities
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for latest activity summary
CREATE OR REPLACE VIEW v_rep_activity_summary AS
SELECT
    sr.full_name,
    sr.role,
    sr.hubspot_owner_id,
    sra.date_id,
    sra.calls,
    sra.emails,
    sra.meetings,
    sra.notes,
    sra.sms,
    sra.total_activities,
    sra.synced_at
FROM sales_reps sr
LEFT JOIN sales_rep_activities sra ON sr.rep_id = sra.rep_id
WHERE sr.is_active = true
ORDER BY sra.date_id DESC, sr.full_name;

-- Create view for MTD activity totals
CREATE OR REPLACE VIEW v_mtd_rep_activities AS
SELECT
    sr.rep_id,
    sr.full_name,
    sr.role,
    SUM(sra.calls) as total_calls,
    SUM(sra.emails) as total_emails,
    SUM(sra.meetings) as total_meetings,
    SUM(sra.notes) as total_notes,
    SUM(sra.sms) as total_sms,
    SUM(sra.total_activities) as total_activities,
    MAX(sra.synced_at) as last_synced_at
FROM sales_reps sr
LEFT JOIN sales_rep_activities sra ON sr.rep_id = sra.rep_id
WHERE sra.date_id >= DATE_TRUNC('month', CURRENT_DATE)
    AND sr.is_active = true
GROUP BY sr.rep_id, sr.full_name, sr.role
ORDER BY total_activities DESC;
