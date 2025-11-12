#!/usr/bin/env tsx

/**
 * Sync Current Month HubSpot Activities
 * Syncs all activities from the beginning of the current month to today
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { getAllHubSpotActivities, aggregateActivitiesByDateAndOwner } from '../lib/hubspot';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function syncMonth() {
  console.log('🚀 Starting month-to-date HubSpot sync...\n');

  // Get first day of current month
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = now;

  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  console.log(`📅 Syncing: ${startStr} to ${endStr}`);
  console.log(`   (${Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} days)\n`);

  console.log('🔍 Fetching activities from HubSpot...');
  console.log('   (This may take a minute for a full month...)\n');

  try {
    // Add a small delay to avoid rate limits
    const activities = await getAllHubSpotActivities(startDate, endDate);
    console.log(`✅ Found ${activities.length} activities\n`);

    if (activities.length === 0) {
      console.log('⚠️  No activities found for this date range.');
      return;
    }

    // Aggregate by date and owner
    const summaries = aggregateActivitiesByDateAndOwner(activities);
    console.log(`📊 Aggregated into ${summaries.length} daily summaries\n`);

    // Get sales rep mappings
    console.log('🔍 Fetching sales rep mappings...');
    const { data: salesReps, error: repsError } = await supabase
      .from('sales_reps')
      .select('rep_id, full_name, hubspot_owner_id')
      .not('hubspot_owner_id', 'is', null);

    if (repsError) {
      console.error('❌ Error fetching sales reps:', repsError);
      return;
    }

    const ownerToRepMap = new Map(
      salesReps.map(rep => [rep.hubspot_owner_id, { rep_id: rep.rep_id, name: rep.full_name }])
    );

    console.log(`✅ Mapped ${ownerToRepMap.size} HubSpot owners to sales reps\n`);

    // Prepare activity records
    const activityRecords = summaries
      .filter(summary => ownerToRepMap.has(summary.ownerId))
      .map(summary => ({
        date_id: summary.date,
        rep_id: ownerToRepMap.get(summary.ownerId)!.rep_id,
        calls: summary.calls,
        emails: summary.emails,
        meetings: summary.meetings,
        notes: summary.notes,
        sms: summary.sms,
        total_activities: summary.total,
      }));

    console.log(`📝 Prepared ${activityRecords.length} activity records to upsert\n`);

    if (activityRecords.length === 0) {
      console.log('⚠️  No activities matched mapped sales reps.');
      return;
    }

    // Group by rep for display
    const repSummary = new Map<number, any>();
    activityRecords.forEach(record => {
      if (!repSummary.has(record.rep_id)) {
        const repInfo = ownerToRepMap.get(
          summaries.find(s => ownerToRepMap.get(s.ownerId)?.rep_id === record.rep_id)?.ownerId || ''
        );
        repSummary.set(record.rep_id, {
          name: repInfo?.name || 'Unknown',
          days: 0,
          total: 0,
          calls: 0,
          emails: 0,
          meetings: 0,
          notes: 0,
          sms: 0
        });
      }
      const summary = repSummary.get(record.rep_id)!;
      summary.days++;
      summary.total += record.total_activities;
      summary.calls += record.calls;
      summary.emails += record.emails;
      summary.meetings += record.meetings;
      summary.notes += record.notes;
      summary.sms += record.sms;
    });

    console.log('👥 Month-to-Date Activities by Sales Rep:\n');
    console.log('Rep Name                  | Days | Total | Calls | Emails | Meetings | Notes | SMS');
    console.log('─'.repeat(90));

    // Sort by total activities descending
    const sortedReps = Array.from(repSummary.entries())
      .sort((a, b) => b[1].total - a[1].total);

    sortedReps.forEach(([repId, summary]) => {
      console.log(
        `${summary.name.padEnd(25)} | ${String(summary.days).padStart(4)} | ` +
        `${String(summary.total).padStart(5)} | ${String(summary.calls).padStart(5)} | ` +
        `${String(summary.emails).padStart(6)} | ${String(summary.meetings).padStart(8)} | ` +
        `${String(summary.notes).padStart(5)} | ${String(summary.sms).padStart(3)}`
      );
    });

    console.log('\n💾 Upserting to database...');

    // Upsert to database
    const { data: upsertedData, error: upsertError } = await supabase
      .from('sales_rep_activities')
      .upsert(activityRecords, {
        onConflict: 'date_id,rep_id',
        ignoreDuplicates: false,
      })
      .select();

    if (upsertError) {
      console.error('❌ Error upserting activities:', upsertError);
      return;
    }

    console.log(`✅ Successfully synced ${upsertedData?.length || activityRecords.length} records!\n`);

    // Show unmapped owners if any
    const unmappedOwners = summaries
      .filter(s => !ownerToRepMap.has(s.ownerId))
      .map(s => s.ownerId);

    if (unmappedOwners.length > 0) {
      const uniqueUnmapped = [...new Set(unmappedOwners)];
      console.log(`\n⚠️  ${unmappedOwners.length} activities belong to ${uniqueUnmapped.length} unmapped owners`);
      console.log('   (These are likely non-sales personnel or terminated reps)\n');
    }

    console.log('✅ Month-to-date sync complete!\n');

  } catch (error) {
    console.error('❌ Sync failed:', error);
  }
}

syncMonth().catch(console.error);
