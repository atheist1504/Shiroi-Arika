
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key);

async function check() {
    const { data: user, error: uErr } = await supabase.from('shiroi_users').select('id, username').eq('username', 'Yoo').maybeSingle();
    console.log("User Yoo:", user);
}

check();
