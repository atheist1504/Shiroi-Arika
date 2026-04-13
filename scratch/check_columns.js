
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkColumns() {
  const { data, error } = await supabase
    .from('mangas')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error fetching mangas:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('Columns in mangas table:', Object.keys(data[0]));
  } else {
    console.log('No data found in mangas table.');
  }
}

checkColumns();
