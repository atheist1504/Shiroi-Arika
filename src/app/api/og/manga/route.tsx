import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mangaId = searchParams.get('mangaId');

    if (!mangaId) {
      return new Response('Missing mangaId', { status: 400 });
    }

    // 🔍 KẾT NỐI DATABASE TRỰC TIẾP TRONG REQUEST
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: manga, error } = await supabase
      .from('mangas')
      .select('title, description, cover_image, genres, status, author')
      .eq('id', mangaId)
      .single();

    if (error || !manga) {
      console.error("Supabase Error:", error);
      return new Response(`Manga not found (ID: ${mangaId})`, { status: 404 });
    }

    // 🛠️ XỬ LÝ DỮ LIỆU
    const title = manga.title || 'Shiroi Arika Manga';
    const description = manga.description ? 
      (manga.description.substring(0, 160) + (manga.description.length > 160 ? '...' : '')) : 
      'Đọc truyện tranh online miễn phí tại Shiroi Arika...';
    const coverImage = manga.cover_image;
    const genres = Array.isArray(manga.genres) ? manga.genres.slice(0, 4) : [];
    const status = manga.status === 'completed' ? 'SIÊU PHẨM' : 'ĐANG TIẾN HÀNH';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
            backgroundColor: '#0a0a0a',
            padding: '50px',
            position: 'relative',
          }}
        >
          {/* 🌑 BACKGROUND GLOW (Tạo chiều sâu như v8) */}
          <div 
            style={{
              position: 'absolute',
              top: '-100px',
              right: '-100px',
              width: '500px',
              height: '500px',
              backgroundColor: 'rgba(76, 175, 80, 0.05)',
              borderRadius: '100%',
              filter: 'blur(100px)',
            }}
          />

          {/* 🖼️ TRÁI: POSTER TRUYỆN */}
          <div 
            style={{
              display: 'flex',
              width: '380px',
              height: '530px',
              boxShadow: '0 30px 60px rgba(0,0,0,0.8)',
              borderRadius: '35px',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <img
              src={coverImage}
              alt={title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>

          {/* 📝 PHẢI: THÔNG TIN TRUYỆN */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginLeft: '60px',
              flex: 1,
              height: '530px',
              justifyContent: 'center',
            }}
          >
             {/* TAGS */}
             <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
                {genres.map((g: string) => (
                  <div key={g} style={{
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    border: '1px solid rgba(76, 175, 80, 0.2)',
                    color: '#4caf50',
                    padding: '6px 16px',
                    borderRadius: '50px',
                    fontSize: '14px',
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    {g}
                  </div>
                ))}
                <div style={{
                  backgroundColor: 'rgba(255, 152, 0, 0.1)',
                  border: '1px solid rgba(255, 152, 0, 0.2)',
                  color: '#ff9800',
                  padding: '6px 16px',
                  borderRadius: '50px',
                  fontSize: '14px',
                  fontWeight: '900',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>
                  {status}
                </div>
             </div>

             {/* TITLE */}
             <h1 style={{
                fontSize: '72px',
                fontWeight: '900',
                color: 'white',
                lineHeight: '1.1',
                marginBottom: '25px',
                letterSpacing: '-2px',
                textShadow: '0 4px 10px rgba(0,0,0,0.5)'
             }}>
                {title}
             </h1>

             {/* DESCRIPTION */}
             <p style={{
                fontSize: '22px',
                color: 'rgba(255,255,255,0.5)',
                lineHeight: '1.6',
                marginBottom: '40px',
                width: '100%',
                maxHeight: '110px',
                overflow: 'hidden',
                fontWeight: '500'
             }}>
                {description}
             </p>

             {/* BUTTON & BRANDING */}
             <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{
                  display: 'flex',
                  backgroundColor: '#4caf50',
                  color: 'black',
                  padding: '18px 40px',
                  borderRadius: '20px',
                  fontSize: '20px',
                  fontWeight: '900',
                  letterSpacing: '2px',
                  boxShadow: '0 15px 30px rgba(76, 175, 80, 0.3)',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                   ĐỌC NGAY 🍀
                </div>
                
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  marginLeft: '20px'
                }}>
                   <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', fontWeight: '900', letterSpacing: '4px', textTransform: 'uppercase' }}>CHIA SẺ TỪ</span>
                   <span style={{ color: '#4caf50', fontSize: '18px', fontWeight: '900', letterSpacing: '2px' }}>SHIROI ARIKA</span>
                </div>
             </div>
          </div>

          {/* CHÂN TRANG: GREEN LINE */}
          <div style={{
             position: 'absolute',
             bottom: '40px',
             left: '50%',
             transform: 'translateX(-50%)',
             width: '60px',
             height: '6px',
             borderRadius: '10px',
             backgroundColor: '#4caf50',
             opacity: 0.8
          }} />
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.error(e.message);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
