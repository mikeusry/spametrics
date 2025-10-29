/**
 * SIMPLE DATA IMPORT - Common Sense Date Parsing
 * All dates are 2024!
 */

import * as xlsx from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function parseDate(sheetName: string): string | null {
  sheetName = sheetName.trim();

  // Format: 10282025 = 10/28/2025
  if (/^\d{8}$/.test(sheetName)) {
    const month = sheetName.substring(0, 2);
    const day = sheetName.substring(2, 4);
    return `2025-${month}-${day}`;
  }

  // Format: 82125 = 8/21/2025
  if (/^\d{5}$/.test(sheetName)) {
    const month = sheetName.substring(0, 1);
    const day = sheetName.substring(1, 3);
    return `2025-${month.padStart(2, '0')}-${day}`;
  }

  // Format: 8.19.25 = 8/19/2025
  if (/^\d{1,2}\.\d{1,2}\.\d{2}$/.test(sheetName)) {
    const [month, day] = sheetName.split('.');
    return `2025-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Format: 92984 = 9/29/2025
  if (/^9\d{4}$/.test(sheetName)) {
    const month = '09';
    const day = sheetName.substring(1, 3);
    return `2025-${month}-${day}`;
  }

  return null;
}

function getCellValue(sheet: xlsx.WorkSheet, cell: string): any {
  const val = sheet[cell]?.v;
  if (!val || typeof val === 'string' && (val.includes('DIV') || val.includes('Actual'))) {
    return null;
  }
  return val;
}

async function main() {
  console.log('🚀 SIMPLE Import - All dates are 2024!\n');

  // Clear existing data
  console.log('🗑️  Clearing old data...');
  await supabase.from('daily_summary_metrics').delete().neq('summary_id', 0);
  await supabase.from('daily_store_revenue').delete().neq('revenue_id', 0);
  await supabase.from('daily_sales_rep_revenue').delete().neq('rep_revenue_id', 0);
  console.log('✅ Cleared\n');

  const workbook = xlsx.readFile('Daily Sales Report.xlsx');
  const dailyData: any[] = [];

  // Skip first sheet, process rest
  for (let i = 1; i < workbook.SheetNames.length; i++) {
    const sheetName = workbook.SheetNames[i];
    const date = parseDate(sheetName);

    if (!date) {
      console.log(`⚠️  Skipping ${sheetName}`);
      continue;
    }

    const sheet = workbook.Sheets[sheetName];

    // Get summary metrics from Column B
    const monthGoal = getCellValue(sheet, 'B4');
    const lyRevenue = getCellValue(sheet, 'B5');
    const mtdRevenue = getCellValue(sheet, 'B6');

    // Get store data from columns C-F, rows 4-11
    const stores = [];
    const storeMap = {
      4: 'Buford', 5: 'Athens', 6: 'Kennesaw', 7: 'Alpharetta',
      8: 'Augusta', 9: 'Newnan', 10: 'Oconee', 11: 'Costco'
    };

    for (const [row, name] of Object.entries(storeMap)) {
      const actual = getCellValue(sheet, `F${row}`);
      if (actual && typeof actual === 'number') {
        stores.push({
          name,
          ly: getCellValue(sheet, `D${row}`),
          goal: getCellValue(sheet, `E${row}`),
          actual
        });
      }
    }

    dailyData.push({
      date,
      sheetName,
      monthGoal,
      lyRevenue,
      mtdRevenue,
      stores
    });

    console.log(`✅ ${date} (${sheetName}): ${stores.length} stores`);
  }

  console.log(`\n📊 Parsed ${dailyData.length} sheets\n`);

  // Sort by date
  dailyData.sort((a, b) => a.date.localeCompare(b.date));

  // Track previous MTD for daily calculations
  const prevStoreMTD: any = {};
  let prevCompanyMTD = null;

  console.log('📤 Importing...\n');

  for (const day of dailyData) {
    // Import summary
    const dailyRev = prevCompanyMTD ? day.mtdRevenue - prevCompanyMTD : day.mtdRevenue;
    await supabase.from('daily_summary_metrics').insert({
      date_id: day.date,
      month_goal: day.monthGoal,
      mtd_revenue: day.mtdRevenue,
      daily_revenue: dailyRev,
      ly_mtd_revenue: day.lyRevenue,
      percent_to_goal: day.monthGoal ? (day.mtdRevenue / day.monthGoal * 100) : null
    });

    prevCompanyMTD = day.mtdRevenue;

    // Import stores
    for (const store of day.stores) {
      const { data: storeData } = await supabase
        .from('stores')
        .select('store_id')
        .eq('store_name', store.name)
        .single();

      if (!storeData) continue;

      const prevMTD = prevStoreMTD[store.name];
      const dailyRev = prevMTD ? store.actual - prevMTD : store.actual;

      await supabase.from('daily_store_revenue').insert({
        date_id: day.date,
        store_id: storeData.store_id,
        daily_revenue: dailyRev,
        mtd_revenue: store.actual,
        ly_revenue: store.ly,
        goal_revenue: store.goal,
        percent_to_ly: store.ly ? (store.actual / store.ly * 100) : null,
        percent_to_goal: store.goal ? (store.actual / store.goal * 100) : null
      });

      prevStoreMTD[store.name] = store.actual;
    }

    console.log(`   ✅ ${day.date}`);
  }

  console.log('\n✅ Done!\n');
}

main();
