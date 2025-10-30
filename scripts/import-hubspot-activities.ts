#!/usr/bin/env tsx

/**
 * Import HubSpot Activities Script
 * Fetches activity data from HubSpot and stores it in Supabase
 *
 * Usage:
 *   npx tsx scripts/import-hubspot-activities.ts
 *   npx tsx scripts/import-hubspot-activities.ts --date 2025-10-01
 *   npx tsx scripts/import-hubspot-activities.ts --start 2025-10-01 --end 2025-10-30
 */

import { createClient } from '@supabase/supabase-js';
import {
  getAllHubSpotActivities,
  aggregateActivitiesByDateAndOwner,
  type ActivitySummary,
} from '../lib/hubspot';

// Load environment variables
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Parse command line arguments
const args = process.argv.slice(2);
let startDate: Date;
let endDate: Date;

if (args.includes('--date')) {
  const dateIndex = args.indexOf('--date');
  const date = new Date(args[dateIndex + 1]);
  startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
  endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
} else if (args.includes('--start') && args.includes('--end')) {
  const startIndex = args.indexOf('--start');
  const endIndex = args.indexOf('--end');
  startDate = new Date(args[startIndex + 1]);
  endDate = new Date(args[endIndex + 1]);
} else {
  // Default to current month
  const now = new Date();
  startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  endDate = new Date();
}

console.log(`\n📅 Fetching HubSpot activities from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}\n`);

/**
 * Get or create HubSpot owner mapping
 */
async function getOrCreateOwnerMapping(hubspotOwnerId: string): Promise<number | null> {
  // Check if mapping exists
  const { data: existingMapping } = await supabase
    .from('hubspot_owner_mapping')
    .select('rep_id')
    .eq('hubspot_owner_id', hubspotOwnerId)
    .single();

  if (existingMapping) {
    return existingMapping.rep_id;
  }

  console.log(`⚠️  No mapping found for HubSpot owner ID: ${hubspotOwnerId}`);
  console.log(`   Please add mapping manually or this activity will be skipped.`);
  return null;
}

/**
 * Import activities to database
 */
async function importActivities(summaries: ActivitySummary[]) {
  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const summary of summaries) {
    // Get internal rep_id from HubSpot owner ID
    const repId = await getOrCreateOwnerMapping(summary.ownerId);

    if (!repId) {
      skipped++;
      continue;
    }

    // Upsert activity record
    const { error } = await supabase
      .from('daily_rep_activities')
      .upsert({
        date_id: summary.date,
        rep_id: repId,
        hubspot_owner_id: summary.ownerId,
        calls: summary.calls,
        emails: summary.emails,
        meetings: summary.meetings,
        notes: summary.notes,
        tasks: summary.tasks,
        sms: summary.sms,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'date_id,rep_id'
      });

    if (error) {
      console.error(`❌ Error importing activities for ${summary.date} - ${summary.ownerId}:`, error.message);
      errors++;
    } else {
      imported++;
      console.log(`✅ ${summary.date} - Rep ${repId}: ${summary.total} activities (${summary.calls}c ${summary.emails}e ${summary.meetings}m ${summary.notes}n ${summary.tasks}t ${summary.sms}s)`);
    }
  }

  return { imported, skipped, errors };
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🔄 Fetching activities from HubSpot...\n');

    const activities = await getAllHubSpotActivities(startDate, endDate);

    console.log(`\n📊 Fetched ${activities.length} total activities`);

    if (activities.length === 0) {
      console.log('No activities found for the specified date range.');
      return;
    }

    // Aggregate by date and owner
    const summaries = aggregateActivitiesByDateAndOwner(activities);

    console.log(`📋 Aggregated into ${summaries.length} daily summaries\n`);
    console.log('💾 Importing to database...\n');

    const { imported, skipped, errors } = await importActivities(summaries);

    console.log('\n' + '='.repeat(60));
    console.log('✨ Import Complete!');
    console.log('='.repeat(60));
    console.log(`✅ Imported: ${imported}`);
    console.log(`⚠️  Skipped:  ${skipped} (no owner mapping)`);
    console.log(`❌ Errors:   ${errors}`);
    console.log('='.repeat(60) + '\n');

    if (skipped > 0) {
      console.log('💡 Tip: Add HubSpot owner mappings to hubspot_owner_mapping table');
      console.log('   to import activities for all sales reps.\n');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
