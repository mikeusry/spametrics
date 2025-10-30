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
  const { data, error } = await supabase
    .from('sales_reps')
    .select('*')
    .limit(5);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Sales Reps columns:', Object.keys(data[0] || {}));
    console.log('\nSample data:');
    console.table(data);
  }
}

main();
