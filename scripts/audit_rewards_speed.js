const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function auditPerformance() {
  console.log("🚀 Bắt đầu kiểm tra hiệu năng Rewards & Missions... 🍀");
  const userId = '8f3dabb-mock-id'; // Use a real ID if possible or just measure raw query time

  // 1. Kiểm tra tốc độ SELECT User
  console.time('⏱️ [DB] SELECT User Data');
  const { data: user } = await supabase.from('shiroi_users').select('xp, level, check_in_streak, last_check_in').limit(1).single();
  console.timeEnd('⏱️ [DB] SELECT User Data');

  // 2. Kiểm tra tốc độ INSERT XP Log
  console.time('⏱️ [DB] INSERT XP Log');
  // We won't actually insert to avoid polluting data, or we use a temp record
  const { error: logError } = await supabase.from('shiroi_xp_logs').insert({
    user_id: user.id,
    amount: 0,
    type: 'test',
    reason: 'Performance Audit',
    created_at: new Date().toISOString()
  });
  console.timeEnd('⏱️ [DB] INSERT XP Log');

  // 3. Kiểm tra tốc độ UPDATE User
  console.time('⏱️ [DB] UPDATE User XP');
  const { error: upError } = await supabase.from('shiroi_users').update({ xp: user.xp }).eq('id', user.id);
  console.timeEnd('⏱️ [DB] UPDATE User XP');

  // 4. Kiểm tra tốc độ SELECT Mission Claims
  console.time('⏱️ [DB] SELECT Mission Claims');
  await supabase.from('shiroi_mission_claims').select('id').eq('user_id', user.id).limit(1);
  console.timeEnd('⏱️ [DB] SELECT Mission Claims');

  console.log("\n✅ Hoàn tất kiểm tra raw DB latency.");
}

auditPerformance();
