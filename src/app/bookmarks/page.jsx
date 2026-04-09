'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

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
    <div className="min-h-screen bg-[#0a0c0a] text-white p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-2 h-8 bg-pink-500 rounded-full"></div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Truyện Theo Dõi ❤️</h1>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-[#141814] rounded-xl border border-[#2a332a]"></div>
            ))}
          </div>
        ) : followedMangas.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] border border-dashed border-[#2a332a] rounded-3xl bg-black/20 p-10">
             <svg className="w-16 h-16 text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
             <p className="text-gray-500 font-medium">Bạn chưa theo dõi bộ truyện nào.</p>
             <Link href="/manga" className="mt-6 px-8 py-3 bg-[#141814] border border-[#4caf50] text-[#4caf50] rounded-xl hover:bg-[#4caf50] hover:text-white transition-all font-bold">
                Khám phá truyện mới
             </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {followedMangas.map((manga) => (
              <div key={manga.id} className="relative group">
                <Link 
                  href={`/manga/${manga.id}`}
                  className="block bg-[#141814] border border-[#2a332a] hover:border-[#4caf50] rounded-xl overflow-hidden transition-all hover:-translate-y-1"
                >
                  <div className="aspect-[2/3] relative overflow-hidden">
                    <img 
                      src={manga.cover_image || 'https://via.placeholder.com/300x450?text=No+Cover'} 
                      alt={manga.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                    
                    {manga.latestChapter && (
                      <div className="absolute bottom-2 left-2">
                         <span className="bg-[#4caf50] text-[#141814] text-[10px] font-black px-2 py-0.5 rounded shadow-lg">
                           CHAP {manga.latestChapter.chapter_number}
                         </span>
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <h3 className="font-bold text-sm line-clamp-1 group-hover:text-[#4caf50] transition-colors">{manga.title}</h3>
                  </div>
                </Link>

                {/* Nút Bỏ theo dõi (X) */}
                <button 
                  onClick={() => unfollow(manga.id)}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10 border border-white/10"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
