import { NextResponse } from 'next/server';

/**
 * 🛡️ API PROXY: Giúp hiển thị ảnh Preview trong Admin mà không bị chặn bởi CORS 🚀
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new NextResponse('Missing URL', { status: 400 });
  }

  try {
    console.log(`🌩️ [Force-Fetch] Đang thâm nhập: ${imageUrl}`);
    
    const fetchWithHeaders = async (referer) => {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
            'Cache-Control': 'no-cache',
            'Sec-Fetch-Dest': 'image',
            'Sec-Fetch-Mode': 'no-cors',
            'Sec-Fetch-Site': 'cross-site',
        };
        if (referer) headers['Referer'] = referer;
        
        return fetch(imageUrl, { headers, signal: AbortSignal.timeout(10000) });
    };

    // 🕵️‍♂️ THỬ NGHIỆM 1: Không Referer (Stealth)
    let response = await fetchWithHeaders(null);

    // 🕵️‍♂️ THỬ NGHIỆM 2: Nếu thất bại, thử với Referer MangaDex
    if (!response.ok) {
        console.log(`⚠️ [Proxy] Stealth thất bại, thử với Referer MangaDex...`);
        response = await fetchWithHeaders('https://mangadex.org/');
    }

    // 🕵️‍♂️ THỬ NGHIỆM 3: Nếu vẫn thất bại, thử với Referer của chính ảnh đó
    if (!response.ok) {
        console.log(`⚠️ [Proxy] Vẫn thất bại, thử với Referer Origin...`);
        response = await fetchWithHeaders(new URL(imageUrl).origin);
    }

    if (!response.ok) {
        console.error(`❌ [Proxy] Tất cả phương án đều bị MangaDex chặn! (Status: ${response.status})`);
        return new NextResponse(`MangaDex Blocked`, { status: response.status });
    }

    const contentType = response.headers.get('content-type');
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('❌ [Proxy Error]:', error.message);
    return new NextResponse('Error loading image', { status: 500 });
  }
}
