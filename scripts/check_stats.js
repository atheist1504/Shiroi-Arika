const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTableStats() {
  console.log("📊 Kiểm tra thống kê bảng...");
  
  const tables = ['shiroi_users', 'shiroi_xp_logs', 'shiroi_mission_claims'];
  
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true });
    if (!error) {
      console.log(`- Bảng ${table}: ${count} bản ghi`);
    } else {
      console.log(`- Lỗi bảng ${table}:`, error.message);
    }
  }
}

checkTableStats();
