'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Comments from '@/components/Comments';
import { optimizeImage } from '@/lib/cloudinary';
import { XP_REWARDS } from '@/lib/xp';

export default function ReaderClient({ chapterId, initialChapter, initialManga, initialPages, initialSiblings }) {
  const router = useRouter();
  
  const [chapter] = useState(initialChapter);
  const [pages] = useState(initialPages);
  const [manga] = useState(initialManga);
  const [readingMode, setReadingMode] = useState('scroll'); 
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  
  const [prevChapterId, setPrevChapterId] = useState(null);
  const [nextChapterId, setNextChapterId] = useState(null);
  const [allChapters] = useState(initialSiblings || []); 
  
  const [showNav, setShowNav] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [xpToast, setXpToast] = useState(false); // THÔNG BÁO NHẬN XP 🍀
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState('dark'); // 'dark' | 'deep' | 'light'

  useEffect(() => {
    if (initialSiblings) {
        const idx = initialSiblings.findIndex(c => c.id === chapterId);
        setPrevChapterId(initialSiblings[idx - 1]?.id || null);
        setNextChapterId(initialSiblings[idx + 1]?.id || null);
    }
    
    // 💾 LƯU LỊCH SỬ ĐỌC (LỚP 1: LOCALSTORAGE)
    if (chapter) {
        const historyKey = 'shiroi_history';
        const history = JSON.parse(localStorage.getItem(historyKey) || '{}');
        history[chapter.manga_id] = chapterId;
        localStorage.setItem(historyKey, JSON.stringify(history));

        const readKey = 'shiroi_read_chapters';
        const read = JSON.parse(localStorage.getItem(readKey) || '[]');
        if (!read.includes(chapterId)) {
            read.push(chapterId);
            localStorage.setItem(readKey, JSON.stringify(read));
        }

        // 🚀 LƯU LỊCH SỬ ĐỌC (LỚP 2: SUPABASE - NẾU ĐÃ LOGIN)
        syncHistoryToDB();
    }

    if (manga?.default_reading_mode) setReadingMode(manga.default_reading_mode);
    
    // THƯỞNG XP KHI ĐỌC TRUYỆN
    giveReadXP();
  }, [chapterId]);

  const syncHistoryToDB = async () => {
    const raw = localStorage.getItem('shiroi_user');
    if (!raw) return;
    const user = JSON.parse(raw);
    
    try {
      // 1. Cập nhật "Lần đọc cuối" của bộ truyện (Upsert manga history)
      await supabase.from('shiroi_history').upsert({
        user_id: user.id, // ĐỊNH DANH GỐC 🛡️
        username: user.username, // Phụ trợ hiển thị
        manga_id: chapter.manga_id,
        chapter_id: chapterId,
        last_read_at: new Date().toISOString()
      }, { onConflict: 'user_id, manga_id' });

      // 2. Lưu chi tiết chương đã đọc (Insert if not exists)
      await supabase.from('shiroi_read_chapters').upsert({
        user_id: user.id, // ĐỊNH DANH GỐC 🛡️
        username: user.username, // Phụ trợ hiển thị
        chapter_id: chapterId,
        manga_id: chapter.manga_id,
        read_at: new Date().toISOString()
      }, { onConflict: 'user_id, chapter_id' });
    } catch (err) {
      console.error("Lỗi đồng bộ lịch sử:", err);
    }
  };

  const giveReadXP = async () => {
    const storedUser = localStorage.getItem('shiroi_user');
    if (!storedUser || !chapterId) return;

    const userData = JSON.parse(storedUser);
    const sessionKey = `xp_read_${chapterId}`;
    if (sessionStorage.getItem(sessionKey)) return;

    try {
      // 🍀 CHIẾN THUẬT AN TOÀN: Lấy dữ liệu mới nhất từ DB để tránh ghi đè sai điểm
      const { data: latestUser } = await supabase
        .from('shiroi_users')
        .select('xp')
        .eq('id', userData.id)
        .single();

      const newXP = (latestUser?.xp || 0) + XP_REWARDS.READ_CHAPTER;

      const { error } = await supabase
        .from('shiroi_users')
        .update({ xp: newXP })
        .eq('id', userData.id);

      if (!error) {
        const { data: updated } = await supabase.from('shiroi_users').select('*').eq('id', userData.id).single();
        if (updated) localStorage.setItem('shiroi_user', JSON.stringify(updated));
        sessionStorage.setItem(sessionKey, 'true');
        setXpToast(true); // HIỆN THÔNG BÁO THÀNH CÔNG ✨
        setTimeout(() => setXpToast(false), 4000);
        window.dispatchEvent(new Event('storage'));
      }
    } catch (err) {
      console.error("Lỗi cộng XP:", err);
    }
  };

  const lastScrollYRef = useRef(0);

  useEffect(() => {
    if (readingMode !== 'scroll') {
      setShowNav(true);
      return;
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const lastScrollY = lastScrollYRef.current;
      
      // Chỉ cập nhật state nếu thực sự cần thay đổi để tránh re-render thừa 🍀
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setShowNav(false);
      } else {
        setShowNav(true);
      }
      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [readingMode]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (readingMode === 'page') {
        if (e.key === 'ArrowLeft') setCurrentPageIndex(prev => Math.max(0, prev - 1));
        if (e.key === 'ArrowRight') {
            if (currentPageIndex < pages.length - 1) setCurrentPageIndex(prev => prev + 1);
            else goToNextChapter();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readingMode, currentPageIndex, pages.length]);

  const goToNextChapter = () => nextChapterId && router.push(`/read/${nextChapterId}`);
  const goToPrevChapter = () => prevChapterId && router.push(`/read/${prevChapterId}`);

  // Structured Data (Article/Chapter/Book)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Chapter",
    "name": `Chương ${chapter?.chapter_number} - ${manga?.title}`,
    "headline": `${manga?.title} - Chương ${chapter?.chapter_number}`,
    "url": `https://shiroiarika.vercel.app/read/${chapterId}`,
    "isPartOf": {
       "@type": "BookSeries",
       "name": manga?.title,
       "url": `https://shiroiarika.vercel.app/manga/${manga?.id}`
    }
  };

  return (
    <div id="shiroi-reader-mode" className={`min-h-screen transition-colors duration-500 overflow-x-hidden ${theme === 'light' ? 'bg-white text-black' : 'bg-[#0a0c0a] text-gray-300'}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <style dangerouslySetInnerHTML={{ __html: `
        nav.sticky-nav, footer.footer { display: none !important; }
        .main-content { padding: 0 !important; margin: 0 !important; }
        #shiroi-reader-mode { width: 100%; min-height: 100vh; position: relative; z-index: 1; }
      `}} />

      <div className={`fixed top-0 left-0 right-0 z-[20000] border-b px-4 py-2 flex items-center justify-between transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-transform ${showNav ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'} ${theme === 'light' ? 'bg-white border-black/5 shadow-sm' : 'bg-[#0a0c0a]/95 border-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.5)]'}`}>
        <div className="flex items-center gap-3 flex-1 overflow-hidden">
            <Link href={`/manga/${chapter?.manga_id}`} className="text-gray-500 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg>
            </Link>
            <div className="hidden sm:flex flex-col truncate">
                <h2 className="text-[10px] font-black uppercase tracking-tighter truncate max-w-[150px]">{manga?.title}</h2>
                <span className="text-[9px] text-[#4caf50] font-bold">Chương {chapter?.chapter_number}</span>
            </div>
        </div>

        <div className={`flex items-center gap-1 p-1 rounded-lg border mx-2 transition-colors ${theme === 'light' ? 'bg-gray-100 border-black/5' : 'bg-black/40 border-white/5'}`}>
            <button onClick={goToPrevChapter} disabled={!prevChapterId} className={`p-2 ${prevChapterId ? (theme === 'light' ? 'text-black hover:text-gray-600' : 'text-gray-300 hover:text-white') : (theme === 'light' ? 'text-gray-300' : 'text-gray-800')}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <select value={chapterId} onChange={(e) => router.push(`/read/${e.target.value}`)} className="bg-transparent text-[10px] font-black text-[#4caf50] uppercase tracking-widest outline-none appearance-none cursor-pointer px-1">
              {allChapters.map(c => <option key={c.id} value={c.id} className={theme === 'light' ? 'bg-white text-black' : 'bg-[#141814]'}>Chương {c.chapter_number}</option>)}
            </select>
            <button onClick={goToNextChapter} disabled={!nextChapterId} className={`p-2 ${nextChapterId ? (theme === 'light' ? 'text-black hover:text-gray-600' : 'text-gray-300 hover:text-white') : (theme === 'light' ? 'text-gray-300' : 'text-gray-800')}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
            </button>
        </div>

        <div className="flex-1 flex justify-end items-center gap-3">
            <div className={`px-2 py-1 ${readingMode === 'scroll' ? 'bg-[#4caf50]/10 text-[#4caf50]' : (theme === 'light' ? 'bg-black text-white' : 'bg-amber-500/10 text-amber-500')} rounded border border-current/20 text-[9px] font-black uppercase tracking-tighter`}>
               {readingMode === 'scroll' ? 'CUỘN ĐỌC' : `TRANG ${currentPageIndex + 1}/${pages.length}`}
            </div>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg border transition-all ${showSettings ? 'bg-[#4caf50] text-[#0a0c0a] border-[#4caf50]' : (theme === 'light' ? 'bg-white text-black border-black/10 hover:bg-gray-50' : 'bg-black/40 text-gray-400 border-white/5 hover:border-white/20')}`}
            >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            </button>
        </div>
      </div>

      {/* SETTINGS POPUP ⚙️ */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className={`fixed top-16 right-4 z-[20001] w-64 backdrop-blur-2xl border rounded-2xl p-4 shadow-2xl ${theme === 'light' ? 'bg-white/95 border-black/10' : 'bg-[#1c221c]/95 border-white/5'}`}
          >
             <h3 className="text-[10px] font-black text-[#4caf50] uppercase tracking-widest mb-4">Cài đặt đọc truyện</h3>
             <div className="space-y-4">
                <div className="space-y-2">
                   <label className="text-[9px] text-gray-500 font-bold uppercase">Chế độ đọc</label>
                   <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setReadingMode('scroll')} className={`py-2 text-[8px] font-black rounded-lg border transition-all ${readingMode === 'scroll' ? 'bg-[#4caf50] text-[#0a0c0a] border-[#4caf50]' : (theme === 'light' ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-black/20 text-gray-400 border-white/5')}`}>CUỘN DỌC</button>
                      <button onClick={() => setReadingMode('page')} className={`py-2 text-[8px] font-black rounded-lg border transition-all ${readingMode === 'page' ? 'bg-[#4caf50] text-[#0a0c0a] border-[#4caf50]' : (theme === 'light' ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-black/20 text-gray-400 border-white/5')}`}>LẬT TRANG</button>
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[9px] text-gray-500 font-bold uppercase">Màu phong nền</label>
                   <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setTheme('dark')} className={`py-2 text-[8px] font-black rounded-lg border transition-all ${theme === 'dark' ? 'bg-[#4caf50] text-[#0a0c0a] border-[#4caf50]' : 'bg-black/20 text-gray-400 border-white/5'}`}>ĐEN TUYỀN</button>
                      <button onClick={() => setTheme('deep')} className={`py-2 text-[8px] font-black rounded-lg border transition-all ${theme === 'deep' ? 'bg-[#141814] text-white border-[#2a332a]' : 'bg-black/20 text-gray-400 border-white/5'}`}>XÁM ĐẬM</button>
                      <button onClick={() => setTheme('light')} className={`py-2 text-[8px] font-black rounded-lg border transition-all col-span-2 ${theme === 'light' ? 'bg-black text-white border-black' : (theme === 'light' ? 'bg-white text-black' : 'bg-white text-black border-white shadow-xl')}`}>NỀN TRẮNG</button>
                   </div>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* XP EARNED TOAST ✨ */}
      <AnimatePresence>
        {xpToast && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[30000] bg-[#4caf50] text-[#0a0c0a] px-8 py-4 rounded-3xl font-black uppercase tracking-widest shadow-[0_20px_50px_rgba(76,175,80,0.4)] flex items-center gap-3 border-2 border-white/20"
          >
             <span className="text-xl animate-bounce">💎</span>
             KHO THÀNH TỰU +20 XP !
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`max-w-5xl mx-auto flex flex-col items-center pt-20 transition-colors duration-500 ${theme === 'deep' ? 'bg-[#0e110e]' : theme === 'light' ? 'bg-white text-black' : 'bg-[#0a0c0a]'} ${readingMode === 'page' ? 'h-screen justify-center' : ''}`}>
        {readingMode === 'scroll' && (
          <div className="w-full">
            {/* 📖 PHẦN 1: TRANG TRUYỆN (DÍNH LIỀN 🚀) */}
            <div className={`flex flex-col items-center w-full leading-[0] ${theme === 'light' ? 'bg-white' : 'shadow-2xl bg-black'}`}>
              {pages.map((page) => (
                <img 
                  key={page.id} 
                  src={optimizeImage(page.image_url, 1200)} 
                  alt="" 
                  className="w-full h-auto block m-0 p-0" 
                  loading="lazy" 
                />
              ))}
            </div>

            <div className="space-y-10 mt-10">
               {/* ⏭️ PHẦN 2: CHUYỂN CHƯƠNG KẾ TIẾP */}
               <div className={`py-12 w-full flex flex-col items-center gap-6 border-t ${theme === 'light' ? 'bg-gray-50 border-black/5' : 'bg-[#0a0c0a] border-white/5'}`}>
                   <span className={`text-[10px] font-black uppercase tracking-[0.4em] ${theme === 'light' ? 'text-gray-400' : 'text-gray-700'}`}>ĐÃ HẾT CHƯƠNG {chapter?.chapter_number}</span>
                   <button 
                     onClick={goToNextChapter} 
                     className="px-16 py-5 bg-[#1a221a] text-[#4caf50] hover:bg-[#4caf50] hover:text-[#0a0c0a] border border-[#4caf50]/30 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl hover:scale-105 active:scale-95"
                   >
                       ĐỌC TIẾP CHƯƠNG SAU 🚀
                   </button>
               </div>

               {/* 💬 PHẦN 3: THẢO LUẬN SHIROI */}
               <div className={`w-full pb-40 ${theme === 'light' ? 'bg-white text-black' : ''}`}>
                   <div className={`h-px mb-12 ${theme === 'light' ? 'bg-gray-200' : 'bg-gradient-to-r from-transparent via-white/5 to-transparent'}`}></div>
                   <Comments chapterId={chapterId} mangaId={chapter?.manga_id} />
               </div>
            </div>
          </div>
        )}

        {readingMode === 'page' && (
          <div className="relative w-full h-full flex flex-col items-center justify-center p-2 pt-14">
            <div className="relative flex items-center justify-center max-h-[calc(100vh-100px)]">
                <img src={optimizeImage(pages[currentPageIndex]?.image_url, 1600)} alt="" className="max-w-full max-h-[calc(100vh-120px)] object-contain select-none shadow-2xl rounded-sm" />
            </div>
            <div onClick={() => currentPageIndex > 0 && setCurrentPageIndex(c => c - 1)} className="fixed top-20 bottom-0 left-0 w-1/4 z-[10001] cursor-pointer"></div>
            <div onClick={() => currentPageIndex < pages.length - 1 ? setCurrentPageIndex(c => c + 1) : goToNextChapter()} className="fixed top-20 bottom-0 right-0 w-1/4 z-[10001] cursor-pointer"></div>
          </div>
        )}
      </div>

      {/* BACK TO TOP 🍀 */}
      {readingMode === 'scroll' && lastScrollY > 1000 && (
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-10 right-10 z-[10000] p-4 bg-[#4caf50] text-[#0a0c0a] rounded-2xl shadow-2xl hover:scale-110 active:scale-95 transition-all animate-fade-in"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7"/></svg>
        </button>
      )}
    </div>
  );
}
