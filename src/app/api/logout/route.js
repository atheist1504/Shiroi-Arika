import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * 🚪 API ROUTE: Đăng xuất hoàn toàn 🛡️
 * Xóa Session Cookie trên Server để tránh việc bị Auto-login lại từ trình duyệt 🍀
 */
export async function GET(request) {
    try {
        const cookieStore = cookies();
        cookieStore.delete('shiroi_session');
        
        // Chuyển hướng về trang chủ sau khi xóa cookie 🏠
        const url = new URL('/', request.url);
        return NextResponse.redirect(url);
    } catch (error) {
        return NextResponse.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
}
