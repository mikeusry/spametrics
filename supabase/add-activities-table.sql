-- Add HubSpot Activities Tracking Table
-- Run this in your Supabase SQL Editor to add activity tracking

-- =============================================
-- ACTIVITIES TABLE
-- =============================================

-- Table: daily_rep_activities
-- Stores daily activity counts for each sales rep from HubSpot
CREATE TABLE IF NOT EXISTS daily_rep_activities (
    activity_id SERIAL PRIMARY KEY,
    date_id DATE NOT NULL REFERENCES dates(date_id),
    rep_id INT NOT NULL REFERENCES sales_reps(rep_id),
    hubspot_owner_id VARCHAR(50), -- HubSpot owner ID for mapping

    -- Activity counts
    calls INT DEFAULT 0,
    emails INT DEFAULT 0,
    meetings INT DEFAULT 0,
    notes INT DEFAULT 0,
    tasks INT DEFAULT 0,
    sms INT DEFAULT 0,
    total_activities INT DEFAULT 0,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure one record per day per rep
    UNIQUE(date_id, rep_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_rep_activities_date ON daily_rep_activities(date_id);
CREATE INDEX IF NOT EXISTS idx_daily_rep_activities_rep ON daily_rep_activities(rep_id);
CREATE INDEX IF NOT EXISTS idx_daily_rep_activities_hubspot ON daily_rep_activities(hubspot_owner_id);

-- Add a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_daily_rep_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_daily_rep_activities_updated_at
    BEFORE UPDATE ON daily_rep_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_rep_activities_updated_at();

-- Add a trigger to auto-calculate total_activities
CREATE OR REPLACE FUNCTION calculate_total_activities()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_activities = COALESCE(NEW.calls, 0) +
                          COALESCE(NEW.emails, 0) +
                          COALESCE(NEW.meetings, 0) +
                          COALESCE(NEW.notes, 0) +
                          COALESCE(NEW.tasks, 0) +
                          COALESCE(NEW.sms, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_total_activities
    BEFORE INSERT OR UPDATE ON daily_rep_activities
    FOR EACH ROW
    EXECUTE FUNCTION calculate_total_activities();

-- =============================================
-- HUBSPOT OWNER MAPPING TABLE
-- =============================================

-- Table: hubspot_owner_mapping
-- Maps HubSpot owner IDs to internal sales rep IDs
CREATE TABLE IF NOT EXISTS hubspot_owner_mapping (
    mapping_id SERIAL PRIMARY KEY,
    rep_id INT NOT NULL REFERENCES sales_reps(rep_id),
    hubspot_owner_id VARCHAR(50) NOT NULL UNIQUE,
    hubspot_owner_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for quick lookups
CREATE INDEX IF NOT EXISTS idx_hubspot_owner_mapping_owner ON hubspot_owner_mapping(hubspot_owner_id);
CREATE INDEX IF NOT EXISTS idx_hubspot_owner_mapping_rep ON hubspot_owner_mapping(rep_id);

COMMENT ON TABLE daily_rep_activities IS 'Daily activity counts from HubSpot for each sales representative';
COMMENT ON TABLE hubspot_owner_mapping IS 'Mapping between HubSpot owner IDs and internal sales rep IDs';
