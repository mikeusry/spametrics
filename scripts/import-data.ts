/**
 * Georgia Spa Company - Data Import Script
 *
 * This script parses the "Daily Sales Report.xlsx" file and imports historical data
 * from 8/19/24 onwards into Supabase.
 *
 * Run with: npx tsx scripts/import-data.ts
 */

import * as xlsx from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import { parseISO, format, parse, isValid } from 'date-fns';
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

// File path to the Excel file
const EXCEL_FILE_PATH = path.join(process.cwd(), 'Daily Sales Report.xlsx');

interface StoreRevenue {
  storeName: string;
  lyRevenue: number | null;
  goalRevenue: number | null;
  actualRevenue: number | null;
  percentToLY: number | null;
  percentToGoal: number | null;
}

interface SalesRepRevenue {
  repName: string;
  goalRevenue: number | null;
  actualRevenue: number | null;
  mtdVariance: number | null;
}

interface DailyData {
  date: string; // ISO date string
  sheetName: string;
  monthGoal: number | null;
  mtdRevenue: number | null;
  lyRevenue: number | null;
  oconeeRevenue: number | null;
  storeRevenues: StoreRevenue[];
  repRevenues: SalesRepRevenue[];
  workDays: number | null;
}

/**
 * Parse sheet name to extract date
 * Handles formats: "10282025", "8.19.25", "92984"
 */
