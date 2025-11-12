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

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const HUBSPOT_BASE_URL = 'https://api.hubapi.com';

interface HubSpotOwner {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface SalesRep {
  rep_id: number;
  full_name: string;
  role: string | null;
  is_active: boolean;
  hubspot_owner_id: string | null;
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
    .select('rep_id, full_name, role, is_active, hubspot_owner_id')
    .order('full_name');

  if (error) {
    console.error('Error fetching sales reps:', error);
    return [];
  }

  return data || [];
}

async function main() {
  console.log('🔍 Fetching HubSpot owners and sales reps...\n');

  const [owners, reps] = await Promise.all([
    getHubSpotOwners(),
    getSalesReps(),
  ]);

  console.log('═'.repeat(120));
  console.log('📊 SALES REP TO HUBSPOT OWNER MAPPING TABLE');
  console.log('═'.repeat(120));

  // Track matches
  const matchedReps: Array<{ rep: SalesRep; owner: HubSpotOwner }> = [];
  const unmatchedOwnerIds = new Set(owners.map(o => o.id));

  // Process sales reps - exact name matching
  console.log('\n✅ EXACT MATCHES (Same Name in Both Systems)');
  console.log('─'.repeat(120));

  for (const rep of reps) {
    const repNameLower = rep.full_name.toLowerCase().trim();

    // Try to find exact name match
    const matchedOwner = owners.find(owner => {
      const ownerNameLower = `${owner.firstName} ${owner.lastName}`.toLowerCase().trim();
      return ownerNameLower === repNameLower;
    });

    if (matchedOwner) {
      matchedReps.push({ rep, owner: matchedOwner });
      unmatchedOwnerIds.delete(matchedOwner.id);

      const status = rep.is_active ? '✅' : '❌';
      console.log(
        `${status} Rep ID: ${String(rep.rep_id).padStart(3)} | ` +
        `${rep.full_name.padEnd(26)} → HubSpot ID: ${matchedOwner.id.padEnd(12)} | ${matchedOwner.email}`
      );
    }
  }

  console.log(`\n📈 Found ${matchedReps.length} exact matches\n`);

  // Unmapped sales reps
  const unmappedReps = reps.filter(rep =>
    !matchedReps.some(m => m.rep.rep_id === rep.rep_id)
  );

  if (unmappedReps.length > 0) {
    console.log('\n⚠️  SALES REPS WITHOUT HUBSPOT MATCH');
    console.log('─'.repeat(120));
    for (const rep of unmappedReps) {
      const status = rep.is_active ? '✅ Active  ' : '❌ Inactive';
      console.log(`${status} | Rep ID: ${String(rep.rep_id).padStart(3)} | ${rep.full_name}`);
    }
    console.log(`\n📊 ${unmappedReps.length} sales reps have no HubSpot match\n`);
  }

  // Unmapped HubSpot owners
  const unmappedOwners = owners.filter(owner => unmatchedOwnerIds.has(owner.id));

  if (unmappedOwners.length > 0) {
    // Categorize
    const nonSalesKeywords = ['delivery', 'valet', 'coordinator', 'department', 'admin'];
    const likelyNonSales = unmappedOwners.filter(owner => {
      const email = owner.email.toLowerCase();
      const name = `${owner.firstName} ${owner.lastName}`.toLowerCase();
      return nonSalesKeywords.some(keyword => email.includes(keyword) || name.includes(keyword));
    });

    const potentialSales = unmappedOwners.filter(owner => !likelyNonSales.includes(owner));

    console.log('\n🚫 LIKELY NON-SALES PERSONNEL (Skip These)');
    console.log('─'.repeat(120));
    for (const owner of likelyNonSales) {
      console.log(
        `HubSpot ID: ${owner.id.padEnd(12)} | ` +
        `${`${owner.firstName} ${owner.lastName}`.padEnd(32)} | ${owner.email}`
      );
    }

    console.log(`\n📊 ${likelyNonSales.length} non-sales personnel identified\n`);

    if (potentialSales.length > 0) {
      console.log('\n❓ POTENTIAL SALES REPS (Manual Review Needed)');
      console.log('─'.repeat(120));
      console.log('These people have HubSpot accounts but are not in your sales_reps table.');
      console.log('They may be: terminated reps, new hires not yet added, or non-sales personnel.\n');

      for (const owner of potentialSales) {
        console.log(
          `HubSpot ID: ${owner.id.padEnd(12)} | ` +
          `${`${owner.firstName} ${owner.lastName}`.padEnd(32)} | ${owner.email}`
        );
      }
      console.log(`\n📊 ${potentialSales.length} potential sales reps need manual review\n`);
    }
  }

  // Final summary
  console.log('\n═'.repeat(120));
  console.log('📈 SUMMARY');
  console.log('═'.repeat(120));
  console.log(`Total Sales Reps in Database:     ${reps.length}`);
  console.log(`Total HubSpot Owners:              ${owners.length}`);
  console.log(`Exact Matches Found:               ${matchedReps.length}`);
  console.log(`Unmapped Sales Reps:               ${unmappedReps.length}`);
  console.log(`Unmapped HubSpot Owners:           ${unmappedOwners.length}`);

  // Generate SQL
  console.log('\n\n═'.repeat(120));
  console.log('💾 SQL TO MAP THE EXACT MATCHES');
  console.log('═'.repeat(120));
  console.log('Copy and paste this SQL into your Supabase SQL Editor:\n');

  for (const { rep, owner } of matchedReps) {
    console.log(`UPDATE sales_reps SET hubspot_owner_id = '${owner.id}' WHERE rep_id = ${rep.rep_id}; -- ${rep.full_name}`);
  }

  console.log('\n\n═'.repeat(120));
  console.log('✅ NEXT STEPS');
  console.log('═'.repeat(120));
  console.log('1. Run the SQL above in Supabase to map the exact matches');
  console.log('2. Review the "Potential Sales Reps" list above');
  console.log('3. For terminated reps - ignore them (they won\'t have recent activity anyway)');
  console.log('4. For new hires - add them to sales_reps table first, then map');
  console.log('5. Run the HubSpot sync to start pulling activity data\n');
}

main().catch(console.error);
