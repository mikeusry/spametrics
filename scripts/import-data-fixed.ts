/**
 * Georgia Spa Company - FIXED Data Import Script
 *
 * This script correctly parses the "Daily Sales Report.xlsx" file
 *
 * CORRECT STRUCTURE:
 * - Column B: Summary metrics (B4=Month Goal, B5=LY Revenue, B6=MTD Revenue, B18=Date)
 * - Column C rows 4-11: Store names
 * - Column D rows 4-11: Store LY Revenue
 * - Column E rows 4-11: Store Goal
 * - Column F rows 4-11: Store Actual Revenue
 *
 * Run with: npx tsx scripts/import-data-fixed.ts
 */

import * as xlsx from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import { format, parse, isValid, add } from 'date-fns';
import * as path from 'path';

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const EXCEL_FILE_PATH = path.join(process.cwd(), 'Daily Sales Report.xlsx');

// Excel date epoch starts on 1/1/1900
function excelDateToJSDate(excelDate: number): Date {
  // Excel incorrectly treats 1900 as a leap year, so we need to account for that
  const epoch = new Date(1899, 11, 30); // December 30, 1899
  return add(epoch, { days: excelDate });
}

/**
 * Parse sheet name to extract date - FIXED VERSION
 */
function parseSheetNameToDate(sheetName: string, excelDateFromB18?: number): string | null {
  try {
    sheetName = sheetName.trim();

    // If we have Excel date from B18, use that as the source of truth
    if (excelDateFromB18 && excelDateFromB18 > 40000) {
      const jsDate = excelDateToJSDate(excelDateFromB18);
      return format(jsDate, 'yyyy-MM-dd');
    }

    // Format 1: MMDDYYYY (e.g., "10282025") - Change year to 2024
    if (/^\d{8}$/.test(sheetName)) {
      const month = sheetName.substring(0, 2);
      const day = sheetName.substring(2, 4);
      let year = sheetName.substring(4, 8);
      // Fix: All "2025" should be "2024"
      if (year === '2025') year = '2024';
      const dateStr = `${year}-${month}-${day}`;
      const parsed = parse(dateStr, 'yyyy-MM-dd', new Date());
      if (isValid(parsed)) {
        return format(parsed, 'yyyy-MM-dd');
      }
    }

    // Format 2: M.D.YY (e.g., "8.19.25") - Force to 2024
    if (/^\d{1,2}\.\d{1,2}\.\d{2}$/.test(sheetName)) {
      const [month, day, year] = sheetName.split('.');
      const fullYear = '2024'; // All dates are 2024
      const dateStr = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const parsed = parse(dateStr, 'yyyy-MM-dd', new Date());
      if (isValid(parsed)) {
        return format(parsed, 'yyyy-MM-dd');
      }
    }

    // Format 3: MDDYY or MMDDYY - Force to 2024
    if (/^\d{5,6}$/.test(sheetName)) {
      let month, day;
      if (sheetName.length === 5) {
        // MDDYY
        month = sheetName.substring(0, 1);
        day = sheetName.substring(1, 3);
      } else {
        // MMDDYY
        month = sheetName.substring(0, 2);
        day = sheetName.substring(2, 4);
      }
      const year = '2024';
      const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const parsed = parse(dateStr, 'yyyy-MM-dd', new Date());
      if (isValid(parsed)) {
        return format(parsed, 'yyyy-MM-dd');
      }
    }

    console.warn(`⚠️  Could not parse sheet name: ${sheetName}`);
    return null;
  } catch (error) {
    console.error(`❌ Error parsing sheet name ${sheetName}:`, error);
    return null;
  }
}

function getCellValue(sheet: xlsx.WorkSheet, cell: string): any {
  const cellObj = sheet[cell];
  if (!cellObj) return null;

  // Handle Excel errors
  if (cellObj.v === '#DIV/0!' || cellObj.v === '#N/A' || cellObj.v === '#VALUE!') {
    return null;
  }

  // Handle "Actual Revenue" header text
  if (typeof cellObj.v === 'string' && cellObj.v.includes('Actual')) {
    return null;
  }

  return cellObj.v;
}

/**
 * Parse a single sheet - FIXED VERSION
 */