function parseSheetNameToDate(sheetName: string): string | null {
  try {
    // Remove any leading/trailing whitespace
    sheetName = sheetName.trim();

    // Format 1: MMDDYYYY (e.g., "10282025")
    if (/^\d{8}$/.test(sheetName)) {
      const month = sheetName.substring(0, 2);
      const day = sheetName.substring(2, 4);
      const year = sheetName.substring(4, 8);
      const dateStr = `${year}-${month}-${day}`;
      const parsed = parse(dateStr, 'yyyy-MM-dd', new Date());
      if (isValid(parsed)) {
        return format(parsed, 'yyyy-MM-dd');
      }
    }

    // Format 2: M.D.YY (e.g., "8.19.25")
    if (/^\d{1,2}\.\d{1,2}\.\d{2}$/.test(sheetName)) {
      const [month, day, year] = sheetName.split('.');
      // Assume 2024 for year "24" and 2025 for year "25"
      const fullYear = parseInt(year) === 25 ? '2024' : parseInt(year) === 24 ? '2024' : `20${year}`;
      const dateStr = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const parsed = parse(dateStr, 'yyyy-MM-dd', new Date());
      if (isValid(parsed)) {
        return format(parsed, 'yyyy-MM-dd');
      }
    }

    // Format 3: MDDYY (e.g., "92984" for 9/29/84 but should be 2024)
    if (/^\d{5}$/.test(sheetName)) {
      const month = sheetName.substring(0, 1);
      const day = sheetName.substring(1, 3);
      const year = `20${sheetName.substring(3, 5)}`;
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

/**
 * Safe cell value extraction
 */
function getCellValue(sheet: xlsx.WorkSheet, cell: string): any {
  const cellObj = sheet[cell];
  if (!cellObj) return null;
  return cellObj.v; // Get the value
}

/**
 * Parse a single sheet to extract daily data
 */
function parseSheet(sheet: xlsx.WorkSheet, sheetName: string): DailyData | null {
  try {
    const date = parseSheetNameToDate(sheetName);
    if (!date) {
      console.warn(`⚠️  Skipping sheet ${sheetName} - could not parse date`);
      return null;
    }

    // Extract summary metrics
    const monthGoal = getCellValue(sheet, 'B4');
    const lyRevenue = getCellValue(sheet, 'B5');
    const mtdRevenue = getCellValue(sheet, 'B6');
    const oconeeRevenue = getCellValue(sheet, 'B7');
    const workDays = getCellValue(sheet, 'B16');

    // Extract store revenues (rows 4-13, columns D-H)
    const storeNames = [
      'Buford',
      'Athens',
      'Warehouse',
      'Kennesaw',
      'Alpharetta',
      'Augusta',
      'Newnan',
      'Oconee',
      'Blue Ridge', // May not exist in older sheets
      'Blairsville', // May not exist in older sheets
      'Costco'
    ];

    const storeRevenues: StoreRevenue[] = [];
    for (let i = 0; i < storeNames.length; i++) {
      const row = 4 + i; // Starting at row 4
      const storeName = storeNames[i];
      const lyRev = getCellValue(sheet, `D${row}`);
      const goalRev = getCellValue(sheet, `E${row}`);
      const actualRev = getCellValue(sheet, `F${row}`);
      const pctToLY = getCellValue(sheet, `G${row}`);
      const pctToGoal = getCellValue(sheet, `H${row}`);

      // Only add if there's actual revenue data
      if (actualRev !== null && actualRev !== undefined) {
        storeRevenues.push({
          storeName,
          lyRevenue: lyRev,
          goalRevenue: goalRev,
          actualRevenue: actualRev,
          percentToLY: pctToLY,
          percentToGoal: pctToGoal
        });
      }
    }

    // Extract sales rep revenues (rows 14-37, columns D-F)
    const repRevenues: SalesRepRevenue[] = [];
    // We'll scan rows 14-40 to catch all reps
    for (let row = 14; row <= 40; row++) {
      const repName = getCellValue(sheet, `A${row}`);
      if (!repName || typeof repName !== 'string') continue;

      // Skip header rows and totals
      if (repName.includes('MGMT') || repName.includes('Total') || repName.includes('Check')) {
        continue;
      }

      const goalRev = getCellValue(sheet, `D${row}`);
      const actualRev = getCellValue(sheet, `E${row}`);
      const variance = getCellValue(sheet, `F${row}`);

      repRevenues.push({
        repName: repName.trim(),
        goalRevenue: goalRev,
        actualRevenue: actualRev,
        mtdVariance: variance
      });
    }

    return {
      date,
      sheetName,
      monthGoal,
      mtdRevenue,
      lyRevenue,
      oconeeRevenue,
      storeRevenues,
      repRevenues,
      workDays
    };
  } catch (error) {
    console.error(`❌ Error parsing sheet ${sheetName}:`, error);
    return null;
  }
}

/**
 * Calculate daily revenue from consecutive MTD values
 */
function calculateDailyRevenue(
  currentMTD: number | null,
  previousMTD: number | null
): number | null {
  if (currentMTD === null) return null;
  if (previousMTD === null) return currentMTD; // First day of month
  return currentMTD - previousMTD;
}

/**
 * Import data into Supabase
 */
async function importToSupabase(dailyDataArray: DailyData[]) {
  console.log('\n📤 Starting import to Supabase...\n');

  // Sort by date to ensure chronological order
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
          nga_revenue: null, // Will be calculated via view
          per_day_to_beat_ly: null,
          goal_per_day: dailyData.workDays ? dailyData.monthGoal! / dailyData.workDays : null,
          days_passed: null,
          days_remaining: null,
          percent_to_goal: dailyData.monthGoal ? (dailyData.mtdRevenue! / dailyData.monthGoal * 100) : null,
          standing_to_goal: null
        });

      if (summaryError) {
        console.error(`   ❌ Error importing summary for ${dailyData.date}:`, summaryError);
        errors++;
      }

      // Update previous company MTD
      previousStoreMTD['_company_total'] = dailyData.mtdRevenue;

      // Import store revenues
      for (const storeRev of dailyData.storeRevenues) {
        // Get store_id from database
        const { data: storeData, error: storeError } = await supabase
          .from('stores')
          .select('store_id')
          .eq('store_name', storeRev.storeName)
          .single();

        if (storeError || !storeData) {
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
            percent_to_ly: storeRev.percentToLY,
            percent_to_goal: storeRev.percentToGoal
          });

        if (revenueError) {
          console.error(`   ❌ Error importing store revenue for ${storeRev.storeName}:`, revenueError);
          errors++;
        }

        // Update previous MTD for this store
        previousStoreMTD[storeRev.storeName] = storeRev.actualRevenue;
      }

      // Import sales rep revenues
      for (const repRev of dailyData.repRevenues) {
        // Get rep_id from database
        const { data: repData, error: repError } = await supabase
          .from('sales_reps')
          .select('rep_id')
          .eq('full_name', repRev.repName)
          .single();

        if (repError || !repData) {
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
            mtd_variance: repRev.mtdVariance
          });

        if (repRevenueError) {
          console.error(`   ❌ Error importing rep revenue for ${repRev.repName}:`, repRevenueError);
          errors++;
        }

        // Update previous MTD for this rep
        previousRepMTD[repRev.repName] = repRev.actualRevenue;
      }

      // Log to audit table
      await supabase.from('audit_log').insert({
        date_imported: dailyData.date,
        sheet_name: dailyData.sheetName,
        rows_imported: dailyData.storeRevenues.length + dailyData.repRevenues.length,
        import_status: 'success',
        error_message: null
      });

      importedDays++;
      console.log(`   ✅ Successfully imported ${dailyData.date}`);
    } catch (error) {
      console.error(`❌ Error importing ${dailyData.date}:`, error);
      errors++;

      await supabase.from('audit_log').insert({
        date_imported: dailyData.date,
        sheet_name: dailyData.sheetName,
        rows_imported: 0,
        import_status: 'failed',
        error_message: String(error)
      });
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Import complete!`);
  console.log(`   Days imported: ${importedDays}`);
  console.log(`   Errors: ${errors}`);
  console.log('='.repeat(50) + '\n');
}

/**
 * Main import function
 */
async function main() {
  console.log('🚀 Georgia Spa Company - Data Import Script\n');
  console.log('='.repeat(50));
  console.log(`📁 Reading file: ${EXCEL_FILE_PATH}\n`);

  // Read the Excel file
  const workbook = xlsx.readFile(EXCEL_FILE_PATH);
  console.log(`✅ Loaded workbook with ${workbook.SheetNames.length} sheets\n`);

  // Parse all sheets (skip the first one which is the summary)
  const dailyDataArray: DailyData[] = [];

  for (let i = 1; i < workbook.SheetNames.length; i++) {
    const sheetName = workbook.SheetNames[i];
    const sheet = workbook.Sheets[sheetName];

    console.log(`📄 Parsing sheet ${i}/${workbook.SheetNames.length - 1}: ${sheetName}...`);

    const dailyData = parseSheet(sheet, sheetName);
    if (dailyData) {
      dailyDataArray.push(dailyData);
      console.log(`   ✅ Parsed ${dailyData.storeRevenues.length} stores, ${dailyData.repRevenues.length} reps`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Parsed ${dailyDataArray.length} daily sheets\n`);

  // Import to Supabase
  await importToSupabase(dailyDataArray);

  console.log('✅ All done!\n');
}

// Run the script
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
