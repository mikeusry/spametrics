/**
 * CORRECT IMPORT - Calculate daily from MTD using CSV files
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

function parseDate(filename: string): string | null {
  const name = filename.replace('.csv', '');

  // 10012025 = 10/01/2025
  if (/^\d{8}$/.test(name)) {
    return `2025-${name.substring(0, 2)}-${name.substring(2, 4)}`;
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

  // Find MTD Revenue row (varies by sheet)
  let mtdRow = -1;
  let monthGoalRow = -1;
  for (let i = 0; i < Math.min(15, rows.length); i++) {
    if (rows[i][0] === 'MTD Revenue') mtdRow = i;
    if (rows[i][0] === 'Month Goal') monthGoalRow = i;
  }

  const mtdRevenue = mtdRow >= 0 ? (parseFloat(rows[mtdRow][1]) || 0) : 0;
  const monthGoal = monthGoalRow >= 0 ? (parseFloat(rows[monthGoalRow][1]) || 0) : 0;

  // Find store data rows - look for store names in column C (index 2)
  const stores: { [key: string]: number } = {};
  const storeNames = ['Buford', 'Athens', 'Warehouse', 'Kennesaw', 'Alpharetta',
                      'Augusta', 'Newnan', 'Oconee', 'Blue Ridge', 'Blairsville', 'Costco'];

  for (let i = 0; i < rows.length; i++) {
    const storeName = rows[i][2]; // Column C
    if (storeNames.includes(storeName)) {
      stores[storeName] = parseFloat(rows[i][5]) || 0; // Column F (Actual)
    }
  }

  return { mtdRevenue, monthGoal, stores };
}

async function main() {
  console.log('🚀 CORRECT Import - Calculating Daily from MTD\n');

  // Clear database
  console.log('🗑️  Clearing...');
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
    }
    prevMonth = currentMonth;

    // Calculate daily revenue
    const dailyRevenue = data.mtdRevenue - prevCompanyMTD;

    // Insert summary
    await supabase.from('daily_summary_metrics').insert({
      date_id: date,
      month_goal: data.monthGoal,
      mtd_revenue: data.mtdRevenue,
      daily_revenue: dailyRevenue,
      percent_to_goal: data.monthGoal > 0 ? (data.mtdRevenue / data.monthGoal * 100) : 0
    });

    // Insert stores
    for (const [storeName, mtd] of Object.entries(data.stores)) {
      const { data: storeData } = await supabase
        .from('stores')
        .select('store_id')
        .eq('store_name', storeName)
        .single();

      if (!storeData) continue;

      const prevMTD = prevStoreMTD[storeName] || 0;
      const daily = mtd - prevMTD;

      await supabase.from('daily_store_revenue').insert({
        date_id: date,
        store_id: storeData.store_id,
        daily_revenue: daily,
        mtd_revenue: mtd
      });

      prevStoreMTD[storeName] = mtd;
    }

    prevCompanyMTD = data.mtdRevenue;

    console.log(`✅ ${date}: Daily=$${dailyRevenue.toLocaleString()}, MTD=$${data.mtdRevenue.toLocaleString()}`);
  }

  console.log('\n✅ Import complete!\n');
}

main();