function parseSheet(sheet: xlsx.WorkSheet, sheetName: string): any | null {
  try {
    // Get date from B18 (Excel date number)
    const excelDate = getCellValue(sheet, 'B18');
    const date = parseSheetNameToDate(sheetName, excelDate);

    if (!date) {
      console.warn(`⚠️  Skipping sheet ${sheetName} - could not parse date`);
      return null;
    }

    // Extract summary metrics from Column B
    const monthGoal = getCellValue(sheet, 'B4');
    const lyRevenue = getCellValue(sheet, 'B5');
    const mtdRevenue = getCellValue(sheet, 'B6');
    const oconeeRevenue = getCellValue(sheet, 'B7');
    const workDays = getCellValue(sheet, 'B16');

    // Extract store revenues from Columns C-F, rows 4-11
    const storeRevenues = [];
    const storeRows = [
      { row: 4, name: 'Buford' },
      { row: 5, name: 'Athens' },
      { row: 6, name: 'Kennesaw' },
      { row: 7, name: 'Alpharetta' },
      { row: 8, name: 'Augusta' },
      { row: 9, name: 'Newnan' },
      { row: 10, name: 'Oconee' },
      { row: 11, name: 'Costco' },
    ];

    for (const store of storeRows) {
      const storeName = getCellValue(sheet, `C${store.row}`) || store.name;
      const lyRev = getCellValue(sheet, `D${store.row}`);
      const goalRev = getCellValue(sheet, `E${store.row}`);
      const actualRev = getCellValue(sheet, `F${store.row}`);

      // Only add if we have actual revenue data
      if (actualRev !== null && actualRev !== undefined && typeof actualRev === 'number') {
        storeRevenues.push({
          storeName: store.name, // Use standardized name
          lyRevenue: typeof lyRev === 'number' ? lyRev : null,
          goalRevenue: typeof goalRev === 'number' ? goalRev : null,
          actualRevenue: actualRev,
        });
      }
    }

    // Extract sales rep revenues
    // Sales reps start around row 40 in column C, with data in columns D-E
    const repRevenues = [];
    for (let row = 40; row <= 70; row++) {
      const repName = getCellValue(sheet, `C${row}`);
      if (!repName || typeof repName !== 'string') continue;

      // Skip non-rep rows
      if (repName.includes('Goal') || repName.includes('Total') || repName.includes('Check') ||
          repName.includes('MGMT') || repName.includes('hubspot') || repName.includes('Activities') ||
          repName.includes('Internet') || repName.includes('Store') || repName.includes('Standing') ||
          repName.includes('Days') || repName.includes('Percentage') || repName.includes('Work')) {
        continue;
      }

      const goalRev = getCellValue(sheet, `D${row}`);
      const actualRev = getCellValue(sheet, `E${row}`);

      if (typeof actualRev === 'number') {
        repRevenues.push({
          repName: repName.trim(),
          goalRevenue: typeof goalRev === 'number' ? goalRev : null,
          actualRevenue: actualRev,
        });
      }
    }

    return {
      date,
      sheetName,
      monthGoal: typeof monthGoal === 'number' ? monthGoal : null,
      mtdRevenue: typeof mtdRevenue === 'number' ? mtdRevenue : null,
      lyRevenue: typeof lyRevenue === 'number' ? lyRevenue : null,
      oconeeRevenue: typeof oconeeRevenue === 'number' ? oconeeRevenue : null,
      storeRevenues,
      repRevenues,
      workDays: typeof workDays === 'number' ? workDays : null,
    };
  } catch (error) {
    console.error(`❌ Error parsing sheet ${sheetName}:`, error);
    return null;
  }
}

/**
 * Calculate daily revenue from consecutive MTD values
 */
function calculateDailyRevenue(currentMTD: number | null, previousMTD: number | null): number | null {
  if (currentMTD === null) return null;
  if (previousMTD === null) return currentMTD; // First day of month
  return currentMTD - previousMTD;
}

/**
 * Import data into Supabase
 */
