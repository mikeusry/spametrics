#!/usr/bin/env tsx

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function verifySyncData() {
  console.log('🔍 Verifying synced HubSpot activity data...\n');

  // Get total record count
  const { count, error: countError } = await supabase
    .from('sales_rep_activities')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Error counting records:', countError);
    return;
  }

  console.log(`📊 Total activity records: ${count}\n`);

  // Get activity summary by rep
  const { data: repSummary, error: summaryError } = await supabase
    .from('sales_rep_activities')
    .select('rep_id, calls, emails, meetings, notes, sms, total_activities')
    .order('rep_id');

  if (summaryError) {
    console.error('Error fetching summary:', summaryError);
    return;
  }

  // Aggregate by rep
  const repTotals = new Map<number, any>();
  repSummary?.forEach(record => {
    if (!repTotals.has(record.rep_id)) {
      repTotals.set(record.rep_id, {
        calls: 0,
        emails: 0,
        meetings: 0,
        notes: 0,
        sms: 0,
        total: 0,
        days: 0
      });
    }
    const totals = repTotals.get(record.rep_id)!;
    totals.calls += record.calls;
    totals.emails += record.emails;
    totals.meetings += record.meetings;
    totals.notes += record.notes;
    totals.sms += record.sms;
    totals.total += record.total_activities;
    totals.days++;
  });

  // Get rep names
  const { data: reps } = await supabase
    .from('sales_reps')
    .select('rep_id, full_name')
    .order('full_name');

  console.log('👥 Activity Summary by Sales Rep:\n');
  console.log('Rep Name                  | Days | Total | Calls | Emails | Meetings | Notes | SMS');
  console.log('─'.repeat(95));

  reps?.forEach(rep => {
    const totals = repTotals.get(rep.rep_id);
    if (totals) {
      console.log(
        `${rep.full_name.padEnd(25)} | ${String(totals.days).padStart(4)} | ` +
        `${String(totals.total).padStart(5)} | ${String(totals.calls).padStart(5)} | ` +
        `${String(totals.emails).padStart(6)} | ${String(totals.meetings).padStart(8)} | ` +
        `${String(totals.notes).padStart(5)} | ${String(totals.sms).padStart(3)}`
      );
    }
  });

  // Get date range
  const { data: dateRange } = await supabase
    .from('sales_rep_activities')
    .select('date_id')
    .order('date_id', { ascending: true })
    .limit(1);

  const { data: dateRange2 } = await supabase
    .from('sales_rep_activities')
    .select('date_id')
    .order('date_id', { ascending: false })
    .limit(1);

  if (dateRange && dateRange2 && dateRange.length > 0 && dateRange2.length > 0) {
    console.log(`\n📅 Date range: ${dateRange[0].date_id} to ${dateRange2[0].date_id}`);
  }

  // Get most recent sync
  const { data: recent } = await supabase
    .from('sales_rep_activities')
    .select('synced_at')
    .order('synced_at', { ascending: false })
    .limit(1);

  if (recent && recent.length > 0) {
    console.log(`🕐 Most recent sync: ${new Date(recent[0].synced_at).toLocaleString()}`);
  }

  console.log('\n✅ Data verification complete!\n');
}

verifySyncData().catch(console.error);
