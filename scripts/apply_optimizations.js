const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Thiếu cấu hình Supabase trong .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyOptimization() {
  console.log("🚀 Đang tối ưu hóa hệ thống báo cáo...");
  
  const sql = `
    CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.shiroi_reports(user_id);
    CREATE INDEX IF NOT EXISTS idx_reports_manga_id ON public.shiroi_reports(manga_id);
    CREATE INDEX IF NOT EXISTS idx_reports_chapter_id ON public.shiroi_reports(chapter_id);
    CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.shiroi_reports(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_reports_status ON public.shiroi_reports(status);
    CREATE INDEX IF NOT EXISTS idx_report_messages_report_id ON public.shiroi_report_messages(report_id);
    CREATE INDEX IF NOT EXISTS idx_report_messages_created_at ON public.shiroi_report_messages(created_at ASC);
  `;

  // Supabase JS client doesn't support direct SQL execution easily via rpc unless a custom function exists.
  // We can try to run it via rpc if there's an 'exec_sql' function, or just advise the user.
  // Most Supabase setups have an extension or custom function for this in dev.
  
  console.log("⚠️ Lưu ý: Script này yêu cầu hàm 'exec_sql' hoặc chạy trực tiếp trong SQL Editor của Supabase.");
  console.log("Nội dung SQL:\n", sql);
}

applyOptimization();
