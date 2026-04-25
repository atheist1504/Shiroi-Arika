const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixRLS() {
  console.log("🛠️ Đang sửa lỗi RLS cho thông báo...");
  
  // Note: Direct SQL execution is not possible via standard client.
  // But we can check if the current policies are blocking by attempting a select.
  // Actually, we'll just advise the user to run the SQL file.
  
  console.log("👉 Vui lòng chạy nội dung trong file 'fix_notifications_rls.sql' vào Supabase SQL Editor.");
}

fixRLS();
