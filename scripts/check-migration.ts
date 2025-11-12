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

async function checkMigration() {
  console.log('🔍 Checking if sales_rep_activities table exists...\n');

  // Try to query the table
  const { data, error } = await supabase
    .from('sales_rep_activities')
    .select('*')
    .limit(1);

  if (error) {
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.log('❌ Table does NOT exist. You need to run the migration.\n');
      console.log('📝 Migration file: supabase/migrations/add-hubspot-sync.sql');
      console.log('\n✅ Steps to run migration:');
      console.log('   1. Go to Supabase Dashboard → SQL Editor');
      console.log('   2. Copy contents of supabase/migrations/add-hubspot-sync.sql');
      console.log('   3. Paste and run the SQL');
      console.log('   4. Come back and run this script again\n');
      return false;
    } else {
      console.error('⚠️  Error checking table:', error.message);
      return false;
    }
  }

  console.log('✅ Table EXISTS and is ready!');
  console.log(`   Current rows: ${data?.length || 0}`);
  console.log('\n🚀 Ready to run HubSpot sync!\n');
  return true;
}

checkMigration().catch(console.error);
