import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const url = new URL('/', request.url);
        const response = NextResponse.redirect(url);

        // ✅ Xóa cookie trực tiếp trên response object
        response.cookies.set('shiroi_session', '', { 
            path: '/', 
            maxAge: 0,
            expires: new Date(0),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });

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