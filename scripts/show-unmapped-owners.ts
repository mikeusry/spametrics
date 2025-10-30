#!/usr/bin/env tsx

/**
 * Show Unmapped Owners Script
 * Shows which HubSpot owners are unmapped and which sales reps they might match
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

interface HubSpotOwner {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface SalesRep {
  rep_id: number;
  full_name: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
}

async function getHubSpotOwners(): Promise<HubSpotOwner[]> {
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

async function getSalesReps(): Promise<SalesRep[]> {
  const { data, error } = await supabase
    .from('sales_reps')
    .select('*')
    .order('full_name');

  if (error) {
    throw error;
  }

  return data || [];
}

async function getExistingMappings(): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('hubspot_owner_mapping')
    .select('*');

  if (error) {
    console.error('Error fetching mappings:', error);
    return new Map();
  }

  return new Map((data || []).map(m => [m.hubspot_owner_id, m.rep_id]));
}

async function main() {
  console.log('🔍 Analyzing unmapped HubSpot owners...\n');

  const [owners, reps, mappings] = await Promise.all([
    getHubSpotOwners(),
    getSalesReps(),
    getExistingMappings(),
  ]);

  const unmappedOwners = owners.filter(o => !mappings.has(o.id));

  console.log(`Found ${unmappedOwners.length} unmapped HubSpot owners\n`);
  console.log('═'.repeat(100));

  // Group reps by active status
  const activeReps = reps.filter(r => r.is_active);
  const inactiveReps = reps.filter(r => !r.is_active);

  console.log('\n📋 UNMAPPED HUBSPOT OWNERS:\n');

  for (const owner of unmappedOwners) {
    const ownerName = `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || 'Unknown';

    console.log(`🔸 ${ownerName}`);
    console.log(`   HubSpot ID: ${owner.id}`);
    console.log(`   Email: ${owner.email}`);

    // Try to find potential matches in sales_reps
    const firstNameMatch = owner.firstName?.toLowerCase();
    const lastNameMatch = owner.lastName?.toLowerCase();

    const potentialMatches = reps.filter(rep => {
      const repName = rep.full_name.toLowerCase();
      const repParts = repName.split(' ');

      if (firstNameMatch && lastNameMatch) {
        return repName.includes(firstNameMatch) && repName.includes(lastNameMatch);
      } else if (firstNameMatch) {
        return repName.includes(firstNameMatch);
      } else if (lastNameMatch) {
        return repName.includes(lastNameMatch);
      }

      return false;
    });

    if (potentialMatches.length > 0) {
      console.log(`   ⚠️  Possible matches in database:`);
      for (const match of potentialMatches) {
        const status = match.is_active ? '✅ ACTIVE' : '❌ INACTIVE';
        console.log(`      - ${match.full_name} (rep_id: ${match.rep_id}) ${status}`);
      }
    } else {
      console.log(`   ❌ No matching rep found in database`);
    }

    console.log('─'.repeat(100));
  }

  console.log('\n📊 SUMMARY:\n');
  console.log(`Total HubSpot owners: ${owners.length}`);
  console.log(`Mapped: ${owners.length - unmappedOwners.length}`);
  console.log(`Unmapped: ${unmappedOwners.length}`);
  console.log(`\nSales reps in database:`);
  console.log(`  Active: ${activeReps.length}`);
  console.log(`  Inactive: ${inactiveReps.length}`);
  console.log(`  Total: ${reps.length}`);

  console.log('\n📝 ALL SALES REPS IN DATABASE:\n');
  console.log('Active Reps:');
  activeReps.forEach(rep => {
    const mapped = Array.from(mappings.entries()).find(([_, repId]) => repId === rep.rep_id);
    const status = mapped ? `✅ Mapped to HubSpot ID ${mapped[0]}` : '⚠️  Not mapped';
    console.log(`  ${rep.rep_id.toString().padStart(3)} | ${rep.full_name.padEnd(25)} | ${status}`);
  });

  if (inactiveReps.length > 0) {
    console.log('\nInactive Reps:');
    inactiveReps.forEach(rep => {
      const mapped = Array.from(mappings.entries()).find(([_, repId]) => repId === rep.rep_id);
      const status = mapped ? `✅ Mapped to HubSpot ID ${mapped[0]}` : '⚠️  Not mapped';
      console.log(`  ${rep.rep_id.toString().padStart(3)} | ${rep.full_name.padEnd(25)} | ${status}`);
    });
  }

  console.log('\n💡 To manually map an owner, run:');
  console.log('   INSERT INTO hubspot_owner_mapping (hubspot_owner_id, rep_id)');
  console.log('   VALUES (\'HUBSPOT_OWNER_ID\', REP_ID);');
}

main().catch(console.error);
