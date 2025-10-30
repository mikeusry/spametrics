#!/usr/bin/env tsx

/**
 * List HubSpot Owners Script
 * Fetches all owners from HubSpot and shows which ones need mapping
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

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const HUBSPOT_BASE_URL = 'https://api.hubapi.com';

async function getHubSpotOwners() {
  const response = await fetch(`${HUBSPOT_BASE_URL}/crm/v3/owners?limit=100`, {
    headers: {
      'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch owners: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.results;
}

async function getExistingMappings() {
  const { data, error } = await supabase
    .from('hubspot_owner_mapping')
    .select('*');

  if (error) {
    console.error('Error fetching mappings:', error);
    return [];
  }

  return data || [];
}

async function getSalesReps() {
  const { data, error } = await supabase
    .from('sales_reps')
    .select('*')
    .order('rep_name');

  if (error) {
    console.error('Error fetching sales reps:', error);
    return [];
  }

  return data || [];
}

async function main() {
  console.log('📋 Fetching HubSpot owners and checking mappings...\n');

  const [owners, mappings, reps] = await Promise.all([
    getHubSpotOwners(),
    getExistingMappings(),
    getSalesReps(),
  ]);

  const mappingMap = new Map(mappings.map(m => [m.hubspot_owner_id, m.rep_id]));

  console.log('👥 HubSpot Owners:\n');
  console.log('═'.repeat(80));

  for (const owner of owners) {
    const isMapped = mappingMap.has(owner.id);
    const status = isMapped ? '✅ MAPPED' : '⚠️  NOT MAPPED';
    const repId = mappingMap.get(owner.id);

    console.log(`${status} | ID: ${owner.id.padEnd(10)} | ${owner.firstName} ${owner.lastName}`);
    console.log(`           Email: ${owner.email}`);
    if (isMapped) {
      const rep = reps.find(r => r.rep_id === repId);
      console.log(`           Mapped to: ${rep?.rep_name || 'Unknown'} (rep_id: ${repId})`);
    }
    console.log('─'.repeat(80));
  }

  const unmappedCount = owners.filter(o => !mappingMap.has(o.id)).length;

  console.log('\n📊 Summary:');
  console.log(`   Total HubSpot owners: ${owners.length}`);
  console.log(`   Mapped: ${owners.length - unmappedCount}`);
  console.log(`   Unmapped: ${unmappedCount}`);

  if (unmappedCount > 0) {
    console.log('\n💡 To map owners, run SQL like:');
    console.log('   INSERT INTO hubspot_owner_mapping (hubspot_owner_id, rep_id)');
    console.log('   VALUES (\'HUBSPOT_OWNER_ID\', YOUR_REP_ID);');
    console.log('\n📝 Available sales reps in your database:');
    for (const rep of reps) {
      console.log(`   - ${rep.rep_name} (rep_id: ${rep.rep_id})`);
    }
  }
}

main().catch(console.error);
