import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const user = await request.json();
        if (!user || !user.id || !user.username) {
            return NextResponse.json({ success: false, error: 'Dữ liệu không hợp lệ' }, { status: 400 });
        }

        // Tạo Cookie giống với loginAction / signupAction
        cookies().set('shiroi_session', JSON.stringify({
            id: user.id,
            username: user.username,
            role: user.role || 'user'
        }), { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
            sameSite: 'lax'
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
