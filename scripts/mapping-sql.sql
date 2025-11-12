-- HubSpot Owner to Sales Rep Mapping
-- Generated: 2025-11-12
-- Run this in Supabase SQL Editor

-- 23 exact name matches
UPDATE sales_reps SET hubspot_owner_id = '83248571' WHERE rep_id = 22; -- Ashley Norton
UPDATE sales_reps SET hubspot_owner_id = '82575692' WHERE rep_id = 25; -- Candy Johnson
UPDATE sales_reps SET hubspot_owner_id = '76265973' WHERE rep_id = 13; -- Carter Hughes
UPDATE sales_reps SET hubspot_owner_id = '30121695' WHERE rep_id = 23; -- Chad Shafer
UPDATE sales_reps SET hubspot_owner_id = '12290165' WHERE rep_id = 1; -- Cherry Durand
UPDATE sales_reps SET hubspot_owner_id = '31370334' WHERE rep_id = 24; -- Christina Nicholson
UPDATE sales_reps SET hubspot_owner_id = '568630932' WHERE rep_id = 3; -- Colleen Hall
UPDATE sales_reps SET hubspot_owner_id = '82978629' WHERE rep_id = 20; -- Danyel Straut
UPDATE sales_reps SET hubspot_owner_id = '1759773666' WHERE rep_id = 12; -- David Wheaton
UPDATE sales_reps SET hubspot_owner_id = '24751528' WHERE rep_id = 8; -- Donna Jensen
UPDATE sales_reps SET hubspot_owner_id = '685040154' WHERE rep_id = 19; -- Elliott Hood
UPDATE sales_reps SET hubspot_owner_id = '83193559' WHERE rep_id = 21; -- Erica McCoy
UPDATE sales_reps SET hubspot_owner_id = '206479420' WHERE rep_id = 11; -- Glen Sanford
UPDATE sales_reps SET hubspot_owner_id = '76335770' WHERE rep_id = 2; -- Jodi Martin
UPDATE sales_reps SET hubspot_owner_id = '79367870' WHERE rep_id = 14; -- Jody Morgan
UPDATE sales_reps SET hubspot_owner_id = '83335434' WHERE rep_id = 18; -- Kameron Helms
UPDATE sales_reps SET hubspot_owner_id = '81322855' WHERE rep_id = 9; -- Katie Cannington
UPDATE sales_reps SET hubspot_owner_id = '31507088' WHERE rep_id = 10; -- Larry Cheshier
UPDATE sales_reps SET hubspot_owner_id = '12290205' WHERE rep_id = 26; -- Mark Baker
UPDATE sales_reps SET hubspot_owner_id = '1872485792' WHERE rep_id = 15; -- Mike Ruffolo
UPDATE sales_reps SET hubspot_owner_id = '78662738' WHERE rep_id = 16; -- Nicole Orozco
UPDATE sales_reps SET hubspot_owner_id = '78299022' WHERE rep_id = 5; -- Ronnie Armento
UPDATE sales_reps SET hubspot_owner_id = '82637263' WHERE rep_id = 6; -- Tim Tillman

-- 3 nickname/informal name matches (Joe=Joseph, Rich=Richard)
UPDATE sales_reps SET hubspot_owner_id = '402188827' WHERE rep_id = 7; -- Joe Brooks → Joseph Brooks
UPDATE sales_reps SET hubspot_owner_id = '71417931' WHERE rep_id = 17; -- Rich Feggeler → Richard Feggeler

-- Total: 25 mappings (out of 26 sales reps)
-- Unmapped: Brian Shedd (rep_id 4) - not found in HubSpot

-- Verify mappings
SELECT
    rep_id,
    full_name,
    hubspot_owner_id,
    is_active
FROM sales_reps
ORDER BY full_name;
