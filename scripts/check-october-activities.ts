#!/usr/bin/env tsx

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAllHubSpotActivities, aggregateActivitiesByDateAndOwner } from '../lib/hubspot';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function main() {
  console.log('📊 Checking October 2025 activities for mapped reps...\n');

  // Get mappings
  const { data: mappings } = await supabase
    .from('hubspot_owner_mapping')
    .select('hubspot_owner_id, rep_id');

  const mappedOwnerIds = new Set(mappings?.map(m => m.hubspot_owner_id) || []);

  console.log(`Found ${mappedOwnerIds.size} mapped owner IDs\n`);

  // Fetch activities from October 2025
  const startDate = new Date('2025-10-01');
  const endDate = new Date('2025-10-30');

  console.log('Fetching activities from HubSpot...');
  const activities = await getAllHubSpotActivities(startDate, endDate);

  console.log(`Total activities fetched: ${activities.length}\n`);

  // Filter to only mapped owners
  const mappedActivities = activities.filter(a => a.ownerId && mappedOwnerIds.has(a.ownerId));

  console.log(`Activities from mapped reps: ${mappedActivities.length}`);
  console.log(`Activities from unmapped owners: ${activities.length - mappedActivities.length}\n`);

  if (mappedActivities.length > 0) {
    const summaries = aggregateActivitiesByDateAndOwner(mappedActivities);
    console.log(`Aggregated into ${summaries.length} daily summaries\n`);

    console.log('📋 Sample of activities from mapped reps:');
    summaries.slice(0, 10).forEach(s => {
      const mapping = mappings?.find(m => m.hubspot_owner_id === s.ownerId);
      console.log(`  ${s.date} | Rep ID: ${mapping?.rep_id} | Total: ${s.total} activities`);
    });
  }

  // Check date range in database
  const { data: dates } = await supabase
    .from('dates')
    .select('date_id')
    .gte('date_id', '2025-10-01')
    .lte('date_id', '2025-10-30')
    .order('date_id');

  console.log(`\n📅 Dates in database for October 2025: ${dates?.length || 0}`);
  if (dates && dates.length > 0) {
    console.log(`   First date: ${dates[0].date_id}`);
    console.log(`   Last date: ${dates[dates.length - 1].date_id}`);
  }
}

main().catch(console.error);
