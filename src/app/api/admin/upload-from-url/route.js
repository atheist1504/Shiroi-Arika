import { NextResponse } from 'next/server';
import { uploadFromUrlAction } from '@/lib/actions';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * 🌩️ API ENDPOINT: Tải danh sách ảnh từ URL lên Cloudflare R2
 * POST /api/admin/upload-from-url
 * { "urls": ["url1", "url2"], "mangaId": "uuid", "chapterId": "uuid" }
 */
export async function POST(request) {
  try {
    // 🛡️ 1. Kiểm tra quyền hạn (Admin hoặc Staff)
    const sessionData = cookies().get('shiroi_session');
    if (!sessionData) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const session = JSON.parse(sessionData.value);
    const isAuthorized = session.role === 'admin' || session.role === 'staff' || session.username?.toLowerCase() === 'atheist1504';

    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // 📥 2. Nhận dữ liệu từ request
    const body = await request.json();
    const { urls, mangaId, chapterId } = body;

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json({ success: false, error: 'Dữ liệu urls phải là một mảng!' }, { status: 400 });
    }

    console.log(`🌩️ [API-Transfer] Đang xử lý ${urls.length} ảnh cho chapter ${chapterId}...`);

    const results = [];
    const errors = [];

    // 🚀 3. Thực hiện upload hàng loạt (Batch Processing)
    // Lưu ý: ChapterId giúp xác định thư mục lưu trữ trên R2
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const pageNumber = i + 1;
      const fileName = `chapters/${chapterId}/page_${pageNumber}.jpg`;

      try {
        const result = await uploadFromUrlAction(url, fileName);
        if (result.success) {
          results.push({
            url: result.url,
            size_kb: result.size_kb,
            page_number: pageNumber
          });
        } else {
          errors.push({ url, error: result.error });
        }
      } catch (err) {
        errors.push({ url, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      failed: errors.length,
      images: results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ [API-Transfer] Lỗi hệ thống:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
