'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { optimizeImage } from '@/lib/cloudinary';

export default function BookmarksPage() {
  const [followedMangas, setFollowedMangas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFollowedMangas();
  }, []);

  const fetchFollowedMangas = async () => {
    try {
      setLoading(true);
      
      const storedUser = localStorage.getItem('shiroi_user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      
      let followedIds = [];

      if (user && user.id) {
        // GIAI ĐOẠN 1: Lấy từ Database ☁️
        const { data: followData } = await supabase
          .from('shiroi_follows')
          .select('manga_id')
          .eq('user_id', user.id);
        
        followedIds = followData?.map(f => f.manga_id) || [];
        
        // Đồng bộ ngược lại Local Storage 💾
        localStorage.setItem('shiroi_followed', JSON.stringify(followedIds));
      } else {
        // GIAI ĐOẠN 2: Lấy từ Local (Dành cho khách) 🚶
        followedIds = JSON.parse(localStorage.getItem('shiroi_followed') || '[]');
      }
      
      if (followedIds.length === 0) {
        setFollowedMangas([]);
        return;
      }

      // Lấy thông tin các manga được theo dõi
      const { data, error } = await supabase
        .from('mangas')
        .select(`
          id,
          title,
          cover_image,
          status,
          chapters (
            id,
            chapter_number
          )
        `)
        .in('id', followedIds);

      if (error) throw error;
      
      const processed = data?.map(m => ({
        ...m,
        latestChapter: m.chapters?.sort((a, b) => b.chapter_number - a.chapter_number)[0] || null
      })) || [];

      setFollowedMangas(processed);
    } catch (err) {
      console.error('Lỗi tải danh sách theo dõi:', err);
    } finally {
      setLoading(false);
    }
  };

  const unfollow = async (id) => {
    if (!confirm("Bạn muốn ngừng theo dõi bộ truyện này? 💔")) return;
    
    // 1. Cập nhật local
    let followed = JSON.parse(localStorage.getItem('shiroi_followed') || '[]');
    followed = followed.filter(fid => fid !== id);
    localStorage.setItem('shiroi_followed', JSON.stringify(followed));
    setFollowedMangas(prev => prev.filter(m => m.id !== id));

    // 2. Đồng bộ Cloud nếu có user
    const storedUser = localStorage.getItem('shiroi_user');
    const user = storedUser ? JSON.parse(storedUser) : null;
    if (user && user.id) {
       await supabase.from('shiroi_follows').delete().eq('user_id', user.id).eq('manga_id', id);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0c0a] text-white p-6 pt-28 md:p-12 md:pt-32 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-[#4caf50]/5 to-transparent pointer-events-none blur-[120px]"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between mb-16 gap-6">
            <div className="flex items-center gap-4">
                <div className="w-1.5 h-10 bg-gradient-to-b from-[#4caf50] to-[#2e7d32] rounded-full shadow-[0_0_20px_rgba(76,175,80,0.5)]"></div>
                <div>
                    <h1 className="text-4xl font-black tracking-tighter uppercase leading-none">Tủ Truyện <span className="text-[#4caf50]">Của Tôi</span></h1>
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] mt-2">Danh sách các bộ truyện bạn đang theo dõi</p>
                </div>
            </div>
            
            <div className="flex items-center gap-4 bg-[#141814]/40 backdrop-blur-xl border border-white/5 py-2 px-6 rounded-2xl">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Tổng cộng</span>
                <span className="text-xl font-black text-[#4caf50]">{followedMangas.length}</span>
            </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-[#141814]/40 rounded-3xl border border-white/5 animate-pulse"></div>
            ))}
          </div>
        ) : followedMangas.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[500px] bg-[#141814]/20 border-2 border-dashed border-[#4caf50]/10 rounded-[60px] p-12 text-center group">
             <div className="w-24 h-24 bg-[#141814] rounded-[40px] flex items-center justify-center text-4xl mb-8 shadow-2xl group-hover:scale-110 transition-transform duration-500">🕸️</div>
             <h2 className="text-xl font-black text-white italic mb-2 uppercase tracking-tight">Kệ sách hiện đang trống trải...</h2>
             <p className="text-gray-600 font-bold text-xs uppercase tracking-widest max-w-xs leading-relaxed mb-10">
                Bạn chưa theo dõi bộ truyện nào. Hãy bắt đầu hành trình khám phá thế giới manga đầy màu sắc ngay nhé!
             </p>
             <Link href="/manga" className="px-10 py-4 bg-gradient-to-r from-[#2e7d32] to-[#4caf50] text-[#0a0c0a] rounded-2xl font-black text-[10px] uppercase tracking-widest hover:brightness-110 hover:scale-105 transition-all shadow-xl shadow-[#4caf50]/10">
                Tìm truyện để theo dõi 🚀
             </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 sm:gap-8">
            {followedMangas.map((manga) => (
              <div key={manga.id} className="relative group">
                <Link 
                  href={`/manga/${manga.id}`}
                  className="block bg-[#141814]/40 backdrop-blur-sm border border-white/5 hover:border-[#4caf50]/30 rounded-[32px] overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_30px_60px_rgba(0,0,0,0.5)]"
                >
                  <div className="aspect-[2/3] relative overflow-hidden">
                    <img 
                      src={optimizeImage(manga.cover_image, 400) || 'https://via.placeholder.com/300x450?text=No+Cover'} 
                      alt={manga.title}
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c0a] via-[#0a0c0a]/40 to-transparent"></div>
                    
                    {/* Status Badge */}
                    <div className="absolute top-3 left-3">
                        <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest backdrop-blur-md border ${manga.status === 'completed' ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' : 'bg-[#4caf50]/20 border-[#4caf50]/30 text-[#4caf50]'}`}>
                            {manga.status === 'completed' ? 'Đã xong' : 'Đang ra'}
                        </span>
                    </div>

                    {manga.latestChapter && (
                      <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
                         <span className="bg-[#4caf50] text-[#141814] text-[9px] font-black px-2.5 py-1 rounded-lg shadow-xl shadow-[#4caf50]/20">
                           CHAP {manga.latestChapter.chapter_number}
                         </span>
                         <span className="text-[9px] font-black text-white/50 bg-black/40 px-2 py-1 rounded-lg border border-white/5">
                            NEW
                         </span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 pt-4 pb-6">
                    <h3 className="font-black text-[13px] line-clamp-2 leading-tight group-hover:text-[#4caf50] transition-colors h-8 mb-1 uppercase tracking-tight">{manga.title}</h3>
                  </div>
                </Link>

                {/* Nút Bỏ theo dõi (X) */}
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    unfollow(manga.id);
                  }}
                  className="absolute -top-2 -right-2 w-10 h-10 bg-black/80 hover:bg-red-500 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-all z-20 border border-white/10 shadow-2xl flex items-center justify-center transform hover:rotate-90 active:scale-90"
                  title="Ngừng theo dõi"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-24 pt-12 border-t border-white/5 text-center">
            <p className="text-gray-700 font-black text-[10px] uppercase tracking-[0.4em]">Shiroi Arika Library System v2.0</p>
        </div>
      </div>
    </div>
  );
}
