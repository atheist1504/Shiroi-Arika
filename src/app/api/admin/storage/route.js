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

    // 🛡️ 3. Tính toán dung lượng chuẩn xác bằng SQL SUM 🚀
    // Tính tổng dung lượng từ bảng pages và mangas
    const { data: storageData, error: storageError } = await client.rpc('get_total_storage_kb');
    
    let totalKB = 0;

    if (storageError) {
      console.warn('⚠️ RPC failed, falling back to manual sum:', storageError);
      // Fallback nếu chưa tạo RPC: Tính thủ công nhưng không giới hạn limit
      const { data: pData } = await client.from('pages').select('size_kb');
      const { data: mData } = await client.from('mangas').select('size_kb');
      
      const pSum = (pData || []).reduce((s, p) => s + (p.size_kb || 150), 0);
      const mSum = (mData || []).reduce((s, m) => s + (m.size_kb || 300), 0);
      totalKB = pSum + mSum;
    } else {
      totalKB = storageData || 0;
    }
    
    const totalGB = totalKB / (1024 * 1024);

    return NextResponse.json({
      success: true,
      totalGB: parseFloat(totalGB.toFixed(4)), // Tăng độ chính xác lên 4 chữ số thập phân
      limitGB: 10,
      totalKB,
      method: storageError ? 'FALLBACK_SUM' : 'SQL_RPC'
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
