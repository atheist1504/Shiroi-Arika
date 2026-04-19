import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * 🕵️‍♂️ DIAGNOSTIC API: Kiểm tra trạng thái hệ thống thông báo 🛡️
 * Giúp xác định lỗi do biến môi trường, quyền hạn hay dữ liệu.
 */
export async function GET() {
    const report = {
        timestamp: new Date().toISOString(),
        supabaseAdmin: {
            isAvailable: !!supabaseAdmin,
            url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'PRESENT' : 'MISSING',
            key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'PRESENT' : 'MISSING',
        },
        session: {
            cookieFound: false,
            userId: null,
            username: null
        },
        database: {
            canQuery: false,
            error: null,
            rowCount: 0
        }
    };

    try {
        // 1. Kiểm tra Cookie Session
        const sessionData = cookies().get('shiroi_session');
        if (sessionData) {
            report.session.cookieFound = true;
            try {
                const user = JSON.parse(sessionData.value);
                report.session.userId = user.id;
                report.session.username = user.username;
            } catch (e) {
                report.session.error = "Lỗi giải mã JSON cookie";
            }
        }

        // 2. Chạy thử truy vấn nếu Admin Client sẵn sàng
        if (supabaseAdmin) {
            const { count, error } = await supabaseAdmin
                .from('shiroi_notifications')
                .select('*', { count: 'exact', head: true });
            
            if (error) {
                report.database.error = error.message;
            } else {
                report.database.canQuery = true;
                report.database.rowCount = count || 0;
            }
        } else {
            report.database.error = "Admin Client NOT INITIALIZED";
        }

    } catch (err) {
        report.criticalError = err.message;
    }

    return NextResponse.json(report);
}
