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
    console.log(`🌩️ [Proxy] Đang lấy ảnh: ${imageUrl}`);
    
    // Giả lập Referer từ MangaDex để vượt rào bảo mật 🛡️
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'vi,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site'
    };

    // Nếu là ảnh từ MangaDex thì bắt buộc phải có Referer của họ 🕵️‍♂️
    if (imageUrl.includes('mangadex')) {
        headers['Referer'] = 'https://mangadex.org/';
    } else {
        headers['Referer'] = new URL(imageUrl).origin;
    }

    const response = await fetch(imageUrl, { headers });

    if (!response.ok) {
        console.error(`❌ [Proxy] Web gốc từ chối (Status: ${response.status}) cho URL: ${imageUrl}`);
        return new NextResponse(`Web gốc từ chối (Status: ${response.status})`, { status: response.status });
    }

    const contentType = response.headers.get('content-type');
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('❌ [Proxy Error]:', error.message);
    return new NextResponse('Error loading image', { status: 500 });
  }
}
