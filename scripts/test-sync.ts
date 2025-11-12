#!/usr/bin/env tsx

/**
 * Test HubSpot Sync Script
 * Syncs last 7 days of activity data from HubSpot
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function testSync() {
  console.log('🚀 Testing HubSpot sync (last 7 days)...\n');

  // Calculate date range (last 7 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];

  console.log(`📅 Date range: ${startStr} to ${endStr}\n`);

  // Call the sync API endpoint
  const url = `http://localhost:3000/api/sync/hubspot?startDate=${startStr}&endDate=${endStr}`;

  console.log('📡 Calling sync API...');
  console.log(`   URL: ${url}\n`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET || 'test'}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Sync completed successfully!\n');
      console.log('📊 Results:');
      console.log(`   Activities processed: ${data.activitiesProcessed}`);
      console.log(`   Summaries created: ${data.summariesCreated}`);
      console.log(`   Records upserted: ${data.recordsUpserted}`);

      if (data.unmappedOwners && data.unmappedOwners.length > 0) {
        console.log(`\n⚠️  Unmapped owners: ${data.unmappedOwners.length}`);
        console.log('   These HubSpot owners have activities but are not mapped to sales reps:');
        data.unmappedOwners.slice(0, 10).forEach((id: string) => {
          console.log(`   - ${id}`);
        });
      }
    } else {
      console.error('❌ Sync failed:\n');
      console.error(data);
    }
  } catch (error) {
    console.error('❌ Error calling sync API:', error);
    console.log('\n💡 Make sure your dev server is running:');
    console.log('   npm run dev');
  }
}

testSync().catch(console.error);
