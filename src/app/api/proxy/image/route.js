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
    console.log(`🌩️ [Super-Proxy] Đang thâm nhập: ${imageUrl}`);
    
    // Bộ Headers "Siêu cấp" giả dạng trình duyệt Chrome thực thụ 🕵️‍♂️
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Referer': 'https://mangadex.org/',
        'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site',
        'Connection': 'keep-alive'
    };

    const response = await fetch(imageUrl, { headers });

    if (!response.ok) {
        console.error(`❌ [Super-Proxy] Bị chặn (Status: ${response.status}) tại: ${imageUrl}`);
        // Nếu bị chặn, thử lại một lần nữa với bộ headers tối giản hơn (đôi khi lại hiệu quả)
        const fallbackRes = await fetch(imageUrl, { 
            headers: { 'User-Agent': 'Mozilla/5.0' } 
        });
        if (fallbackRes.ok) return new NextResponse(await fallbackRes.arrayBuffer(), { headers: { 'Content-Type': fallbackRes.headers.get('content-type') || 'image/jpeg' } });
        
        return new NextResponse(`MangaDex từ chối (Status: ${response.status})`, { status: response.status });
    }

    const contentType = response.headers.get('content-type');
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400', // Lưu cache 1 ngày cho mượt
        'Access-Control-Allow-Origin': '*', // Mở toang CORS cho Admin
      },
    });
  } catch (error) {
    console.error('❌ [Proxy Error]:', error.message);
    return new NextResponse('Error loading image', { status: 500 });
  }
}
