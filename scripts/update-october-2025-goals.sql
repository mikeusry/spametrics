-- Update October 2025 Store Goals
-- Run this in Supabase SQL Editor

-- Insert or update October 2025 goals for all stores
INSERT INTO monthly_goals (month, store_id, store_goal, updated_at)
VALUES
  -- Buford: $316,209
  ('2025-10-01', (SELECT store_id FROM stores WHERE store_name = 'Buford'), 316209.00, NOW()),

  -- Athens: $261,601
  ('2025-10-01', (SELECT store_id FROM stores WHERE store_name = 'Athens'), 261601.00, NOW()),

  -- Warehouse: $501,170
  ('2025-10-01', (SELECT store_id FROM stores WHERE store_name = 'Warehouse'), 501170.00, NOW()),

  -- Kennesaw: $316,209
  ('2025-10-01', (SELECT store_id FROM stores WHERE store_name = 'Kennesaw'), 316209.00, NOW()),

  -- Alpharetta: $302,557
  ('2025-10-01', (SELECT store_id FROM stores WHERE store_name = 'Alpharetta'), 302557.00, NOW()),

  -- Augusta: $261,601
  ('2025-10-01', (SELECT store_id FROM stores WHERE store_name = 'Augusta'), 261601.00, NOW()),

  -- Newnan: $261,601
  ('2025-10-01', (SELECT store_id FROM stores WHERE store_name = 'Newnan'), 261601.00, NOW()),

  -- Lake Oconee: $192,680
  ('2025-10-01', (SELECT store_id FROM stores WHERE store_name = 'Lake Oconee'), 192680.00, NOW()),

  -- Blue Ridge: $49,250
  ('2025-10-01', (SELECT store_id FROM stores WHERE store_name = 'Blue Ridge'), 49250.00, NOW()),

  -- Blairsville: $49,520
  ('2025-10-01', (SELECT store_id FROM stores WHERE store_name = 'Blairsville'), 49520.00, NOW()),

  -- Costco: $51,000
  ('2025-10-01', (SELECT store_id FROM stores WHERE store_name = 'Costco'), 51000.00, NOW())

ON CONFLICT (month, store_id)
DO UPDATE SET
  store_goal = EXCLUDED.store_goal,
  updated_at = NOW();

-- Verify the update
SELECT
  s.store_name,
  TO_CHAR(mg.store_goal, 'FM$999,999,999') as store_goal,
  mg.updated_at
FROM monthly_goals mg
JOIN stores s ON mg.store_id = s.store_id
WHERE mg.month = '2025-10-01'
ORDER BY mg.store_goal DESC;

-- Calculate total company goal for October 2025
SELECT
  TO_CHAR(SUM(store_goal), 'FM$999,999,999') as total_october_goal,
  COUNT(*) as stores_with_goals
FROM monthly_goals
WHERE month = '2025-10-01';
