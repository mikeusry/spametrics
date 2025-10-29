/**
 * Update store regions in the database
 * East: Athens, Augusta, Lake Oconee, Buford
 * West: Alpharetta, Kennesaw, Newnan
 * North: Blairsville, Blue Ridge
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const REGION_MAPPING: { [key: string]: string } = {
  'Athens': 'East',
  'Augusta': 'East',
  'Oconee': 'East',
  'Buford': 'East',
  'Alpharetta': 'West',
  'Kennesaw': 'West',
  'Newnan': 'West',
  'Blairsville': 'North',
  'Blue Ridge': 'North',
  'Warehouse': 'Central',
  'Costco': 'Partner',
};

async function main() {
  console.log('🗺️  Updating Store Regions\n');

  for (const [storeName, region] of Object.entries(REGION_MAPPING)) {
    const { error } = await supabase
      .from('stores')
      .update({ region })
      .eq('store_name', storeName);

    if (error) {
      console.error(`❌ Error updating ${storeName}:`, error);
    } else {
      console.log(`✅ ${storeName} → ${region}`);
    }
  }

  console.log('\n✅ Regions updated!');
}

main();