async function importToSupabase(dailyDataArray: any[]) {
  console.log('\n📤 Starting import to Supabase...\n');

  // Sort by date
  dailyDataArray.sort((a, b) => a.date.localeCompare(b.date));

  // Track previous MTD values for daily calculation
  const previousStoreMTD: { [storeName: string]: number | null } = {};
  const previousRepMTD: { [repName: string]: number | null } = {};

  let importedDays = 0;
  let errors = 0;

  for (const dailyData of dailyDataArray) {
    try {
      console.log(`📅 Importing ${dailyData.date} (${dailyData.sheetName})...`);

      // Import daily summary metrics
      const { error: summaryError } = await supabase
        .from('daily_summary_metrics')
        .upsert({
          date_id: dailyData.date,
          month_goal: dailyData.monthGoal,
          mtd_revenue: dailyData.mtdRevenue,
          daily_revenue: calculateDailyRevenue(dailyData.mtdRevenue, previousStoreMTD['_company_total']),
          ly_mtd_revenue: dailyData.lyRevenue,
          oconee_mtd_rev: dailyData.oconeeRevenue,
          percent_to_goal: dailyData.monthGoal ? (dailyData.mtdRevenue! / dailyData.monthGoal * 100) : null,
          goal_per_day: dailyData.workDays ? dailyData.monthGoal! / dailyData.workDays : null,
        });

      if (summaryError) {
        console.error(`   ❌ Error importing summary:`, summaryError.message);
        errors++;
      }

      previousStoreMTD['_company_total'] = dailyData.mtdRevenue;

      // Import store revenues
      for (const storeRev of dailyData.storeRevenues) {
        const { data: storeData } = await supabase
          .from('stores')
          .select('store_id')
          .eq('store_name', storeRev.storeName)
          .single();

        if (!storeData) {
          console.warn(`   ⚠️  Store not found: ${storeRev.storeName}`);
          continue;
        }

        const dailyRevenue = calculateDailyRevenue(
          storeRev.actualRevenue,
          previousStoreMTD[storeRev.storeName]
        );

        const { error: revenueError } = await supabase
          .from('daily_store_revenue')
          .upsert({
            date_id: dailyData.date,
            store_id: storeData.store_id,
            daily_revenue: dailyRevenue,
            mtd_revenue: storeRev.actualRevenue,
            ly_revenue: storeRev.lyRevenue,
            goal_revenue: storeRev.goalRevenue,
            percent_to_ly: storeRev.lyRevenue ? (storeRev.actualRevenue / storeRev.lyRevenue * 100) : null,
            percent_to_goal: storeRev.goalRevenue ? (storeRev.actualRevenue / storeRev.goalRevenue * 100) : null,
          });

        if (revenueError) {
          console.error(`   ❌ Error importing store ${storeRev.storeName}:`, revenueError.message);
          errors++;
        }

        previousStoreMTD[storeRev.storeName] = storeRev.actualRevenue;
      }

      // Import sales rep revenues
      for (const repRev of dailyData.repRevenues) {
        const { data: repData } = await supabase
          .from('sales_reps')
          .select('rep_id')
          .eq('full_name', repRev.repName)
          .single();

        if (!repData) {
          console.warn(`   ⚠️  Sales rep not found: ${repRev.repName}`);
          continue;
        }

        const dailyRevenue = calculateDailyRevenue(
          repRev.actualRevenue,
          previousRepMTD[repRev.repName]
        );

        const { error: repRevenueError } = await supabase
          .from('daily_sales_rep_revenue')
          .upsert({
            date_id: dailyData.date,
            rep_id: repData.rep_id,
            daily_revenue: dailyRevenue,
            mtd_revenue: repRev.actualRevenue,
            goal_revenue: repRev.goalRevenue,
            mtd_variance: repRev.goalRevenue ? (repRev.actualRevenue - repRev.goalRevenue) : null,
          });

        if (repRevenueError) {
          console.error(`   ❌ Error importing rep ${repRev.repName}:`, repRevenueError.message);
          errors++;
        }

        previousRepMTD[repRev.repName] = repRev.actualRevenue;
      }

      await supabase.from('audit_log').insert({
        date_imported: dailyData.date,
        sheet_name: dailyData.sheetName,
        rows_imported: dailyData.storeRevenues.length + dailyData.repRevenues.length,
        import_status: 'success',
        error_message: null,
      });

      importedDays++;
      console.log(`   ✅ ${dailyData.storeRevenues.length} stores, ${dailyData.repRevenues.length} reps`);
    } catch (error) {
      console.error(`❌ Error importing ${dailyData.date}:`, error);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Import complete!`);
  console.log(`   Days imported: ${importedDays}`);
  console.log(`   Errors: ${errors}`);
  console.log('='.repeat(50) + '\n');
}

async function main() {
  console.log('🚀 Georgia Spa Company - FIXED Data Import Script\n');
  console.log('='.repeat(50));
  console.log(`📁 Reading file: ${EXCEL_FILE_PATH}\n`);

  const workbook = xlsx.readFile(EXCEL_FILE_PATH);
  console.log(`✅ Loaded workbook with ${workbook.SheetNames.length} sheets\n`);

  const dailyDataArray = [];

  // Skip first sheet (summary), process the rest
  for (let i = 1; i < workbook.SheetNames.length; i++) {
    const sheetName = workbook.SheetNames[i];
    const sheet = workbook.Sheets[sheetName];

    console.log(`📄 Parsing sheet ${i}/${workbook.SheetNames.length - 1}: ${sheetName}...`);

    const dailyData = parseSheet(sheet, sheetName);
    if (dailyData) {
      dailyDataArray.push(dailyData);
      console.log(`   ✅ Parsed`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Parsed ${dailyDataArray.length} daily sheets\n`);

  await importToSupabase(dailyDataArray);

  console.log('✅ All done!\n');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
