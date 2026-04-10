'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function HistoryPage() {
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistoryData();
  }, []);

  const fetchHistoryData = async () => {
    try {
      setLoading(true);
      const storedUser = localStorage.getItem('shiroi_user');
      
      if (storedUser) {
        const user = JSON.parse(storedUser);
        // Lớp 1: Lấy từ Cloud (Supabase) - Sắp xếp theo thời gian đọc mới nhất
        const { data: cloudHistory, error } = await supabase
          .from('shiroi_history')
          .select(`
            last_read_at,
            manga:mangas(*),
            chapter:chapters(*)
          `)
          .eq('user_id', user.id)
          .order('last_read_at', { ascending: false });

        if (!error && cloudHistory) {
          const formatted = cloudHistory.map(item => ({
            ...item.manga,
            lastReadChapter: item.chapter,
            last_read_at: item.last_read_at
          }));
          setHistoryItems(formatted);
          return;
        }
      }

      // Lớp 2: Fallback localStorage (Dành cho khách hoặc khi Cloud lỗi)
      const history = JSON.parse(localStorage.getItem('shiroi_history') || '{}');
      const mangaIds = Object.keys(history);

      if (mangaIds.length === 0) {
        setHistoryItems([]);
        return;
      }

      const { data: mangas, error: mError } = await supabase
        .from('mangas')
        .select('*')
        .in('id', mangaIds);

      if (mError) throw mError;

      const chapterIds = Object.values(history);
      const { data: chapters } = await supabase
        .from('chapters')
        .select('id, chapter_number, manga_id')
        .in('id', chapterIds);

      const combined = mangas.map(manga => {
        const lastChapter = chapters?.find(c => c.manga_id === manga.id);
        return {
          ...manga,
          lastReadChapter: lastChapter
        };
      });

      setHistoryItems(combined);
    } catch (err) {
      console.error("Lỗi tải lịch sử:", err);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    if (confirm("Bạn có chắc chắn muốn xoá toàn bộ lịch sử đọc truyện không? 🍀")) {
        const storedUser = localStorage.getItem('shiroi_user');
        
        if (storedUser) {
            const user = JSON.parse(storedUser);
            // Xoá trên Cloud
            await supabase
                .from('shiroi_history')
                .delete()
                .eq('user_id', user.id);

            await supabase
                .from('shiroi_read_chapters')
                .delete()
                .eq('user_id', user.id);
        }

        localStorage.removeItem('shiroi_history');
        localStorage.removeItem('shiroi_read_chapters');
        setHistoryItems([]);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0c0a]">
        <div className="w-12 h-12 border-4 border-[#2a332a] border-t-[#4caf50] rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0c0a] text-gray-200 p-6 pt-20">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex items-center justify-between mb-12">
            <div>
                <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
                    <span className="w-1.5 h-10 bg-gradient-to-b from-[#4caf50] to-[#2e7d32] rounded-full"></span>
                    Lịch sử đọc truyện
                </h1>
                <p className="text-gray-500 text-sm mt-2 font-medium">Nơi lưu giữ những chuyến hành trình của bạn ☘️</p>
            </div>
            
            {historyItems.length > 0 && (
                <button 
                  onClick={clearHistory}
                  className="px-6 py-2.5 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-black rounded-xl hover:bg-red-500 hover:text-white transition-all active:scale-95 shadow-lg shadow-red-500/10"
                >
                  XOÁ TẤT CẢ
                </button>
            )}
        </div>

        {historyItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 bg-[#141814]/30 rounded-3xl border border-dashed border-[#2a332a]">
              <div className="w-20 h-20 bg-[#141814] rounded-full flex items-center justify-center mb-6 border border-[#2a332a]/50">
                <svg className="w-10 h-10 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <h2 className="text-xl font-bold text-gray-400 mb-2">Lịch sử của bạn đang trống trơn...</h2>
              <p className="text-gray-600 mb-8 max-w-xs text-center">Hãy bắt đầu chuyến hành trình đầu tiên ngay bây giờ!</p>
              <Link href="/manga" className="px-10 py-4 bg-[#4caf50] text-[#0a0c0a] font-black rounded-2xl hover:scale-105 transition-all shadow-xl shadow-[#4caf50]/20">KHÁM PHÁ NGAY 🚀</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {historyItems.map((item) => (
              <div key={item.id} className="group flex flex-col relative animate-fade-in">
                  <Link href={`/read/${item.lastReadChapter?.id || ''}`} className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-white/5 shadow-2xl group-hover:scale-105 transition-all duration-500 bg-[#141814]">
                    <img 
                      src={item.cover_image} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:opacity-60 transition-opacity"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black via-black/80 to-transparent">
                        <div className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></span>
                            Đang đọc {item.lastReadChapter?.chapter_number}
                        </div>
                        <h3 className="text-xs font-bold text-white line-clamp-1">{item.title}</h3>
                    </div>
                  </Link>

                  <Link 
                    href={`/manga/${item.id}`}
                    className="mt-3 text-[9px] font-black text-gray-600 hover:text-[#4caf50] transition-colors flex items-center gap-1 self-start"
                  >
                    Xem chi tiết
                    <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
                  </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
