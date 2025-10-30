-- Fix Goal Management - Disable Row Level Security
-- Run this in Supabase SQL Editor to allow goal saves

-- OPTION 1: Disable RLS (Recommended for internal management app)
-- This allows full access to goals tables without authentication
ALTER TABLE monthly_goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_rep_goals DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('monthly_goals', 'sales_rep_goals');

-- Expected result: rowsecurity should be 'false' for both tables

-- =============================================
-- OPTION 2: Add Permissive Policies (Alternative)
-- If you want to keep RLS enabled but allow all operations
-- Comment out Option 1 above and uncomment the lines below:
-- =============================================

/*
-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow all operations on monthly_goals" ON monthly_goals;
DROP POLICY IF EXISTS "Allow all operations on sales_rep_goals" ON sales_rep_goals;

-- Create permissive policies
CREATE POLICY "Allow all operations on monthly_goals"
  ON monthly_goals
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on sales_rep_goals"
  ON sales_rep_goals
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('monthly_goals', 'sales_rep_goals');
*/

-- Test queries (after running the fix)
-- Try inserting a test goal
-- INSERT INTO monthly_goals (month, store_id, store_goal)
-- VALUES ('2025-10-01', 1, 100000.00)
-- ON CONFLICT (month, store_id) DO UPDATE SET store_goal = 100000.00;
