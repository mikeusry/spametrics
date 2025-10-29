/**
 * FULL IMPORT - Stores AND Sales Reps
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface StoreData {
  [storeName: string]: {
    mtd: number;
    goal: number;
  };
}

interface RepData {
  [repName: string]: {
    mtd: number;
    goal: number;
  };
}

function parseDate(filename: string): string | null {
  const name = filename.replace('.csv', '');

  // 10012025 = 10/01/2025
  if (/^\d{8}$/.test(name)) {
    return `2025-${name.substring(0, 2)}-${name.substring(2, 4)}`;
  }

  // 1012025 = 10/1/2025 (7 digits: 2-digit month, 1-digit day, 4-digit year)
  if (/^\d{7}$/.test(name)) {
    return `2025-${name.substring(0, 2)}-${name.substring(2, 3).padStart(2, '0')}`;
  }

  // 82125 = 8/21/2025
  if (/^\d{5}$/.test(name)) {
    return `2025-${name[0].padStart(2, '0')}-${name.substring(1, 3)}`;
  }

  // 8.19.25 = 8/19/2025
  if (/^\d{1,2}\.\d{1,2}\.\d{2}$/.test(name)) {
    const [m, d] = name.split('.');
    return `2025-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return null;
}

function readCSV(filepath: string) {
  const content = fs.readFileSync(filepath, 'utf-8');
  const rows = parse(content);

  // Find summary data rows
  let monthGoalRow = -1;
  let lyRevenueRow = -1;
  let totalRow = -1;

  for (let i = 0; i < Math.min(20, rows.length); i++) {
    if (rows[i][0] === 'Month Goal') monthGoalRow = i;
    if (rows[i][0] === 'LY Revenue') lyRevenueRow = i;
    // Find the "Total" row which has the actual sum
    if (rows[i][2] === 'Total') totalRow = i;
  }

  // Read MTD Revenue from the Total row, column F (index 5)
  const mtdRevenue = totalRow >= 0 ? (parseFloat(rows[totalRow][5]) || 0) : 0;
  const monthGoal = monthGoalRow >= 0 ? (parseFloat(rows[monthGoalRow][1]) || 0) : 0;
  const lyRevenue = lyRevenueRow >= 0 ? (parseFloat(rows[lyRevenueRow][1]) || 0) : 0;

  // Store names in the CSV
  const storeNames = ['Buford', 'Athens', 'Warehouse', 'Kennesaw', 'Alpharetta',
                      'Augusta', 'Newnan', 'Oconee', 'Blue Ridge', 'Blairsville', 'Costco'];

  // Find store data - stores are in rows 3-13 based on the CSV structure
  const stores: StoreData = {};
  for (let i = 0; i < rows.length; i++) {
    const storeName = rows[i][2]; // Column C
    if (storeNames.includes(storeName)) {
      const goal = parseFloat(rows[i][4]) || 0; // Column E (Goal)
      const actual = parseFloat(rows[i][5]) || 0; // Column F (Actual MTD)
      stores[storeName] = { mtd: actual, goal };
    }
  }

  // Find Sales Team Revenue section - starts around row 16-18
  const reps: RepData = {};
  let salesTeamStartRow = -1;

  // Find "Sales Team Revenue" row - check column 2
  for (let i = 0; i < rows.length; i++) {
    const cellValue = rows[i][2]; // Column C
    if (cellValue && (cellValue === 'Sales Team Revenue ' || cellValue === 'Sales Team Revenue' || String(cellValue).includes('Sales Team Revenue'))) {
      salesTeamStartRow = i + 2; // Skip the header row
      break;
    }
  }

  if (salesTeamStartRow > 0) {
    // Read sales rep data - they continue until we hit a blank or different section
    for (let i = salesTeamStartRow; i < rows.length; i++) {
      const repName = rows[i][2]; // Column C (rep name)

      // Stop if we hit empty row or "MGMT Goal" or other sections
      if (!repName || repName === 'MGMT Goal' || repName === '' || String(repName).includes('Daily Activities')) {
        break;
      }

      const goalRevenue = parseFloat(rows[i][3]) || 0; // Column D (Goal Revenue)
      const actualRevenue = parseFloat(rows[i][4]) || 0; // Column E (Actual Revenue)

      reps[repName] = { mtd: actualRevenue, goal: goalRevenue };
    }
  }

  return { mtdRevenue, monthGoal, lyRevenue, stores, reps };
}

async function main() {
  console.log('🚀 FULL Import - Stores & Sales Reps\n');

  // Clear database
  console.log('🗑️  Clearing existing data...');
  await supabase.from('daily_sales_rep_revenue').delete().neq('revenue_id', 0);
  await supabase.from('daily_store_revenue').delete().neq('revenue_id', 0);
  await supabase.from('daily_summary_metrics').delete().neq('summary_id', 0);
  console.log('✅ Cleared\n');

  // Get all CSV files
  const csvDir = path.join(process.cwd(), 'csv-exports');
  const files = fs.readdirSync(csvDir).filter(f => f.endsWith('.csv'));

  // Parse dates and sort
  const datedFiles = files
    .map(f => ({ file: f, date: parseDate(f) }))
    .filter(d => d.date !== null)
    .sort((a, b) => a.date!.localeCompare(b.date!));

  console.log(`📊 Processing ${datedFiles.length} days...\n`);

  // Track previous MTD and month
  let prevCompanyMTD = 0;
  const prevStoreMTD: { [key: string]: number } = {};
  const prevRepMTD: { [key: string]: number } = {};
  let prevMonth = '';

  for (const { file, date } of datedFiles) {
    const filepath = path.join(csvDir, file);
    const data = readCSV(filepath);

    // Check if month changed - reset MTD to 0 for new month
    const currentMonth = date!.substring(0, 7); // "2025-10"
    if (currentMonth !== prevMonth && prevMonth !== '') {
      console.log(`\n🔄 New month detected: ${currentMonth} (resetting MTD)\n`);
      prevCompanyMTD = 0;
      for (const key in prevStoreMTD) {
        prevStoreMTD[key] = 0;
      }
      for (const key in prevRepMTD) {
        prevRepMTD[key] = 0;
      }
    }
    prevMonth = currentMonth;

    // Calculate daily revenue
    const dailyRevenue = data.mtdRevenue - prevCompanyMTD;

    // Calculate percentages
    const percentToGoal = data.monthGoal > 0 ? (data.mtdRevenue / data.monthGoal * 100) : 0;
    const standingToGoal = data.mtdRevenue - data.monthGoal;

    // Insert summary
    const { error: summaryError } = await supabase.from('daily_summary_metrics').insert({
      date_id: date,
      month_goal: data.monthGoal,
      mtd_revenue: data.mtdRevenue,
      daily_revenue: dailyRevenue,
      ly_mtd_revenue: data.lyRevenue,
      percent_to_goal: percentToGoal,
      standing_to_goal: standingToGoal
    });

    if (summaryError) {
      console.error(`❌ Error inserting summary for ${date}:`, summaryError);
    }

    // Insert stores
    let storeCount = 0;
    for (const [storeName, storeData] of Object.entries(data.stores)) {
      const { data: storeInfo } = await supabase
        .from('stores')
        .select('store_id')
        .eq('store_name', storeName)
        .single();

      if (!storeInfo) {
        console.log(`⚠️  Store not found: ${storeName}`);
        continue;
      }

      const prevMTD = prevStoreMTD[storeName] || 0;
      const daily = storeData.mtd - prevMTD;

      await supabase.from('daily_store_revenue').insert({
        date_id: date,
        store_id: storeInfo.store_id,
        daily_revenue: daily,
        mtd_revenue: storeData.mtd,
        goal_revenue: storeData.goal,
        percent_to_goal: storeData.goal > 0 ? (storeData.mtd / storeData.goal * 100) : 0
      });

      prevStoreMTD[storeName] = storeData.mtd;
      storeCount++;
    }

    // Insert sales reps
    let repCount = 0;
    for (const [repName, repData] of Object.entries(data.reps)) {
      const { data: repInfo } = await supabase
        .from('sales_reps')
        .select('rep_id')
        .eq('full_name', repName)
        .single();

      if (!repInfo) {
        console.log(`⚠️  Sales rep not found in DB: ${repName}`);
        continue;
      }

      const prevMTD = prevRepMTD[repName] || 0;
      const daily = repData.mtd - prevMTD;

      const { error: repError } = await supabase.from('daily_sales_rep_revenue').insert({
        date_id: date,
        rep_id: repInfo.rep_id,
        daily_revenue: daily,
        mtd_revenue: repData.mtd,
        goal_revenue: repData.goal,
        mtd_variance: repData.mtd - repData.goal
      });

      if (repError) {
        console.error(`❌ Error inserting rep ${repName} for ${date}:`, repError);
      } else {
        prevRepMTD[repName] = repData.mtd;
        repCount++;
      }
    }

    prevCompanyMTD = data.mtdRevenue;

    console.log(`✅ ${date}: Daily=$${dailyRevenue.toLocaleString()}, MTD=$${data.mtdRevenue.toLocaleString()} (${storeCount} stores, ${repCount} reps)`);
  }

  console.log('\n✅ Import complete!\n');

  // Summary stats
  const { count: storeRecords } = await supabase.from('daily_store_revenue').select('*', { count: 'exact', head: true });
  const { count: repRecords } = await supabase.from('daily_sales_rep_revenue').select('*', { count: 'exact', head: true });
  const { count: summaryRecords } = await supabase.from('daily_summary_metrics').select('*', { count: 'exact', head: true });

  console.log(`📊 Summary:`);
  console.log(`   Days: ${summaryRecords}`);
  console.log(`   Store Records: ${storeRecords}`);
  console.log(`   Sales Rep Records: ${repRecords}`);
}

main();
