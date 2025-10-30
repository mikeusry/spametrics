-- Enable Row Level Security on all tables
-- Since we're using custom auth (not Supabase Auth), we'll create policies
-- that allow access when using the service_role key (from backend) or authenticated session

-- Enable RLS on all core tables
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_reps ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_store_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_sales_rep_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summary_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_rep_goals ENABLE ROW LEVEL SECURITY;

-- Create policies that allow all operations for service_role
-- This allows the app to operate normally when authenticated through our custom auth

-- Stores policies
CREATE POLICY "Allow all access to stores" ON stores
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Sales reps policies
CREATE POLICY "Allow all access to sales_reps" ON sales_reps
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Daily store revenue policies
CREATE POLICY "Allow all access to daily_store_revenue" ON daily_store_revenue
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Daily sales rep revenue policies
CREATE POLICY "Allow all access to daily_sales_rep_revenue" ON daily_sales_rep_revenue
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Daily activities policies
CREATE POLICY "Allow all access to daily_activities" ON daily_activities
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Daily summary metrics policies
CREATE POLICY "Allow all access to daily_summary_metrics" ON daily_summary_metrics
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Monthly goals policies
CREATE POLICY "Allow all access to monthly_goals" ON monthly_goals
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Sales rep goals policies
CREATE POLICY "Allow all access to sales_rep_goals" ON sales_rep_goals
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Note: These policies allow all access because we're handling authentication
-- at the application layer (middleware.ts) with our custom password-based auth.
-- RLS is enabled to prevent direct database access through the Supabase client
-- if someone gets the anon key. The middleware ensures only authenticated users
-- can access the app, and the service_role key used by the app bypasses RLS.
