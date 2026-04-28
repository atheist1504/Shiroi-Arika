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

const supabase = createClient(supabaseUrl, supabaseKey);

async function getRecentLogs() {
  const { data, error } = await supabase
    .from('shiroi_xp_logs')
    .select('*, shiroi_users(display_name)')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching XP logs:', error);
    process.exit(1);
  }

  console.log(JSON.stringify(data, null, 2));
}

getRecentLogs();
