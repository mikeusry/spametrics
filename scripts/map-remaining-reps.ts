#!/usr/bin/env tsx

/**
 * Map Remaining Reps
 * Creates mappings for Joe Brooks and Rich Feggeler
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function main() {
  console.log('🔄 Creating mappings for remaining reps...\n');

  const mappings = [
    { name: 'Joe Brooks → Joseph Brooks', hubspot_owner_id: '402188827', rep_id: 7 },
    { name: 'Rich Feggeler → Richard Feggeler', hubspot_owner_id: '71417931', rep_id: 17 },
  ];

  for (const mapping of mappings) {
    const { error } = await supabase
      .from('hubspot_owner_mapping')
      .upsert({
        hubspot_owner_id: mapping.hubspot_owner_id,
        rep_id: mapping.rep_id,
      }, {
        onConflict: 'hubspot_owner_id'
      });

    if (error) {
      console.log(`❌ Failed to map ${mapping.name}: ${error.message}`);
    } else {
      console.log(`✅ Mapped ${mapping.name}`);
    }
  }

  console.log('\n✨ Done! All active sales reps are now mapped (except Brian Shedd who is not in HubSpot).');
}

main().catch(console.error);
