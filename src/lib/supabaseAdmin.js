import { createClient } from "@supabase/supabase-js";

/**
 * 🔐 SUPABASE ADMIN CLIENT (SERVICE ROLE)
 * CHÚ Ý: Chỉ sử dụng ở phía Server (Server Actions / API Routes).
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

// 🛡️ CHỈ KHỞI TẠO NẾU CÓ KEY (TRÁNH LỖI KHI BUILD TRÊN VERCEL) 🍀
export const supabaseAdmin = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

if (!supabaseAdmin) {
  console.warn("⚠️ [SupabaseAdmin] Service Role Client chưa được khởi tạo. Một số tính năng admin sẽ không khả dụng trong quá trình Build.");
}
