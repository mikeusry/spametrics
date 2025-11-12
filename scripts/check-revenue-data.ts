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

async function checkRevenueData() {
  console.log('🔍 Checking sales revenue data in database...\n');

  // Check daily_sales_rep_revenue table
  const { count: repRevenueCount, error: repError } = await supabase
    .from('daily_sales_rep_revenue')
    .select('*', { count: 'exact', head: true });

  console.log('📊 daily_sales_rep_revenue table:');
  if (repError) {
    console.log(`   ❌ Error: ${repError.message}`);
  } else {
    console.log(`   Total records: ${repRevenueCount || 0}`);
  }

  // Check for current month data
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const firstDayStr = firstDay.toISOString().split('T')[0];

  const { data: mtdData, error: mtdError } = await supabase
    .from('daily_sales_rep_revenue')
    .select('*')
    .gte('date_id', firstDayStr)
    .order('date_id', { ascending: false })
    .limit(10);

  console.log(`\n📅 Current month (since ${firstDayStr}):`);
  if (mtdError) {
    console.log(`   ❌ Error: ${mtdError.message}`);
  } else if (!mtdData || mtdData.length === 0) {
    console.log('   ❌ No revenue data found for current month');
    console.log('   This explains why the sales reps page shows no MTD revenue!');
  } else {
    console.log(`   ✅ Found ${mtdData.length} records`);
    console.log('\n   Recent records:');
    mtdData.slice(0, 5).forEach(record => {
      console.log(`   - Date: ${record.date_id}, Rep ID: ${record.rep_id}, MTD Revenue: $${record.mtd_revenue?.toLocaleString()}`);
    });
  }

  // Check what dates we have
  const { data: dates, error: datesError } = await supabase
    .from('daily_sales_rep_revenue')
    .select('date_id')
    .order('date_id', { ascending: false })
    .limit(10);

  if (!datesError && dates && dates.length > 0) {
    console.log(`\n📆 Latest dates in database:`);
    const uniqueDates = [...new Set(dates.map(d => d.date_id))];
    uniqueDates.slice(0, 10).forEach(date => {
      console.log(`   - ${date}`);
    });
  }

  console.log('\n💡 Summary:');
  if (repRevenueCount === 0 || !mtdData || mtdData.length === 0) {
    console.log('   ⚠️  No MTD sales revenue data available');
    console.log('   The sales reps leaderboard will only show HubSpot activities');
    console.log('   You need to import November revenue data from CSV files');
  } else {
    console.log('   ✅ Revenue data exists and should display');
  }
}

checkRevenueData().catch(console.error);
