const { createClient } = require('@supabase/supabase-js');
const { Redis } = require('@upstash/redis');
const fs = require('fs');
const path = require('path');

// Manually read .env.local
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.join('=').trim().replace(/^["']|["']$/g, '');
  }
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

async function disableMaintenance() {
  console.log("🚀 [Maintenance] Tắt chế độ bảo trì...");

  try {
    // 1. Update Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { error: dbError } = await supabase
      .from('shiroi_config')
      .update({ value: false })
      .eq('key', 'maintenance_mode');

    if (dbError) throw dbError;
    console.log("✅ [Supabase] Đã cập nhật maintenance_mode = false");

    // 2. Update Redis (Sync instantly)
    await redis.set('config:maintenance_mode', false, { ex: 3600 }); 
    console.log("✅ [Redis] Đã cập nhật config:maintenance_mode = false");

    console.log("\n🎉 Xong! Hệ thống đã hoạt động bình thường.");
  } catch (error) {
    console.error("❌ Lỗi:", error.message);
  }
}

disableMaintenance();
