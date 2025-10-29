/**
 * Manual correction for October 8, 9, 10 MTD Revenue
 * Human error in source data - applying manual corrections
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CORRECTIONS = [
  { date: '2025-10-08', mtd: 531955 },
  { date: '2025-10-09', mtd: 538592 },
  { date: '2025-10-10', mtd: 613420 },
];

async function main() {
  console.log('📝 Applying Manual Corrections for October 8-10\n');

  // Get October 7 MTD to calculate Oct 8 daily
  const { data: oct7 } = await supabase
    .from('daily_summary_metrics')
    .select('mtd_revenue')
    .eq('date_id', '2025-10-07')
    .single();

  let prevMTD = oct7?.mtd_revenue || 0;
  console.log(`Previous MTD (Oct 7): $${prevMTD.toLocaleString()}\n`);

  for (const correction of CORRECTIONS) {
    const daily = correction.mtd - prevMTD;

    // Get current values first
    const { data: current } = await supabase
      .from('daily_summary_metrics')
      .select('mtd_revenue, daily_revenue, month_goal')
      .eq('date_id', correction.date)
      .single();

    const percentToGoal = current?.month_goal ? (correction.mtd / current.month_goal * 100) : 0;
    const standingToGoal = correction.mtd - (current?.month_goal || 0);

    // Update the record
    const { error } = await supabase
      .from('daily_summary_metrics')
      .update({
        mtd_revenue: correction.mtd,
        daily_revenue: daily,
        percent_to_goal: percentToGoal,
        standing_to_goal: standingToGoal,
      })
      .eq('date_id', correction.date);

    if (error) {
      console.error(`❌ Error updating ${correction.date}:`, error);
    } else {
      console.log(`✅ ${correction.date}:`);
      console.log(`   MTD: $${current?.mtd_revenue?.toLocaleString()} → $${correction.mtd.toLocaleString()}`);
      console.log(`   Daily: $${current?.daily_revenue?.toLocaleString()} → $${daily.toLocaleString()}`);
    }

    prevMTD = correction.mtd;
  }

  console.log('\n✅ Manual corrections applied!');
  console.log('\n⚠️  Note: You should now re-run the import script to recalculate Oct 11-28');
}

main();
