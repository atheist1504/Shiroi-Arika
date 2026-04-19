import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * 🕵️‍♂️ API ROUTE: Lấy thông tin người dùng từ Cookie
 * Phục vụ các thành phần Client-side cần ID chính xác mà LocalStorage đang bị trống 🍀
 */
export async function GET() {
    try {
        const sessionData = cookies().get('shiroi_session');
        if (!sessionData) {
            return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 });
        }

        const user = JSON.parse(sessionData.value);
        
        // Trả về thông tin tối giản để bảo mật
        return NextResponse.json({ 
            success: true, 
            user: {
                id: user.id || null,
                username: user.username || null,
                role: user.role || 'user'
            } 
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
