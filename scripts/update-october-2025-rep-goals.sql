-- Update October 2025 Sales Rep Goals
-- Run this in Supabase SQL Editor

-- Insert or update October 2025 goals for all sales reps
INSERT INTO sales_rep_goals (month, rep_id, monthly_goal, updated_at)
VALUES
  -- Cherry Durand: $79,808
  ('2025-10-01', (SELECT rep_id FROM sales_reps WHERE full_name = 'Cherry Durand'), 79808.00, NOW()),

  -- Jodi Martin: $143,113
  ('2025-10-01', (SELECT rep_id FROM sales_reps WHERE full_name = 'Jodi Martin'), 143113.00, NOW()),

  -- Colleen Hall: $79,808
  ('2025-10-01', (SELECT rep_id FROM sales_reps WHERE full_name = 'Colleen Hall'), 79808.00, NOW()),

  -- Ronnie Armento: $115,812
  ('2025-10-01', (SELECT rep_id FROM sales_reps WHERE full_name = 'Ronnie Armento'), 115812.00, NOW()),

  -- Tim Tillman: $68,260
  ('2025-10-01', (SELECT rep_id FROM sales_reps WHERE full_name = 'Tim Tillman'), 68260.00, NOW()),

  -- Joe Brooks: $61,204
  ('2025-10-01', (SELECT rep_id FROM sales_reps WHERE full_name = 'Joe Brooks'), 61204.00, NOW()),

  -- Donna Jensen: $120,764
  ('2025-10-01', (SELECT rep_id FROM sales_reps WHERE full_name = 'Donna Jensen'), 120764.00, NOW()),

  -- Katie Cannington: $120,764
  ('2025-10-01', (SELECT rep_id FROM sales_reps WHERE full_name = 'Katie Cannington'), 120764.00, NOW()),

  -- Larry Cheshier: $102,160
  ('2025-10-01', (SELECT rep_id FROM sales_reps WHERE full_name = 'Larry Cheshier'), 102160.00, NOW()),

  -- Glen Sanford: $102,160
  ('2025-10-01', (SELECT rep_id FROM sales_reps WHERE full_name = 'Glen Sanford'), 102160.00, NOW()),

  -- David Wheaton: $102,160
  ('2025-10-01', (SELECT rep_id FROM sales_reps WHERE full_name = 'David Wheaton'), 102160.00, NOW()),

  -- Carter Hughes: $115,812
  ('2025-10-01', (SELECT rep_id FROM sales_reps WHERE full_name = 'Carter Hughes'), 115812.00, NOW()),

  -- Kameron Helms: $54,608
  ('2025-10-01', (SELECT rep_id FROM sales_reps WHERE full_name = 'Kameron Helms'), 54608.00, NOW()),

  -- Mike Ruffolo: $115,812
  ('2025-10-01', (SELECT rep_id FROM sales_reps WHERE full_name = 'Mike Ruffolo'), 115812.00, NOW()),

  -- Nicole Orozco: $115,812
  ('2025-10-01', (SELECT rep_id FROM sales_reps WHERE full_name = 'Nicole Orozco'), 115812.00, NOW()),

  -- Rich Feggeler: $151,816
  ('2025-10-01', (SELECT rep_id FROM sales_reps WHERE full_name = 'Rich Feggeler'), 151816.00, NOW()),

  -- Elliott Hood: $54,608
  ('2025-10-01', (SELECT rep_id FROM sales_reps WHERE full_name = 'Elliott Hood'), 54608.00, NOW()),

  -- Danyel Straut: $49,656
  ('2025-10-01', (SELECT rep_id FROM sales_reps WHERE full_name = 'Danyel Straut'), 49656.00, NOW()),

  -- Erica McCoy: $49,656
  ('2025-10-01', (SELECT rep_id FROM sales_reps WHERE full_name = 'Erica McCoy'), 49656.00, NOW()),

  -- Ashley Norton: $49,656
  ('2025-10-01', (SELECT rep_id FROM sales_reps WHERE full_name = 'Ashley Norton'), 49656.00, NOW())

ON CONFLICT (month, rep_id)
DO UPDATE SET
  monthly_goal = EXCLUDED.monthly_goal,
  updated_at = NOW();

-- Note: MGMT Goal ($186,172) is for managers (Chad Shafer & Candy Johnson)
-- Add separately if you want to assign goals to managers:
-- ('2025-10-01', (SELECT rep_id FROM sales_reps WHERE full_name = 'Chad Shafer'), 93086.00, NOW()),
-- ('2025-10-01', (SELECT rep_id FROM sales_reps WHERE full_name = 'Candy Johnson'), 93086.00, NOW())

-- Verify the update
SELECT
  sr.full_name,
  sr.role,
  TO_CHAR(srg.monthly_goal, 'FM$999,999,999') as monthly_goal,
  srg.updated_at
FROM sales_rep_goals srg
JOIN sales_reps sr ON srg.rep_id = sr.rep_id
WHERE srg.month = '2025-10-01'
ORDER BY srg.monthly_goal DESC;

-- Calculate total sales rep goals for October 2025
SELECT
  TO_CHAR(SUM(monthly_goal), 'FM$999,999,999') as total_rep_goals,
  COUNT(*) as reps_with_goals
FROM sales_rep_goals
WHERE month = '2025-10-01';

-- Show list of all sales reps to verify names match
SELECT rep_id, full_name, role, is_active
FROM sales_reps
WHERE is_active = true
ORDER BY full_name;
