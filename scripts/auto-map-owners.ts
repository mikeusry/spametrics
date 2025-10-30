#!/usr/bin/env tsx

/**
 * Auto-Map HubSpot Owners Script
 * Automatically maps HubSpot owners to sales reps by matching names
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
    .eq('is_active', true);

  if (error) {
    throw error;
  }

  return data || [];
}

function normalizeFullName(firstName?: string, lastName?: string): string {
  return `${firstName || ''} ${lastName || ''}`.trim().toLowerCase();
}

function matchOwnerToRep(owner: HubSpotOwner, reps: SalesRep[]): SalesRep | null {
  const ownerFullName = normalizeFullName(owner.firstName, owner.lastName);

  for (const rep of reps) {
    const repFullName = rep.full_name.toLowerCase();

    // Exact match
    if (ownerFullName === repFullName) {
      return rep;
    }

    // Check if names match when split differently
    const [repFirst, ...repLastParts] = rep.full_name.split(' ');
    const repLast = repLastParts.join(' ').toLowerCase();
    const repFirstNorm = repFirst.toLowerCase();

    if (owner.firstName?.toLowerCase() === repFirstNorm &&
        owner.lastName?.toLowerCase() === repLast) {
      return rep;
    }
  }

  return null;
}

async function createMapping(hubspotOwnerId: string, repId: number) {
  const { error } = await supabase
    .from('hubspot_owner_mapping')
    .upsert({
      hubspot_owner_id: hubspotOwnerId,
      rep_id: repId,
    }, {
      onConflict: 'hubspot_owner_id'
    });

  return !error;
}

async function main() {
  console.log('🔄 Auto-mapping HubSpot owners to sales reps...\n');

  const [owners, reps] = await Promise.all([
    getHubSpotOwners(),
    getSalesReps(),
  ]);

  console.log(`Found ${owners.length} HubSpot owners and ${reps.length} active sales reps\n`);

  let matched = 0;
  let unmatched = 0;
  const unmatchedOwners: HubSpotOwner[] = [];

  for (const owner of owners) {
    const ownerName = `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || owner.email;
    const rep = matchOwnerToRep(owner, reps);

    if (rep) {
      const success = await createMapping(owner.id, rep.rep_id);
      if (success) {
        console.log(`✅ Mapped: ${ownerName.padEnd(30)} → ${rep.full_name} (rep_id: ${rep.rep_id})`);
        matched++;
      } else {
        console.log(`❌ Failed to map: ${ownerName}`);
      }
    } else {
      console.log(`⚠️  No match: ${ownerName.padEnd(30)} (${owner.email})`);
      unmatched++;
      unmatchedOwners.push(owner);
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log('📊 Summary:');
  console.log(`   Matched and mapped: ${matched}`);
  console.log(`   Unmatched: ${unmatched}`);
  console.log('═'.repeat(80));

  if (unmatchedOwners.length > 0) {
    console.log('\n⚠️  Unmatched HubSpot owners:');
    for (const owner of unmatchedOwners) {
      const ownerName = `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || owner.email;
      console.log(`   - ${ownerName} (ID: ${owner.id}, Email: ${owner.email})`);
    }
    console.log('\n💡 To manually map these, run:');
    console.log('   INSERT INTO hubspot_owner_mapping (hubspot_owner_id, rep_id)');
    console.log('   VALUES (\'HUBSPOT_OWNER_ID\', YOUR_REP_ID);');
  }

  console.log('\n✨ Done! You can now run the import script again.');
}

main().catch(console.error);
