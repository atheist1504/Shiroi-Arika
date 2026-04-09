"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Comments from "@/components/Comments";
import { optimizeImage } from "@/lib/cloudinary";
import { MangaDetailSkeleton } from "@/components/ui/Skeleton";

export default function MangaClient({ mangaId, initialManga, initialChapters }) {
  const router = useRouter();

  const [manga, setManga] = useState(initialManga);
  const [chapters, setChapters] = useState(initialChapters);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isFollowed, setIsFollowed] = useState(false);
  const [readChapters, setReadChapters] = useState([]);
  const [lastReadChapterId, setLastReadChapterId] = useState(null);
  const [viewCover, setViewCover] = useState(false);

  useEffect(() => {
    // ĐỒNG BỘ SESSION CHO QUẢN TRỊ VIÊN 🍀
    const checkSession = () => {
      const storedUser = localStorage.getItem('shiroi_user');
      if (storedUser) setUser(JSON.parse(storedUser));
    };
    checkSession();
    window.addEventListener('storage', checkSession);

    // Luôn bóc tách dữ liệu mới nhất từ server để tránh cache ảnh cũ 🍀
    fetchMangaDetails();
    checkFollowStatus();
    loadReadHistory();

    return () => window.removeEventListener('storage', checkSession);
  }, [mangaId]);

  const loadReadHistory = () => {
    const read = JSON.parse(localStorage.getItem('shiroi_read_chapters') || '[]');
    setReadChapters(read);

    const history = JSON.parse(localStorage.getItem('shiroi_history') || '{}');
    if (history[mangaId]) {
      setLastReadChapterId(history[mangaId]);
    }
  };

  const checkFollowStatus = async () => {
    // 1. Kiểm tra Local trước cho nhanh ⚡
    const followed = JSON.parse(localStorage.getItem('shiroi_followed') || '[]');
    const isLocalFollowed = followed.includes(mangaId);
    
    if (user && user.id) {
       // 2. Chế độ có đăng nhập: Đồng bộ với Database ☁️
       try {
         const { data, error } = await supabase
           .from('shiroi_follows')
           .select('id')
           .eq('user_id', user.id)
           .eq('manga_id', mangaId)
           .maybeSingle();
         
         if (data) {
           setIsFollowed(true);
           // Cập nhật ngược lại local nếu chưa có
           if (!isLocalFollowed) {
             followed.push(mangaId);
             localStorage.setItem('shiroi_followed', JSON.stringify(followed));
           }
         } else {
           setIsFollowed(false);
           // Nếu DB báo chưa follow mà local báo có -> Xóa local để đồng bộ
           if (isLocalFollowed) {
              const updated = followed.filter(id => id !== mangaId);
              localStorage.setItem('shiroi_followed', JSON.stringify(updated));
           }
         }
       } catch (err) {
         console.error("Lỗi đồng bộ follow:", err);
         setIsFollowed(isLocalFollowed);
       }
    } else {
      setIsFollowed(isLocalFollowed);
    }
  };

  const toggleFollow = async () => {
    let followed = JSON.parse(localStorage.getItem('shiroi_followed') || '[]');
    const currentlyFollowed = followed.includes(mangaId);
    let nextState = !currentlyFollowed;

    // A. Cập nhật LOCAL trước để tạo cảm giác phản hồi tức thì 🚀
    if (currentlyFollowed) {
      followed = followed.filter(id => id !== mangaId);
    } else {
      followed.push(mangaId);
    }
    localStorage.setItem('shiroi_followed', JSON.stringify(followed));
    setIsFollowed(nextState);

    // B. Nếu có ĐĂNG NHẬP -> Đồng bộ lên CLOUD ☁️
    if (user && user.id) {
       try {
         if (nextState) {
           await supabase.from('shiroi_follows').insert({ user_id: user.id, manga_id: mangaId });
         } else {
           await supabase.from('shiroi_follows').delete().eq('user_id', user.id).eq('manga_id', mangaId);
         }
       } catch (err) {
         console.error("Lỗi đồng bộ Database:", err);
       }
    }
  };

  const fetchMangaDetails = async () => {
    try {
      setLoading(true);
      const { data: mangaData, error: mangaError } = await supabase
        .from("mangas")
        .select("*")
        .eq("id", mangaId)
        .single();

      if (mangaError) throw mangaError;
      setManga(mangaData);

      const { data: chaptersData, error: chaptersError } = await supabase
        .from("chapters")
        .select("*, pages(*)")
        .eq("manga_id", mangaId)
        .order("chapter_number", { ascending: false });

      if (chaptersError) throw chaptersError;
      setChapters(chaptersData);
    } catch (error) {
      console.error("Lỗi khi tải chi tiết truyện:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0c0a] pt-24 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <MangaDetailSkeleton />
        </div>
      </div>
    );
  }

  if (!manga) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0c0a] text-white">
        <svg className="w-20 h-20 text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <h1 className="text-2xl font-bold mb-4">Không tìm thấy mã truyện phù hợp</h1>
        <button onClick={() => router.push('/')} className="px-6 py-2 bg-[#1a1f1a] border border-[#2a332a] text-gray-300 rounded-lg hover:border-[#4caf50] hover:text-white transition-all">Về Trang Chủ</button>
      </div>
    );
  }

  // Cấu hình JSON-LD cho Google (Manga Series)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BookSeries",
    "name": manga.title,
    "description": manga.description || "Website này đánh giá cao sự bí ẩn. Rất tiếc hiện chưa có mô tả nào cho tựa truyện này cả.",
    "image": manga.cover_image,
    "url": `https://shiroiarika.vercel.app/manga/${mangaId}`,
    "genre": (manga.genres || []).join(", "),
    "author": manga.author || "Khuyết danh",
    "numberOfEpisodes": chapters.length,
  };

  return (
    <div className="bg-[#0a0c0a] text-gray-200 font-sans pb-10 selection:bg-[#4caf50] selection:text-white">
      {/* Inject JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      {/* Header điều hướng Trở Về */}
      <div className="absolute top-4 left-4 sm:left-8 z-50">
        <Link 
          href="/" 
          className="flex items-center space-x-2 bg-black/40 backdrop-blur-md text-white px-5 py-2.5 rounded-full border border-[rgba(255,255,255,0.1)] hover:bg-black/80 hover:scale-105 transition-all shadow-lg"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          <span className="font-bold text-sm tracking-wide uppercase">Trang Chủ</span>
        </Link>
      </div>

      {/* Background Banner */}
      <div className="relative w-full h-[350px] md:h-[450px] overflow-hidden">
        {manga.cover_image && (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-30 transform scale-110" 
            style={{ backgroundImage: `url(${optimizeImage(manga.cover_image, 800)})`, filter: 'blur(20px)' }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c0a] via-[#0a0c0a]/60 to-transparent" />
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative -mt-[120px] md:-mt-[160px] z-10 transition-all duration-700">
        
        {/* THANH CÔNG CỤ QUẢN TRỊ VIÊN 🍀 (Full Width) */}
        {(user?.username?.toLowerCase().includes('admin') || user?.display_name?.toLowerCase().includes('quản trị')) && (
           <div className="flex flex-wrap items-center gap-3 mb-10 p-5 bg-[#141814]/80 backdrop-blur-3xl border border-[#4caf50]/30 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-fade-in relative overflow-hidden group/admin">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#4caf50]/30 to-transparent"></div>
              <div className="flex items-center gap-2 pr-5 border-r border-white/5 mr-1">
                 <span className="text-[11px] font-black text-[#4caf50] uppercase tracking-[0.2em] leading-none">BẢN QUẢN TRỊ</span>
              </div>
              <Link 
                href={`/admin/create-manga?id=${mangaId}`}
                className="flex items-center gap-2 px-6 py-3 bg-[#141814] border border-white/5 text-gray-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:border-[#4caf50] hover:text-[#4caf50] transition-all shadow-inner"
              >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                 SỬA TRUYỆN
              </Link>
              <Link 
                href={`/admin/upload?mangaId=${mangaId}`}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#2e7d32] to-[#4caf50] text-[#0a0c0a] rounded-2xl font-black text-[10px] uppercase tracking-widest hover:brightness-110 hover:scale-[1.03] active:scale-95 transition-all shadow-xl shadow-[#4caf50]/10"
              >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                 ĐĂNG CHƯƠNG
              </Link>
           </div>
        )}

        <div className="flex flex-col md:flex-row gap-8 lg:gap-14 items-start">
          
          <div className="w-full md:w-[320px] flex flex-col items-center shrink-0">
            <div 
              onClick={() => setViewCover(true)}
              className="w-[70%] md:w-full aspect-[2/3] rounded-[40px] overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.9)] border-x-4 border-t-4 border-white/5 relative group bg-[#141814] cursor-zoom-in transform hover:-translate-y-2 transition-all duration-500"
            >
              {manga.cover_image ? (
                <>
                  <img src={optimizeImage(manga.cover_image, 600)} alt={manga.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                  <div className="absolute inset-x-0 bottom-0 top-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="p-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path></svg>
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 border-dashed border border-gray-700 p-4 text-center">
                    <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    Chưa có ảnh bìa
                </div>
              )}
            </div>
          </div>

          <div className="w-full md:flex-1 flex flex-col mt-4 md:mt-2">
            <h1 className="text-4xl md:text-6xl font-black text-white mb-8 leading-tight drop-shadow-2xl tracking-tighter">
              {manga.title}
            </h1>
            
            <div className="bg-[rgba(255,255,255,0.02)] backdrop-blur-xl border border-[rgba(255,255,255,0.05)] p-6 rounded-2xl mb-10 shadow-lg">
              <h2 className="text-lg font-bold text-[#4caf50] mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Tóm tắt cốt truyện
              </h2>
              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-[15px]">
                {manga.description || "Website này đánh giá cao sự bí ẩn. Rất tiếc hiện chưa có mô tả nào cho tựa truyện này cả."}
              </p>
            </div>

            <div className="flex flex-wrap gap-4 mb-10">
              {lastReadChapterId && (
                <Link
                  href={`/read/${lastReadChapterId}`}
                  className="px-8 py-3.5 bg-orange-500 text-white font-black rounded-xl hover:bg-orange-600 transition-all shadow-lg flex items-center gap-2"
                >
                  <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"></path></svg>
                  ĐỌC TIẾP
                </Link>
              )}

              {chapters.length > 0 ? (
                <Link
                  href={`/read/${chapters[chapters.length - 1].id}`}
                  className="px-8 py-3.5 bg-[#4caf50] text-[#141814] font-bold rounded-xl hover:bg-[#66bb6a] transition-all flex items-center gap-2"
                >
                  {lastReadChapterId ? 'ĐỌC TỪ ĐẦU' : 'ĐỌC NGAY'}
                </Link>
              ) : (
                <button className="px-8 py-3.5 bg-gray-600/30 text-gray-500 font-bold rounded-xl cursor-not-allowed">
                  CHƯA CÓ CHƯƠNG
                </button>
              )}

              <button 
                onClick={toggleFollow}
                className={`flex items-center gap-2 px-8 py-4 rounded-xl font-black transition-all transform hover:scale-105 border-2 ${
                  isFollowed 
                  ? 'bg-red-500/10 border-red-500 text-red-500' 
                  : 'bg-[#141814] border-[#2a332a] text-gray-400 hover:text-red-500 hover:border-red-500'
                }`}
              >
                <svg className={`w-5 h-5 ${isFollowed ? 'fill-current' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                {isFollowed ? 'ĐÃ THEO DÕI' : 'THEO DÕI'}
              </button>

              <button 
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert("Đã sao chép liên kết vào bộ nhớ tạm! 🍀");
                }}
                className="flex items-center gap-2 px-8 py-4 rounded-xl font-black bg-[#141814] border-2 border-[#2a332a] text-gray-400 hover:text-[#4caf50] hover:border-[#4caf50] transition-all transform hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                CHIA SẺ
              </button>
            </div>

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white tracking-wide flex items-center gap-3">
                <div className="w-1.5 h-6 bg-gradient-to-b from-[#4caf50] to-[#2e7d32] rounded-full"></div>
                Kho Chương ({chapters.length})
              </h2>
            </div>

            {chapters.length === 0 ? (
              <div className="bg-[#141814] text-center p-10 rounded-2xl text-gray-500 border-dashed border-2 border-gray-800">
                Chưa có chapter nào cho bộ truyện này.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {chapters.map((chap) => {
                  const isRead = readChapters.includes(chap.id);
                  return (
                     <div key={chap.id} className="flex gap-2 group">
                        <Link 
                          href={`/read/${chap.id}`} 
                          className={`flex-1 flex justify-between items-center p-4 bg-[rgba(20,24,20,0.6)] backdrop-blur-sm border border-[#2a332a] group-hover:border-[#4caf50] rounded-xl transition-all ${isRead ? 'opacity-50' : 'opacity-100'}`}
                        >
                          <div className="flex flex-col truncate">
                            <span className={`font-bold transition-colors truncate ${isRead ? 'text-gray-500 group-hover:text-gray-400' : 'text-gray-200 group-hover:text-[#4caf50]'}`}>
                              Chương {chap.chapter_number}
                            </span>
                            {chap.title && (
                              <span className="text-xs text-gray-400 mt-1 line-clamp-1">{chap.title}</span>
                            )}
                          </div>
                          <span className="shrink-0 text-xs text-gray-500 bg-black/50 px-2 py-1 rounded">
                            {new Date(chap.created_at).toLocaleDateString('vi-VN')}
                          </span>
                        </Link>
                        
                        {/* NÚT SỬA NHANH CHO ADMIN 🛠️ */}
                        {(user?.username?.toLowerCase().includes('admin') || user?.display_name?.toLowerCase().includes('quản trị')) && (
                           <Link 
                             href={`/admin/upload?mangaId=${mangaId}&chapterId=${chap.id}`}
                             className="flex items-center justify-center w-14 bg-[#1a1f1a] border border-white/5 rounded-xl text-gray-600 hover:text-amber-500 hover:border-amber-500/50 transition-all shadow-lg"
                             title="Sửa chương này"
                           >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                           </Link>
                        )}
                     </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5">
            <Comments mangaId={mangaId} />
        </div>
      </div>
      
      {/* Overlay Cover */}
      {viewCover && manga.cover_image && (
        <div 
          onClick={() => setViewCover(false)}
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <img 
            src={manga.cover_image} 
            alt={manga.title} 
            className="max-w-full max-h-[90vh] object-contain rounded shadow-2xl"
          />
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0a0c0a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2a332a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4caf50; }
      `}} />
    </div>
  );
}
