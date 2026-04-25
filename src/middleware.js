import { NextResponse } from 'next/server';

/**
 * 🛡️ SHIROI ADMIN MIDDLEWARE
 * Bảo vệ toàn bộ các route /admin ở tầng Edge/Server.
 */
export function middleware(request) {
  const { pathname } = request.nextUrl;

  // 1. Chỉ kiểm tra các route quản trị
  if (pathname.startsWith('/admin')) {
    const session = request.cookies.get('shiroi_session');

    // 2. Nếu không có session -> Đá về trang đăng nhập
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      // 3. Giải mã session từ cookie
      const user = JSON.parse(session.value);
      const isAdminOrStaff = user.role === 'admin' || user.role === 'staff' || user.username?.toLowerCase() === 'atheist1504';

      // 4. Nếu không phải Admin/Staff -> Đá về trang chủ
      if (!isAdminOrStaff) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    } catch (e) {
      // 5. Nếu cookie lỗi -> Đá về trang đăng nhập
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

// 🎯 Chỉ áp dụng middleware cho prefix /admin để tối ưu hiệu năng
export const config = {
  matcher: ['/admin/:path*'],
};
