import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * 🚪 API ROUTE: Đăng xuất hoàn toàn 🛡️
 * Xóa Session Cookie trên Server để tránh việc bị Auto-login lại từ trình duyệt 🍀
 */
export async function GET(request) {
    try {
        const cookieStore = cookies();
        
        // 🚪 Xóa cookie triệt để bằng cách set expired với path '/' 🛡️
        cookieStore.set('shiroi_session', '', { 
            path: '/', 
            maxAge: 0,
            expires: new Date(0),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });
        
        // 🚀 Chuyển hướng về trang chủ và chặn cache
        const url = new URL('/', request.url);
        const response = NextResponse.redirect(url);
        
        // Đảm bảo trình duyệt không cache lại trạng thái đăng nhập cũ
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
        
        return response;
    } catch (error) {
        return NextResponse.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
}
