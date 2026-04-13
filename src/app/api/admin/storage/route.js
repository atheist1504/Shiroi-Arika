import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 🛡️ 1. Kiểm tra Admin Auth bằng Cookie
    const sessionData = cookies().get('shiroi_session');
    if (!sessionData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = JSON.parse(sessionData.value);
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 🛡️ 2. Kiểm tra Client sẵn sàng (Tránh lỗi lúc Build)
    if (!supabaseAdmin) {
      return NextResponse.json({ success: true, totalGB: 0, limitGB: 10, debug: 'BUILD_TIME_SKIP' });
    }

    // 🛡️ 3. Tính toán dung lượng (Safe Query)
    const { data: pagesData, error: pagesError } = await supabaseAdmin
      .from('pages')
      .select('size_kb')
      .limit(2000);
    
    if (pagesError) throw pagesError;
    
    const pagesTotal = (pagesData || []).reduce((sum, p) => sum + (p.size_kb || 150), 0);

    const { data: mangasData, error: mangasError } = await supabaseAdmin
      .from('mangas')
      .select('size_kb');
    
    const mangasTotal = (mangasData || []).reduce((sum, m) => sum + (m.size_kb || 300), 0);
    
    const totalKB = pagesTotal + mangasTotal;
    const totalGB = totalKB / (1024 * 1024);

    return NextResponse.json({
      success: true,
      totalGB: parseFloat(totalGB.toFixed(3)),
      limitGB: 10,
      totalKB
    });

  } catch (error) {
    console.error('❌ Lỗi API Storage:', error);
    return NextResponse.json({
      success: true, // Trả về success true nhưng giá trị 0 để không làm hỏng UI
      totalGB: 0,
      limitGB: 10,
      error: error.message
    });
  }
}
