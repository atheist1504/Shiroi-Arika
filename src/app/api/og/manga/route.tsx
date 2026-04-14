import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mangaId = searchParams.get('mangaId');

    if (!mangaId) {
      return new Response('Missing mangaId', { status: 400 });
    }

    // 🛡️ SỬ DỤNG SERVICE ROLE ĐỂ BYPASS RLS (Đảm bảo luôn lấy được data cho Crawler) 🍀
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: manga, error } = await supabase
      .from('mangas')
      .select('*')
      .eq('id', mangaId)
      .single();

    if (error) {
      console.error(`❌ [OG API] Lỗi fetch manga ${mangaId}:`, error.message);
    }

    // 🍎 FALLBACK NẾU LỖI DATABASE
    if (error || !manga) {
      return new ImageResponse(
        (
          <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a', color: '#4caf50', fontSize: '40px', fontWeight: 'bold' }}>
            SHIROI ARIKA - ĐANG TẢI TRUYỆN... 🍀
          </div>
        ),
        { width: 1200, height: 630 }
      );
    }

    const title = manga.title || 'Shiroi Arika Manga';
    const description = manga.description ? manga.description.substring(0, 120) + '...' : 'Đọc truyện tranh online miễn phí tại Shiroi Arika...';
    
    // 🛡️ XỬ LÝ ẢNH BÌA: Fetch trực tiếp để đảm bảo Crawler nhìn thấy 🍀
    const coverImageUrl = manga.cover_image || 'https://shiroi-arika.vercel.app/logo.png';
    let coverImageData: string | null = null;
    
    try {
      const response = await fetch(coverImageUrl);
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const contentType = response.headers.get('content-type') || 'image/webp';
        coverImageData = `data:${contentType};base64,${base64}`;
      }
    } catch (e) {
      console.error("Lỗi fetch ảnh bìa cho OG:", e);
    }

    const genres = Array.isArray(manga.genres) ? manga.genres.slice(0, 3) : [];

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#0a0a0a',
            padding: '50px',
          }}
        >
          {/* TRÁI: POSTER */}
          <div style={{ display: 'flex', width: '380px', height: '530px', borderRadius: '30px', overflow: 'hidden', border: '2px solid #1a1a1a' }}>
            {coverImageData ? (
              <img src={coverImageData} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ backgroundColor: '#1a1a1a', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' }}>No Image</div>
            )}
          </div>

          {/* PHẢI: INFO */}
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '60px', flex: 1 }}>
             <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                {genres.map((g: string) => (
                  <div key={g} style={{ backgroundColor: '#4caf50', color: 'black', padding: '4px 12px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                    {g.toUpperCase()}
                  </div>
                ))}
             </div>

             <h1 style={{ fontSize: '64px', fontWeight: 'bold', color: 'white', marginBottom: '20px', lineHeight: '1.2' }}>
                {title}
             </h1>

             <p style={{ fontSize: '26px', color: '#666', marginBottom: '40px' }}>
                {description}
             </p>

             <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ backgroundColor: '#4caf50', color: 'black', padding: '16px 40px', borderRadius: '16px', fontSize: '24px', fontWeight: 'bold' }}>
                   ĐỌC NGAY 🍀
                </div>
                <div style={{ color: '#4caf50', fontSize: '20px', fontWeight: 'bold', marginLeft: '30px' }}>
                   SHIROI ARIKA
                </div>
             </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  } catch (e: any) {
    return new Response(`Error`, { status: 500 });
  }
}
