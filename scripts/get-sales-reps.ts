import 'dotenv/config';
import { supabase } from '../lib/supabase';

async function getSalesReps() {
  const { data: reps, error } = await supabase
    .from('sales_reps')
    .select('rep_id, full_name, role, is_active, hubspot_owner_id')
    .order('full_name');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n📋 Sales Reps in Database:\n');
  reps?.forEach(rep => {
    const status = rep.is_active ? '✅' : '❌';
    const mapped = rep.hubspot_owner_id ? `[HubSpot: ${rep.hubspot_owner_id}]` : '[NOT MAPPED]';
    const repId = String(rep.rep_id).padStart(3);
    console.log(`${status} ${repId} | ${rep.full_name.padEnd(25)} | ${mapped}`);
  });

  console.log(`\nTotal: ${reps?.length || 0} reps`);
  console.log(`Mapped: ${reps?.filter(r => r.hubspot_owner_id).length || 0}`);
  console.log(`Unmapped: ${reps?.filter(r => !r.hubspot_owner_id).length || 0}`);
}

getSalesReps();
