const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Đọc .env.local thủ công
const env = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
env.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) envVars[key.trim()] = value.trim();
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkNotifs() {
  console.log("🔍 Đang kiểm tra shiroi_notifications...");
  const { data, error } = await supabase.from('shiroi_notifications').select('*').limit(1);
  if (error) console.error(error.message);
  else console.log("Thông báo:", JSON.stringify(data, null, 2));
}

checkNotifs();
