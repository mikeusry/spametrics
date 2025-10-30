import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const HUBSPOT_BASE_URL = 'https://api.hubapi.com';

async function testAPI() {
  console.log('🔍 Testing HubSpot API with current token...\n');
  console.log('Token loaded:', HUBSPOT_API_KEY ? `${HUBSPOT_API_KEY.substring(0, 15)}...` : 'NOT FOUND');
  console.log();

  // Test 1: Get owners
  console.log('1️⃣ Testing /crm/v3/owners endpoint...');
  try {
    const ownersResponse = await fetch(`${HUBSPOT_BASE_URL}/crm/v3/owners?limit=10`, {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (ownersResponse.ok) {
      const ownersData = await ownersResponse.json();
      console.log('✅ Owners API works!');
      console.log('   Found', ownersData.results?.length || 0, 'owners');
      if (ownersData.results?.length > 0) {
        console.log('   Sample owner:', {
          id: ownersData.results[0].id,
          email: ownersData.results[0].email,
          firstName: ownersData.results[0].firstName,
          lastName: ownersData.results[0].lastName,
        });
      }
    } else {
      const errorText = await ownersResponse.text();
      console.log('❌ Owners API failed:', ownersResponse.status, errorText);
    }
  } catch (error) {
    console.log('❌ Error:', error);
  }

  console.log('\n2️⃣ Testing /crm/v3/objects/calls endpoint with properties...');
  try {
    const callsResponse = await fetch(
      `${HUBSPOT_BASE_URL}/crm/v3/objects/calls?limit=1&properties=hs_timestamp,hubspot_owner_id,hs_call_title`,
      {
        headers: {
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (callsResponse.ok) {
      const callsData = await callsResponse.json();
      console.log('✅ Calls API works!');
      console.log('   Found', callsData.results?.length || 0, 'calls');
      if (callsData.results?.length > 0) {
        console.log('   Sample call:', JSON.stringify(callsData.results[0], null, 2));
      }
    } else {
      const errorText = await callsResponse.text();
      console.log('❌ Calls API failed:', callsResponse.status);
      console.log('   Error:', errorText);
    }
  } catch (error) {
    console.log('❌ Error:', error);
  }

  console.log('\n3️⃣ Testing /crm/v3/objects/meetings endpoint...');
  try {
    const meetingsResponse = await fetch(
      `${HUBSPOT_BASE_URL}/crm/v3/objects/meetings?limit=1&properties=hs_timestamp,hubspot_owner_id,hs_meeting_title`,
      {
        headers: {
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (meetingsResponse.ok) {
      const meetingsData = await meetingsResponse.json();
      console.log('✅ Meetings API works!');
      console.log('   Found', meetingsData.results?.length || 0, 'meetings');
      if (meetingsData.results?.length > 0) {
        console.log('   Sample meeting:', JSON.stringify(meetingsData.results[0], null, 2));
      }
    } else {
      const errorText = await meetingsResponse.text();
      console.log('❌ Meetings API failed:', meetingsResponse.status);
      console.log('   Error:', errorText);
    }
  } catch (error) {
    console.log('❌ Error:', error);
  }

  console.log('\n4️⃣ Testing /crm/v3/objects/notes endpoint...');
  try {
    const notesResponse = await fetch(
      `${HUBSPOT_BASE_URL}/crm/v3/objects/notes?limit=1&properties=hs_timestamp,hubspot_owner_id,hs_note_body`,
      {
        headers: {
          'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (notesResponse.ok) {
      const notesData = await notesResponse.json();
      console.log('✅ Notes API works!');
      console.log('   Found', notesData.results?.length || 0, 'notes');
      if (notesData.results?.length > 0) {
        console.log('   Sample note:', JSON.stringify(notesData.results[0], null, 2));
      }
    } else {
      const errorText = await notesResponse.text();
      console.log('❌ Notes API failed:', notesResponse.status);
      console.log('   Error:', errorText);
    }
  } catch (error) {
    console.log('❌ Error:', error);
  }
}

testAPI();
