-- Update Chad Shafer and Candy Johnson to Sales Manager role
UPDATE sales_reps
SET role = 'Sales Manager', updated_at = NOW()
WHERE full_name IN ('Chad Shafer', 'Candy Johnson');

-- Verify the update
SELECT rep_id, full_name, role, is_active
FROM sales_reps
WHERE full_name IN ('Chad Shafer', 'Candy Johnson');
