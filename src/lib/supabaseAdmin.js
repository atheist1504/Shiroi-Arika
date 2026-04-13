
import { createClient } from "@supabase/supabase-js";

/**
 * 🔐 SUPABASE ADMIN CLIENT (SERVICE ROLE)
 * CHÚ Ý: Chỉ sử dụng ở phía Server (Server Actions / API Routes).
 * Không bao giờ import file này ở client components (use client).
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.warn("⚠️ THIẾU SUPABASE_SERVICE_ROLE_KEY! Một số tính năng bảo mật sẽ không hoạt động.");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || "");
