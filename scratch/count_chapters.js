const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.join('=').trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function countChapters() {
  const { count, error } = await supabase
    .from('chapters')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error fetching chapter count:', error);
    process.exit(1);
  }

  const { count: mangaCount, error: mangaError } = await supabase
    .from('mangas')
    .select('*', { count: 'exact', head: true });

  if (mangaError) {
    console.error('Error fetching manga count:', mangaError);
    process.exit(1);
  }

  console.log(`Mangas: ${mangaCount}`);
  console.log(`Chapters: ${count}`);
}

countChapters();
