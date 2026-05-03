import { NextResponse } from 'next/server';

/**
 * 🛡️ SHIROI MULTI-PURPOSE MIDDLEWARE
 * 1. Bảo vệ Route Admin
 * 2. Quản lý Chế độ Bảo trì (Maintenance Mode)
 */
export async function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // --- 0. SKIP CHO CÁC FILE TĨNH ---
  // Lưu ý: Matcher đã lọc bớt, nhưng lọc thêm ở đây cho chắc chắn
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/fonts') ||
    pathname.includes('.') // favicon.ico, images...
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
  // Không chặn Admin, không chặn trang /maintenance, /login, /signup, /api/auth
  const isPublicRoute = 
    pathname === '/maintenance' || 
    pathname === '/login' || 
    pathname === '/signup' ||
    pathname.startsWith('/api/auth');
  
  if (!isAdminOrStaff && !isPublicRoute) {
    try {
      const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      // Debug: console.log("Checking maintenance mode...");

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
      // Chấp nhận cả boolean true hoặc chuỗi "true"
      const isMaintenance = config?.[0]?.value === true || config?.[0]?.value === "true";

      if (isMaintenance) {
        // console.log("Maintenance mode is ON. Redirecting...");
        return NextResponse.redirect(new URL('/maintenance', request.url));
      }
    } catch (error) {
      console.error("Maintenance check error:", error);
    }
  }

  return NextResponse.next();
}

// 🎯 Áp dụng cho mọi route trừ assets và api quan trọng
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes - cho phép chạy ngầm)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|maintenance).*)',
  ],
};
