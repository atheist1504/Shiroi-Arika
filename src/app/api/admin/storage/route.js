import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * 🛠️ HÀM HỖ TRỢ: Lấy Client DB phù hợp (Admin hoặc Anon dự phòng) 🛡️
 */
function getDbClient() {
  return supabaseAdmin || supabase;
}

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

    // 🛡️ 2. Lấy Client DB (Ưu tiên Admin, Fallback về Anon)
    const client = getDbClient();

    // 🛡️ 3. Tính toán dung lượng (Safe Query)
    const { data: pagesData, error: pagesError } = await client
      .from('pages')
      .select('size_kb')
      .limit(2000);
    
    if (pagesError) throw pagesError;
    
    const pagesTotal = (pagesData || []).reduce((sum, p) => sum + (p.size_kb || 150), 0);

    const { data: mangasData, error: mangasError } = await client
      .from('mangas')
      .select('size_kb');
    
    const mangasTotal = (mangasData || []).reduce((sum, m) => sum + (m.size_kb || 300), 0);
    
    const totalKB = pagesTotal + mangasTotal;
    const totalGB = totalKB / (1024 * 1024);

    return NextResponse.json({
      success: true,
      totalGB: parseFloat(totalGB.toFixed(3)),
      limitGB: 10,
      totalKB,
      debug: supabaseAdmin ? 'ADMIN_MODE' : 'ANON_FALLBACK'
    });

  } catch (error) {
    console.error('❌ Lỗi API Storage:', error);
    return NextResponse.json({
      success: true, 
      totalGB: 0,
      limitGB: 10,
      error: error.message
    });
  }
}
