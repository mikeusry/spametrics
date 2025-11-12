#!/usr/bin/env tsx

/**
 * Automated HubSpot Owner Mapping Script
 * Maps HubSpot owner IDs to sales reps in database
 */

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

const mappings = [
  // 23 exact name matches
  { rep_id: 22, hubspot_owner_id: '83248571', name: 'Ashley Norton' },
  { rep_id: 25, hubspot_owner_id: '82575692', name: 'Candy Johnson' },
  { rep_id: 13, hubspot_owner_id: '76265973', name: 'Carter Hughes' },
  { rep_id: 23, hubspot_owner_id: '30121695', name: 'Chad Shafer' },
  { rep_id: 1, hubspot_owner_id: '12290165', name: 'Cherry Durand' },
  { rep_id: 24, hubspot_owner_id: '31370334', name: 'Christina Nicholson' },
  { rep_id: 3, hubspot_owner_id: '568630932', name: 'Colleen Hall' },
  { rep_id: 20, hubspot_owner_id: '82978629', name: 'Danyel Straut' },
  { rep_id: 12, hubspot_owner_id: '1759773666', name: 'David Wheaton' },
  { rep_id: 8, hubspot_owner_id: '24751528', name: 'Donna Jensen' },
  { rep_id: 19, hubspot_owner_id: '685040154', name: 'Elliott Hood' },
  { rep_id: 21, hubspot_owner_id: '83193559', name: 'Erica McCoy' },
  { rep_id: 11, hubspot_owner_id: '206479420', name: 'Glen Sanford' },
  { rep_id: 2, hubspot_owner_id: '76335770', name: 'Jodi Martin' },
  { rep_id: 14, hubspot_owner_id: '79367870', name: 'Jody Morgan' },
  { rep_id: 18, hubspot_owner_id: '83335434', name: 'Kameron Helms' },
  { rep_id: 9, hubspot_owner_id: '81322855', name: 'Katie Cannington' },
  { rep_id: 10, hubspot_owner_id: '31507088', name: 'Larry Cheshier' },
  { rep_id: 26, hubspot_owner_id: '12290205', name: 'Mark Baker' },
  { rep_id: 15, hubspot_owner_id: '1872485792', name: 'Mike Ruffolo' },
  { rep_id: 16, hubspot_owner_id: '78662738', name: 'Nicole Orozco' },
  { rep_id: 5, hubspot_owner_id: '78299022', name: 'Ronnie Armento' },
  { rep_id: 6, hubspot_owner_id: '82637263', name: 'Tim Tillman' },

  // 2 nickname matches
  { rep_id: 7, hubspot_owner_id: '402188827', name: 'Joe Brooks → Joseph Brooks' },
  { rep_id: 17, hubspot_owner_id: '71417931', name: 'Rich Feggeler → Richard Feggeler' },
];

async function runMapping() {
  console.log('🚀 Starting HubSpot owner mapping...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const mapping of mappings) {
    const { error } = await supabase
      .from('sales_reps')
      .update({ hubspot_owner_id: mapping.hubspot_owner_id })
      .eq('rep_id', mapping.rep_id);

    if (error) {
      console.error(`❌ Error mapping ${mapping.name}:`, error.message);
      errorCount++;
    } else {
      console.log(`✅ Mapped rep_id ${mapping.rep_id} → HubSpot ID ${mapping.hubspot_owner_id} (${mapping.name})`);
      successCount++;
    }
  }

  console.log(`\n📊 Mapping Complete:`);
  console.log(`   Success: ${successCount}/${mappings.length}`);
  console.log(`   Errors: ${errorCount}`);

  // Verify mappings
  console.log('\n🔍 Verifying mappings...\n');
  const { data: reps, error: queryError } = await supabase
    .from('sales_reps')
    .select('rep_id, full_name, hubspot_owner_id, is_active')
    .not('hubspot_owner_id', 'is', null)
    .order('full_name');

  if (queryError) {
    console.error('Error verifying mappings:', queryError);
    return;
  }

  console.log('✅ Mapped Sales Reps:\n');
  reps?.forEach(rep => {
    const status = rep.is_active ? '✅' : '❌';
    console.log(`${status} ${rep.full_name.padEnd(25)} | HubSpot ID: ${rep.hubspot_owner_id}`);
  });

  console.log(`\nTotal mapped: ${reps?.length || 0} / 26 sales reps`);

  // Show unmapped
  const { data: unmapped } = await supabase
    .from('sales_reps')
    .select('rep_id, full_name, is_active')
    .is('hubspot_owner_id', null)
    .order('full_name');

  if (unmapped && unmapped.length > 0) {
    console.log('\n⚠️  Unmapped Sales Reps:\n');
    unmapped.forEach(rep => {
      console.log(`   ${rep.full_name} (rep_id: ${rep.rep_id})`);
    });
  }

  console.log('\n✅ Mapping complete! You can now run the HubSpot sync.\n');
}

runMapping().catch(console.error);
