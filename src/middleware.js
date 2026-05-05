import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// 🚀 Khởi tạo Redis client cho Edge Runtime
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// 🧠 IN-MEMORY CACHE (Cực nhanh cho Edge Runtime) 🍀
// Giúp giảm số lần gọi tới Redis khi có hàng nghìn người truy cập cùng lúc
let localMaintenanceCache = null;
let lastCacheUpdate = 0;
const CACHE_TTL = 30000; // 30 giây (trong 30s chỉ gọi Redis 1 lần)

/**
 * 🛡️ SHIROI MULTI-PURPOSE MIDDLEWARE
 * 1. Bảo vệ Route Admin
 * 2. Quản lý Chế độ Bảo trì (Maintenance Mode) sử dụng In-Memory -> Redis -> Supabase Fallback
 */
export async function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // --- 0. SKIP CHO CÁC FILE TĨNH ---
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/fonts') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // --- 1. LẤY THÔNG TIN USER TỪ COOKIE ---
  const sessionCookie = request.cookies.get('shiroi_session');
  let isAdminOrStaff = false;

  if (sessionCookie) {
    try {
      const user = JSON.parse(sessionCookie.value);
      isAdminOrStaff = user.role === 'admin' || user.role === 'staff' || user.username?.toLowerCase() === 'atheist1504';
    } catch (e) {
      // Cookie lỗi hoặc không hợp lệ
    }
  }

  // --- 2. BẢO VỆ ROUTE /ADMIN ---
  if (pathname.startsWith('/admin')) {
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (!isAdminOrStaff) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // --- 3. KIỂM TRA CHẾ ĐỘ BẢO TRÌ (MAINTENANCE MODE) ---
  const isPublicRoute = 
    pathname === '/maintenance' || 
    pathname === '/login' || 
    pathname === '/signup' ||
    pathname.startsWith('/api/auth');
  
  if (!isAdminOrStaff && !isPublicRoute) {
    let isMaintenance = false;
    const now = Date.now();

    // ⚡ LỚP 1: IN-MEMORY CACHE (0ms)
    if (localMaintenanceCache !== null && (now - lastCacheUpdate < CACHE_TTL)) {
      isMaintenance = localMaintenanceCache;
    } else {
        try {
          // 🏎️ LỚP 2: THỬ LẤY TỪ REDIS (GIẢM TẢI CPU & DB)
          if (process.env.UPSTASH_REDIS_REST_URL) {
            const cached = await redis.get('config:maintenance_mode');
            if (cached !== null) {
              isMaintenance = cached === true || cached === "true";
              
              // Cập nhật vào bộ nhớ local
              localMaintenanceCache = isMaintenance;
              lastCacheUpdate = now;
            } else {
              isMaintenance = null;
            }
          } else {
            isMaintenance = null;
          }
        } catch (redisError) {
          console.error("⚠️ Redis Middleware Error:", redisError.message);
          isMaintenance = null; 
        }

        // 🧱 LỚP 3: FALLBACK SANG DB NẾU REDIS TRỐNG HOẶC LỖI
        if (isMaintenance === null) {
          try {
            const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

            const response = await fetch(
              `${SUPABASE_URL}/rest/v1/shiroi_config?key=eq.maintenance_mode&select=value`,
              {
                headers: {
                  'apikey': SUPABASE_ANON_KEY,
                  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                },
                cache: 'no-store'
              }
            );

            const config = await response.json();
            const value = config?.[0]?.value;
            isMaintenance = value === true || value === "true";

            // Cập nhật bộ nhớ local và Redis
            localMaintenanceCache = isMaintenance;
            lastCacheUpdate = now;
            
            if (process.env.UPSTASH_REDIS_REST_URL) {
              await redis.set('config:maintenance_mode', isMaintenance, { ex: 60 }).catch(() => {});
            }
          } catch (dbError) {
            console.error("❌ Database Maintenance Check Error:", dbError.message);
          }
        }
    }

    // 🛑 CHẶN NẾU ĐANG BẢO TRÌ
    if (isMaintenance === true) {
      return NextResponse.redirect(new URL('/maintenance', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|maintenance).*)',
  ],
};
