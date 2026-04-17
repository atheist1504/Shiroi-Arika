'use client';

import { useState, useEffect, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Comments from '@/components/Comments';
import { optimizeImage, fixR2Url } from '@/lib/cloudinary';
import { XP_REWARDS, recordXpLog } from '@/lib/xp';
import { submitReportAction } from '@/lib/actions';

// 🚀 COMPONENT TỐI ƯU: Đóng băng danh sách trang để tránh re-render thừa khi thanh Nav ẩn/hiện
const MangaPages = memo(({ pages, theme, optimizeImage, fixR2Url }) => {
  return (
    <div className={`flex flex-col items-center w-full bg-[var(--bg-reader)] ${theme === 'light' ? '' : 'shadow-2xl'}`}>
      {pages.map((page, index) => (
        <img 
          key={page.id} 
          src={optimizeImage(fixR2Url(page.image_url), 1200)} 
          alt={`Trang ${index + 1}`} 
          className="w-full h-auto block m-[-0.5px] p-0 will-change-transform" 
          loading="lazy" 
          decoding="async"
          onError={(e) => {
            const currentSrc = e.currentTarget.src;
            const raw = fixR2Url(page.image_url);
            
            console.error(`❌ [Reader] Lỗi tải trang ${index + 1}:`, {
                pageId: page.id,
                attemptedUrl: currentSrc,
                rawUrl: raw
            });

            // 🛡️ RECOVERY: Nếu Cloudinary lỗi hoặc gặp lỗi CORS, thử quay về ảnh R2 gốc và gỡ bỏ crossorigin
            if (currentSrc !== raw) {
                console.log(`🔄 [Reader] Đang thử tải lại trang ${index + 1} từ nguồn gốc R2...`);
                e.currentTarget.removeAttribute('crossOrigin');
                e.currentTarget.src = raw;
            }
          }}
        />
      ))}
    </div>
  );
});

MangaPages.displayName = 'MangaPages';

export default function ReaderClient({ chapterId, initialChapter, initialManga, initialPages, initialSiblings }) {
  const router = useRouter();
  
  const [chapter] = useState(initialChapter);
  const [pages] = useState(initialPages);
  const [manga] = useState(initialManga);
  const [readingMode, setReadingModeState] = useState('scroll'); 
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  
  const [prevChapterId, setPrevChapterId] = useState(null);
  const [nextChapterId, setNextChapterId] = useState(null);
  const [nextChapterPages, setNextChapterPages] = useState([]); // 🚀 LƯU TRANG CHƯƠNG SAU
  const [hasPreloaded, setHasPreloaded] = useState(false); // 🚀 ĐÁNH DẤU ĐÃ TẢI XONG
  const [allChapters] = useState(initialSiblings || []); 
  
  const endOfChapterRef = useRef(null); // Ref để theo dõi cuối chương
  const [showNav, setShowNav] = useState(true);
  const [lastScrollYState, setLastScrollYState] = useState(0); // Dùng cho UI (Back to Top)
  const [xpToast, setXpToast] = useState(false); 
  const [showSettings, setShowSettings] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [chapterSearchTerm, setChapterSearchTerm] = useState('');
  const [reportType, setReportType] = useState('image_broken');
  const [reportDescription, setReportDescription] = useState('');
  const [reportStatus, setReportStatus] = useState(null); // { type: 'success' | 'error', text: string }
  const [theme, setThemeState] = useState('dark'); 

  // 🔄 ĐỒNG BỘ THEME & CHẾ ĐỘ ĐỌC VĨNH VIỄN (CHỈ TRONG READER) 🍀
  useEffect(() => {
    const savedTheme = localStorage.getItem('shiroi_reader_theme');
    const savedMode = localStorage.getItem('shiroi_reading_mode');
    if (savedMode) setReadingModeState(savedMode);
    if (savedTheme) setThemeState(savedTheme);
  }, []);

  // 🌩️ FETCH DỮ LIỆU CHƯƠNG SAU NGAY KHI VÀO TRANG 🍀
  useEffect(() => {
    if (!nextChapterId) return;
    
    const fetchNextPages = async () => {
      try {
        const { data, error } = await supabase
          .from('pages')
          .select('image_url')
          .eq('chapter_id', nextChapterId)
          .order('page_number', { ascending: true });
        
        if (!error && data && data.length > 0) {
           setNextChapterPages(data);
           console.log(`🚀 [Preload] Đã lấy được ${data.length} trang chương sau.`);
        } else if (error) {
           console.warn(`⚠️ [Preload] Không thể tải trước trang chương ${nextChapterId}:`, error.message);
        }
      } catch (err) {
        console.warn("Lỗi fetch preload:", err);
      }
    };
    fetchNextPages();
    setHasPreloaded(false); // Reset trạng thái preload cho chương mới
  }, [nextChapterId]);

  // 🎯 HÀM TẢI ẢNH VÀO CACHE TRÌNH DUYỆT 🚀
  const preloadNextChapterImages = () => {
    if (hasPreloaded || nextChapterPages.length === 0) return;
    
    console.log("🌩️ [Preload] Bắt đầu tải ảnh chương sau vào Cache...");
    nextChapterPages.forEach((page) => {
      const img = new Image();
      img.src = optimizeImage(fixR2Url(page.image_url), 1200);
    });
    setHasPreloaded(true);
  };

  // 💾 LƯU TRẠNG THÁI VĨNH VIỄN 🍀
  useEffect(() => {
    localStorage.setItem('shiroi_reading_mode', readingMode);
  }, [readingMode]);

  useEffect(() => {
    localStorage.setItem('shiroi_reader_theme', theme);
  }, [theme]);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
  };

  const setReadingMode = (newMode) => {
    setReadingModeState(newMode);
    localStorage.setItem('shiroi_reading_mode', newMode);
    if (manga?.id) {
        localStorage.setItem(`shiroi_reading_mode_${manga.id}`, newMode);
    }
  };

  useEffect(() => {
    if (initialSiblings) {
        const idx = initialSiblings.findIndex(c => c.id === chapterId);
        setPrevChapterId(initialSiblings[idx - 1]?.id || null);
        setNextChapterId(initialSiblings[idx + 1]?.id || null);
    }
    
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
        syncHistoryToDB();
    }

    if (manga?.id) {
        const mangaSpecificMode = localStorage.getItem(`shiroi_reading_mode_${manga.id}`);
        if (mangaSpecificMode) {
            setReadingModeState(mangaSpecificMode);
        } else if (manga?.default_reading_mode) {
            setReadingModeState(manga.default_reading_mode);
        } else {
            const globalMode = localStorage.getItem('shiroi_reading_mode');
            if (globalMode) setReadingModeState(globalMode);
        }
    }
    giveReadXP();
  }, [chapterId]);

  const syncHistoryToDB = async () => {
    const raw = localStorage.getItem('shiroi_user');
    if (!raw) return;
    const user = JSON.parse(raw);
    try {
      // 📍 CHỈ CẬP NHẬT LỊCH SỬ GẦN NHẤT (Không ghi vào bảng log vĩnh viễn ở đây) 🍀
      await supabase.from('shiroi_history').upsert({ user_id: user.id, username: user.username, manga_id: chapter.manga_id, chapter_id: chapterId, last_read_at: new Date().toISOString() }, { onConflict: 'user_id, manga_id' });
    } catch (err) { console.error("Lỗi đồng bộ lịch sử:", err); }
  };

  const giveReadXP = async () => {
    const storedUser = localStorage.getItem('shiroi_user');
    if (!storedUser || !chapterId) return;
    const userData = JSON.parse(storedUser);
    
    const sessionKey = `xp_read_${chapterId}`;
    if (sessionStorage.getItem(sessionKey)) return;

    try {
      const { addReadXPAction } = await import('@/lib/actions');
      const res = await addReadXPAction(chapter.manga_id, chapterId);
      
      if (res.success) {
        // Cập nhật lại UI thông qua localStorage 🍀
        localStorage.setItem('shiroi_user', JSON.stringify(res.user));
        
        sessionStorage.setItem(sessionKey, 'true');
        setXpToast(true);
        setTimeout(() => setXpToast(false), 4000);
        window.dispatchEvent(new Event('storage'));
      } else {
        // Nếu lỗi là do đã đọc rồi thì vẫn đánh dấu session
        if (res.error?.includes('Đã nhận thưởng')) {
           sessionStorage.setItem(sessionKey, 'true');
        }
        console.warn("XP Reward Note:", res.error);
      }
    } catch (err) { 
      console.error("Lỗi gọi Server Action XP:", err); 
    }
  };

  useEffect(() => {
    if (readingMode !== 'scroll' || !endOfChapterRef.current || nextChapterPages.length === 0 || hasPreloaded) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        preloadNextChapterImages();
      }
    }, { threshold: 0.1, rootMargin: '500px' }); // Kích hoạt sớm 500px trước khi chạm đáy

    observer.observe(endOfChapterRef.current);
    return () => observer.disconnect();
  }, [readingMode, nextChapterPages, hasPreloaded]);

  // 📖 TRIGGER PRELOAD CHO CHẾ ĐỘ LẬT TRANG
  useEffect(() => {
    if (readingMode === 'page' && currentPageIndex >= pages.length - 3 && pages.length > 0) {
      preloadNextChapterImages();
    }
  }, [readingMode, currentPageIndex, pages.length]);

  const lastScrollYRef = useRef(0);

  const showNavRef = useRef(true);
  const readingModeRef = useRef(readingMode);
  const touchStartY = useRef(0);
  const accumUpRef = useRef(0); // 🎢 Tích lũy khoảng cách lướt lên

  useEffect(() => {
    readingModeRef.current = readingMode;
  }, [readingMode]);

  // 🎢 LOGIC XỬ LÝ CỬ CHỈ (MODULE HÓA) 🚀
  const handleGesture = (delta, currentY) => {
    if (readingModeRef.current === 'page') {
      if (!showNavRef.current) {
        showNavRef.current = true;
        setShowNav(true);
      }
      return;
    }

    if (delta > 8 && currentY > 80) {
      accumUpRef.current = 0;
      if (showNavRef.current) {
        showNavRef.current = false;
        setShowNav(false);
      }
    } else if (delta < 0) {
      accumUpRef.current += Math.abs(delta);
      if (accumUpRef.current > 10 || currentY <= 30) {
        if (!showNavRef.current) {
          showNavRef.current = true;
          setShowNav(true);
        }
        accumUpRef.current = 0;
      }
    }
  };

  useEffect(() => {
    const onScroll = () => {
      const curY = window.scrollY;
      const delta = curY - lastScrollYRef.current;
      handleGesture(delta, curY);
      
      if (Math.abs(curY - lastScrollYState) > 300 || curY < 100) {
        setLastScrollYState(curY);
      }
      lastScrollYRef.current = curY;
    };

    const onWheel = (e) => handleGesture(e.deltaY, window.scrollY);

    const onTouchStart = (e) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e) => {
      const touchY = e.touches[0].clientY;
      const delta = touchStartY.current - touchY;
      handleGesture(delta, window.scrollY);
      touchStartY.current = touchY;
    };

    const onTap = (e) => {
      if (readingModeRef.current === 'page') {
          if (!showNavRef.current) {
              showNavRef.current = true;
              setShowNav(true);
          }
          return;
      }

      if (e.target.closest('button') || e.target.closest('a') || e.target.closest('select') || e.target.closest('input') || e.target.closest('textarea') || e.target.closest('.modal')) return;

      
      showNavRef.current = !showNavRef.current;
      setShowNav(showNavRef.current);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("click", onTap);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("click", onTap);
    };
  }, [lastScrollYState]);

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

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!reportType) return;

    setReportStatus({ type: 'info', text: 'ĐANG GỬI BÁO CÁO...' });
    const res = await submitReportAction({
      manga_id: manga.id,
      chapter_id: chapter.id,
      type: reportType,
      description: reportDescription
    });
    if (res.success) {
      setReportStatus({ type: 'success', text: 'CẢM ƠN ÔNG! BÁO CÁO ĐÃ ĐƯỢC GỬI TỚI ADMIN. 🍀' });
      setReportDescription('');
      setTimeout(() => {
        setShowReportModal(false);
        setReportStatus(null);
      }, 2000);
    } else {
      setReportStatus({ type: 'error', text: 'GỬI THẤT BẠI: ' + res.error });
    }
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const jsonLd = { "@context": "https://schema.org", "@type": "Chapter", "name": `Chương ${chapter?.chapter_number} - ${manga?.title}`, "headline": `${manga?.title} - Chương ${chapter?.chapter_number}`, "url": `https://shiroi-arika.vercel.app/read/${chapterId}`, "isPartOf": { "@type": "BookSeries", "name": manga?.title, "url": `https://shiroi-arika.vercel.app/manga/${manga?.id}` } };

  // 🏛️ PORTAL HELPER: Đảm bảo Modal luôn nằm ngoài mọi container bị giới hạn layout (fixed positioning fix) 🚀
  const Portal = ({ children }) => {
    if (!mounted || typeof document === 'undefined') return null;
    return createPortal(children, document.body);
  };

  return (
    <div id="shiroi-reader-mode" data-theme={theme} className="min-h-screen transition-colors duration-500 text-[var(--text-reader)]" style={{ backgroundColor: 'var(--bg-reader)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <style dangerouslySetInnerHTML={{ __html: `
        nav.sticky-nav, footer.footer { display: none !important; }
        .main-content { padding: 0 !important; margin: 0 !important; }
        #shiroi-reader-mode { width: 100%; min-height: 100vh; position: relative; z-index: 1; }
        
        /* 🎢 SCOPED PREMIUM SCROLLBAR - CHỈ DÀNH CHO TRANG ĐỌC 🚀 */
        ::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        ::-webkit-scrollbar-track {
          background: ${theme === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'};
        }
        ::-webkit-scrollbar-thumb {
          background: #4caf50 !important;
          border-radius: 20px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #66bb6a !important;
        }
      `}} />

      {/* THANH ĐIỀU HƯỚNG TỐI ƯU 🚀 */}
      <Portal>
        <div className={`fixed top-0 left-0 right-0 z-[20000] border-b pl-4 pr-8 sm:pr-10 py-2 flex items-center justify-between transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-transform ${showNav ? 'translate-y-0' : '-translate-y-full'} ${theme === 'light' ? 'bg-white border-black/5 shadow-sm' : (theme === 'deep' ? 'bg-[#141814]/95 border-white/5 shadow-lg' : 'bg-[#0a0c0a]/95 border-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.5)]')}`}>
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 overflow-hidden">
              <Link href="/" className={`p-1.5 sm:p-2 rounded-lg transition-colors flex-shrink-0 ${theme === 'light' ? 'text-gray-900 hover:bg-gray-100' : 'text-gray-400 hover:text-white hover:bg-white/5'}`} title="Trang chủ">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
              </Link>
              <div className="flex flex-col truncate min-w-0">
                  <Link href={`/manga/${chapter?.manga_id}`} className="hover:text-[#4caf50] transition-colors truncate">
                    <h1 className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight truncate" style={{ color: 'inherit' }}>{manga?.title}</h1>
                  </Link>
                  <span className="text-[7px] sm:text-[8px] font-bold opacity-70">Chương {chapter?.chapter_number}</span>
              </div>
          </div>

          <div className={`flex items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1 rounded-lg border mx-1 sm:mx-2 transition-colors ${theme === 'light' ? 'bg-gray-100 border-black/5' : 'bg-black/40 border-white/5'}`}>
              <button onClick={goToPrevChapter} disabled={!prevChapterId} className={`p-1.5 sm:p-2 ${prevChapterId ? (theme === 'light' ? 'text-black hover:text-gray-600' : 'text-gray-300 hover:text-white') : (theme === 'light' ? 'text-gray-300' : 'text-gray-800')}`}>
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
              </button>
              <button onClick={() => setShowChapterModal(true)} className="px-2 py-1 mx-0.5 sm:mx-1 rounded bg-[#4caf50]/10 text-[#4caf50] text-[9px] sm:text-[10px] font-black uppercase tracking-widest border border-[#4caf50]/20 hover:bg-[#4caf50]/20 transition-all flex items-center gap-1">
                 <span>C {chapter?.chapter_number}</span>
                 <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"/></svg>
              </button>
              <button onClick={goToNextChapter} disabled={!nextChapterId} className={`p-1.5 sm:p-2 ${nextChapterId ? (theme === 'light' ? 'text-black hover:text-gray-600' : 'text-gray-300 hover:text-white') : (theme === 'light' ? 'text-gray-300' : 'text-gray-800')}`}>
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
              </button>
          </div>

          <div className="flex items-center justify-end gap-1.5 sm:gap-3 flex-1">
              <button onClick={() => { setShowReportModal(true); setShowSettings(false); }} className={`px-2 py-1.5 sm:px-2.5 rounded border transition-all flex items-center gap-1 sm:gap-1.5 ${theme === 'light' ? 'bg-white text-red-500 border-black/10 hover:bg-red-50' : 'bg-red-500/10 text-red-400 border-red-500/20 hover:border-red-500/40 hover:bg-red-500/20 shadow-lg'}`} title="Báo lỗi chương">
                 <svg className="w-3.5 h-3.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                 <span className="text-[9px] font-black uppercase tracking-tighter whitespace-nowrap hidden xs:inline-block">Báo lỗi</span>
              </button>
              <div className={`px-1.5 py-1.5 sm:px-2 ${readingMode === 'scroll' ? 'bg-[#4caf50]/10 text-[#4caf50]' : (theme === 'light' ? 'bg-black text-white' : 'bg-amber-500/10 text-amber-500')} rounded border border-current/20 text-[8px] sm:text-[9px] font-black uppercase tracking-tighter`}>
                 {readingMode === 'scroll' ? (
                   <>
                     <span className="xs:hidden">SCROLL</span>
                     <span className="hidden xs:inline">CUỘN ĐỌC</span>
                   </>
                 ) : (
                   <>
                     <span className="xs:hidden">{currentPageIndex + 1}/{pages.length}</span>
                     <span className="hidden xs:inline">TRANG {currentPageIndex + 1}/{pages.length}</span>
                   </>
                 )}
              </div>
              <button onClick={() => { setShowSettings(!showSettings); setShowReportModal(false); }} className={`p-2 rounded-xl border transition-all flex-shrink-0 group ${showSettings ? 'bg-[#4caf50] text-[#0a0c0a] border-[#4caf50]' : (theme === 'light' ? 'bg-white text-black border-black/10 hover:bg-gray-50' : 'bg-black/40 text-gray-400 border-white/5 hover:border-white/20')}`} >
                 <svg className="w-4 h-4 transition-transform duration-500 group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              </button>
          </div>
        </div>
      </Portal>

      <AnimatePresence>
        {xpToast && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[30000] bg-[#4caf50] text-[#0a0c0a] px-8 py-4 rounded-3xl font-black uppercase tracking-widest shadow-[0_20px_50px_rgba(76,175,80,0.4)] flex items-center gap-3 border-2 border-white/20" >
             <span className="text-xl animate-bounce">💎</span> KHO THÀNH TỰU +20 XP !
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`max-w-5xl mx-auto flex flex-col items-center pt-[70px] md:pt-[80px] transition-colors duration-500 bg-[var(--bg-reader)] ${readingMode === 'page' ? 'h-screen justify-center' : ''}`}>
        
        {/* 💮 TRƯỜNG HỢP TRỐNG TRANG (Dành cho Guest/Lỗi Cache) */}
        {pages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-40 px-6 text-center space-y-6 animate-fade-in">
             <div className="relative">
                <span className="text-8xl opacity-10 grayscale">💮</span>
                <div className="absolute inset-0 flex items-center justify-center">
                   <svg className="w-12 h-12 text-gray-700 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                </div>
             </div>
             <div className="space-y-2">
                <h3 className="text-[#4caf50] font-black uppercase tracking-[0.3em] text-sm">Chưa có dữ liệu hình ảnh</h3>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest max-w-sm leading-relaxed">
                   Có thể chương này đang được xử lý hoặc bị lỗi Cache. <br/>Hãy thử nhấn nút bên dưới để làm mới dữ liệu từ Server.
                </p>
             </div>
             <button 
               onClick={() => window.location.reload()}
               className="px-8 py-3 bg-[#1a221a] border border-[#4caf50]/30 text-[#4caf50] rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#4caf50] hover:text-[#0a0c0a] transition-all shadow-xl active:scale-95"
             >
               Tải lại chương truyện 🚀
             </button>
          </div>
        )}

        {readingMode === 'scroll' && pages.length > 0 && (
          <div className="w-full">
            <MangaPages pages={pages} theme={theme} optimizeImage={optimizeImage} fixR2Url={fixR2Url} />
            <div className="space-y-10 mt-10">
               <div ref={endOfChapterRef} className={`py-12 w-full flex flex-col items-center gap-6 border-t ${theme === 'light' ? 'bg-gray-50 border-black/5' : 'bg-[#0a0c0a] border-white/5'}`}>
                   <span className={`text-[10px] font-black uppercase tracking-[0.4em] ${theme === 'light' ? 'text-gray-400' : 'text-gray-700'}`}>ĐÃ HẾT CHƯƠNG {chapter?.chapter_number}</span>
                   <div className="flex flex-col sm:flex-row gap-4 items-center">
                     <button onClick={() => setShowChapterModal(true)} className="px-12 py-5 bg-[#4caf50] text-[#0a0c0a] hover:bg-[#66bb6a] border border-[#4caf50]/30 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center gap-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>
                        MỞ DANH SÁCH CHƯƠNG 📖
                     </button>
                     {nextChapterId && (
                       <button onClick={goToNextChapter} className="px-12 py-5 bg-[#1a221a] text-[#4caf50] hover:bg-[#4caf50] hover:text-[#0a0c0a] border border-[#4caf50]/30 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl hover:scale-105 active:scale-95">
                          ĐỌC CHƯƠNG TIẾP THEO 🚀
                       </button>
                     )}
                   </div>
               </div>
               <div className={`w-full pb-40 ${theme === 'light' ? 'bg-white text-black' : ''}`}>
                   <div className={`h-px mb-12 ${theme === 'light' ? 'bg-gray-200' : 'bg-gradient-to-r from-transparent via-white/5 to-transparent'}`}></div>
                   <Comments chapterId={chapterId} mangaId={chapter?.manga_id} />
               </div>
            </div>
          </div>
        )}

        {readingMode === 'page' && (
          <div className="relative w-full h-full flex flex-col items-center justify-center p-0 md:p-2 pt-14">
            <div className="relative flex items-center justify-center max-h-[calc(100vh-100px)] w-full">
                <img 
                  src={optimizeImage(fixR2Url(pages[currentPageIndex]?.image_url), 1600)} 
                  alt={`Trang ${currentPageIndex + 1}`} 
                  className={`max-w-full max-h-[calc(100vh-120px)] object-contain select-none transition-all ${theme === 'light' ? '' : 'shadow-2xl rounded-sm'}`} 
                  onError={(e) => { 
                    const currentSrc = e.currentTarget.src;
                    const raw = fixR2Url(pages[currentPageIndex]?.image_url); 
                    
                    console.error(`❌ [Reader-Page] Lỗi trang ${currentPageIndex + 1}:`, {
                        url: currentSrc,
                        raw: raw
                    });

                    if (currentSrc !== raw) {
                        console.log("🔄 [Reader-Page] Thử lại nguồn gốc R2...");
                        e.currentTarget.removeAttribute('crossOrigin');
                        e.currentTarget.src = raw; 
                    }
                  }} 
                />
            </div>
            <div onClick={(e) => { e.stopPropagation(); currentPageIndex > 0 && setCurrentPageIndex(c => c - 1); }} className="fixed top-20 bottom-0 left-0 w-1/4 z-[10001] cursor-pointer"></div>
            <div onClick={(e) => { e.stopPropagation(); currentPageIndex < pages.length - 1 ? setCurrentPageIndex(c => c + 1) : goToNextChapter(); }} className="fixed top-20 bottom-0 right-0 w-1/4 z-[10001] cursor-pointer"></div>
          </div>
        )}
      </div>

      {readingMode === 'scroll' && lastScrollYState > 1000 && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-10 right-10 z-[10000] p-4 bg-[#4caf50] text-[#0a0c0a] rounded-2xl shadow-2xl hover:scale-110 active:scale-95 transition-all animate-fade-in" >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7"/></svg>
        </button>
      )}

      {/* 🚀 PORTAL-LIKE OVERLAYS (Moved to end for guaranteed fixed positioning) 🍀 */}
      <Portal>
        <AnimatePresence>
          {showSettings && (
            <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} className={`modal fixed top-16 right-4 z-[30001] w-64 backdrop-blur-2xl border rounded-2xl p-4 shadow-2xl ${theme === 'light' ? 'bg-white/95 border-black/10 text-black' : 'bg-[#1c221c]/95 border-white/5 text-white'}`} >

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
                        <button onClick={() => setTheme('deep')} className={`py-2 text-[8px] font-black rounded-lg border transition-all ${theme === 'deep' ? 'bg-[#4caf50] text-[#0a0c0a] border-[#4caf50]' : 'bg-black/20 text-gray-400 border-white/5'}`}>XÁM ĐẬM</button>
                         <button onClick={() => setTheme('light')} className={`py-2 text-[8px] font-black rounded-lg border transition-all col-span-2 ${theme === 'light' ? 'bg-[#4caf50] text-[#0a0c0a] border-[#4caf50]' : 'bg-white text-black border-white shadow-xl'}`}>NỀN TRẮNG</button>
                     </div>
                  </div>
               </div>
            </motion.div>
          )}

          {showReportModal && (
            <div className="fixed inset-0 z-[30002] flex items-center justify-center px-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowReportModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} className={`modal relative w-72 backdrop-blur-2xl border rounded-2xl p-5 shadow-2xl ${theme === 'light' ? 'bg-white/95 border-black/10' : 'bg-[#1c221c]/95 border-white/5'}`} >

                 <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-black text-red-500 uppercase tracking-widest">Báo lỗi chương truyện</h3>
                    <button onClick={() => { setShowReportModal(false); setReportStatus(null); }} className="text-gray-500 hover:text-white transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                 </div>
                 
                 {reportStatus ? (
                   <div className={`py-8 text-center space-y-3 animate-fade-in`}>
                      <div className={`text-2xl ${reportStatus.type === 'error' ? 'animate-shake' : 'animate-bounce'}`}>
                        {reportStatus.type === 'success' ? '✅' : (reportStatus.type === 'error' ? '❌' : '⏳')}
                      </div>
                      <p className={`text-[9px] font-black uppercase tracking-widest ${reportStatus.type === 'error' ? 'text-red-500' : (reportStatus.type === 'success' ? 'text-[#4caf50]' : 'text-amber-500')}`}>
                        {reportStatus.text}
                      </p>
                   </div>
                 ) : (
                   <form onSubmit={handleReportSubmit} className="space-y-4">
                      <div className="space-y-2">
                         <label className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">Loại lỗi</label>
                         <select 
                           value={reportType} 
                           onChange={(e) => setReportType(e.target.value)}
                           className={`w-full p-2.5 rounded-xl text-[10px] font-black uppercase tracking-tight outline-none border transition-all ${theme === 'light' ? 'bg-gray-100 border-black/5 text-black' : 'bg-black/40 border-white/5 text-gray-300 focus:border-red-500/50'}`}
                         >
                            <option value="image_broken">Ảnh bị hỏng / Không load được</option>
                            <option value="wrong_translation">Dịch sai / Lỗi chính tả</option>
                            <option value="wrong_order">Trình tự trang bị lộn xộn</option>
                            <option value="other">Lỗi khác...</option>
                         </select>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">Mô tả chi tiết</label>
                         <textarea 
                            value={reportDescription}
                            onChange={(e) => setReportDescription(e.target.value)}
                            placeholder="VD: Trang số 5 bị trắng xóa..."
                            className={`w-full p-3 rounded-xl text-[10px] font-medium h-20 outline-none border transition-all resize-none ${theme === 'light' ? 'bg-gray-100 border-black/5 text-black' : 'bg-black/40 border-white/5 text-gray-300 focus:border-red-500/50'}`}
                         />
                      </div>
                      <button 
                        type="submit"
                        className="w-full py-3 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg active:scale-95"
                      >
                        GỬI BÁO CÁO 🚀
                      </button>
                   </form>
                 )}
              </motion.div>
            </div>
          )}

          {showChapterModal && (
            <div className="fixed inset-0 z-[30003] flex items-center justify-center px-4">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowChapterModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
               <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }} className={`modal relative w-full max-w-lg max-h-[70vh] flex flex-col overflow-hidden border rounded-3xl shadow-2xl ${theme === 'light' ? 'bg-white border-black/10' : 'bg-[#1c221c] border-white/5'}`} >

                  <div className="p-4 border-b border-current/5 flex items-center justify-between">
                     <h3 className="text-[11px] font-black text-[#4caf50] uppercase tracking-widest">Chọn chương truyện</h3>
                     <button onClick={() => setShowChapterModal(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <svg className="w-5 h-5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                     </button>
                  </div>
                  
                  <div className="p-4">
                     <div className="relative group">
                        <input 
                          type="text" 
                          placeholder="Tìm chương (VD: 24)..." 
                          value={chapterSearchTerm}
                          onChange={(e) => setChapterSearchTerm(e.target.value)}
                          className={`w-full px-10 py-3 rounded-xl text-sm font-bold outline-none border transition-all ${theme === 'light' ? 'bg-gray-50 border-black/5 focus:border-[#4caf50]' : 'bg-black/40 border-white/5 focus:border-[#4caf50]'}`}
                        />
                        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 group-focus-within:opacity-100 group-focus-within:text-[#4caf50] transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        {chapterSearchTerm && (
                          <button onClick={() => setChapterSearchTerm('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full">
                             <svg className="w-3.5 h-3.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                          </button>
                        )}
                     </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2 min-h-0 reader-chapter-list">
                     <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {allChapters
                          .filter(c => c.chapter_number.toString().includes(chapterSearchTerm) || (c.title && c.title.toLowerCase().includes(chapterSearchTerm.toLowerCase())))
                          .map(c => (
                          <button 
                             key={c.id} 
                             onClick={() => { router.push(`/read/${c.id}`); setShowChapterModal(false); }}
                             className={`group relative flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${c.id === chapterId ? 'bg-[#4caf50] border-[#4caf50] text-[#0a0c0a]' : (theme === 'light' ? 'bg-gray-50 border-black/5 hover:border-[#4caf50]/50' : 'bg-black/20 border-white/5 hover:border-[#4caf50]/30 hover:bg-[#4caf50]/5')}`}
                          >
                             <span className={`text-[8px] font-black uppercase tracking-tighter mb-1 ${c.id === chapterId ? 'text-[#0a0c0a]/60' : 'opacity-40'}`}>Chương</span>
                             <span className="text-lg font-black">{c.chapter_number}</span>
                             {c.id === chapterId && (
                               <div className="absolute top-2 right-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-[#0a0c0a] animate-pulse" />
                               </div>
                             )}
                          </button>
                        ))}
                     </div>
                     {allChapters.filter(c => c.chapter_number.toString().includes(chapterSearchTerm)).length === 0 && (
                       <div className="py-20 text-center opacity-30">
                          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          <p className="text-xs font-black uppercase tracking-widest">Không tìm thấy chương nào</p>
                       </div>
                     )}
                  </div>
                  
                  <div className={`p-4 border-t text-center ${theme === 'light' ? 'bg-gray-50 border-black/5' : 'bg-black/20 border-white/5'}`}>
                     <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-30">Shiroi Arika Premium Selector</p>
                  </div>
               </motion.div>
            </div>
          )}
        </AnimatePresence>
      </Portal>
    </div>
  );
}
