'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

import CheckIn from "./CheckIn";
import LuckyDraw from "./LuckyDraw";
import MissionsModal from "./MissionsModal";
import NotificationBell from "./NotificationBell";
import { calculateLevel, calculateProgress } from '@/lib/xp';
import { motion, AnimatePresence } from 'framer-motion';
import { useCallback } from 'react';
import { logoutAction } from '@/lib/actions';


export default function Navbar() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMissionsOpen, setIsMissionsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isMounted, setIsMounted] = useState(false);
  const searchRef = useRef(null);
  const navRef = useRef(null);
  const userMenuRef = useRef(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleOpenMissions = useCallback(() => {
    setIsMissionsOpen(true);
  }, []);

  const handleCloseMissions = () => {
    setIsMissionsOpen(false);
    // 🪄 XÓA THAM SỐ TAB TRÊN URL KHI ĐÓNG BẢNG 🍀
    if (window.location.search.includes('tab=')) {
        const params = new URLSearchParams(window.location.search);
        params.delete('tab');
        const newSearch = params.toString();
        const newUrl = pathname + (newSearch ? `?${newSearch}` : '');
        router.replace(newUrl);
    }
  };

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'achievements' || tab === 'missions') {
        setIsMissionsOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.trim().length >= 2) {
        searchMangas();
      } else {
        setResults([]);
        setShowSearch(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  useEffect(() => {
    const checkUser = () => {
      const storedUser = localStorage.getItem('shiroi_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);

        // 🔄 LUÔN ĐỒNG BỘ DỮ LIỆU MỚI NHẤT TỪ DATABASE KHI MOUNT 🍀
        // Điều này đảm bảo khi Admin cấp quyền Staff, người dùng sẽ thấy nút ngay mà không cần Logout
        if (parsed.id) {
            refreshUserData(parsed.id);
        }
      } else {
        setUser(null);
      }
    };

    const refreshUserData = async (userId) => {
      try {
        const { data, error } = await supabase
          .from('shiroi_users')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (!error && data) {
          localStorage.setItem('shiroi_user', JSON.stringify(data));
          setUser(data);
          // Thông báo cho các component khác
          window.dispatchEvent(new Event('storage'));
        }
      } catch (err) {
        console.warn("Lỗi từ khôi phục dữ liệu:", err);
      }
    };

    const storedUser = localStorage.getItem('shiroi_user');
    const initialUser = storedUser ? JSON.parse(storedUser) : null;

    const setupUserSync = (userId) => {
        if (!userId) return null;
        const channel = supabase
          .channel(`navbar_user_${userId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'shiroi_users',
              filter: `id=eq.${userId}`
            },
            (payload) => {
              console.log('✨ [Navbar] Đồng bộ Real-time:', payload.new);
              localStorage.setItem('shiroi_user', JSON.stringify(payload.new));
              setUser(payload.new);
              window.dispatchEvent(new Event('storage'));
            }
          )
          .subscribe();
        
        return () => supabase.removeChannel(channel);
    };

    const subCleanup = initialUser ? setupUserSync(initialUser.id) : null;

    // 🔔 Đăng ký Service Worker cho FCM (Thông báo đẩy) 🍀
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/firebase-messaging-sw.js')
          .then(reg => console.log('🚀 Service Worker registered:', reg.scope))
          .catch(err => console.error('❌ SW registration failed:', err));
      });
    }

    checkUser();
    window.addEventListener('storage', checkUser);
    
    setIsMounted(true);


    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearch(false);
      }
      if (navRef.current && !navRef.current.contains(event.target) && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener('storage', checkUser);
      if (subCleanup) subCleanup();
      document.body.style.overflow = 'unset';
    };
  }, [pathname, isMobileMenuOpen]);

  // ⚡ FCM AUTO-SYNC TOKEN (Anti-expiration) 🍀
  useEffect(() => {
    if (typeof window !== 'undefined' && user && 'Notification' in window && Notification.permission === 'granted') {
        const { requestNotificationPermission } = require('@/lib/fcmClient');
        requestNotificationPermission().then(newToken => {
            if (newToken && newToken !== user.fcm_token) {
                console.log("♻️ [FCM] Token đã thay đổi, đang đồng bộ với DB...");
                // Note: registerFcmTokenAction is already called inside requestNotificationPermission
            }
        }).catch(() => {});
    }
  }, [user?.id]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const searchMangas = async () => {
    try {
      const { data, error } = await supabase
        .from('mangas')
        .select('id, title, cover_image')
        .ilike('title', `%${searchTerm}%`)
        .limit(5);
      
      if (!error && data) {
        setResults(data);
        setShowSearch(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    // 1. Xóa ngay ở Client để UI phản hồi lập tức ⚡
    localStorage.removeItem('shiroi_user');
    setUser(null);
    
    // 2. Chuyển hướng đến API Logout để xóa Cookie trên Server và quay về Home 🏠
    window.location.href = '/api/logout';
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
        router.push(`/search?q=${encodeURIComponent(searchTerm)}`);
        setShowSearch(false);
    }
  };

  return (
    <>
      <nav className="glass fixed-nav z-[1000] border-b border-white/5 py-3 lg:py-0">
        <div className="container mx-auto px-4 flex flex-col w-full relative">
          
          <div className="flex h-[70px] items-center justify-between w-full">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 text-[#4caf50] hover:bg-[#4caf50]/10 rounded-xl transition-all"
              >
                {isMobileMenuOpen ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
                )}
              </button>

              <Link href="/" className="logo shrink-0 flex items-center gap-2 group absolute left-1/2 -translate-x-1/2 lg:static lg:translate-x-0 z-10">
                <span className="clover-icon text-xl md:text-2xl group-hover:rotate-12 transition-transform drop-shadow-[0_0_10px_rgba(76,175,80,0.3)]">🍀</span>
                <span className="logo-text gradient-text font-black tracking-tighter text-base md:text-xl whitespace-nowrap">SHIROI ARIKA</span>
              </Link>

              <div className="hidden lg:flex items-center gap-6 ml-8">
                <Link href="/manga" className="text-gray-500 hover:text-[#4caf50] transition-colors font-black text-[10px] uppercase tracking-[0.2em] whitespace-nowrap">Kho Truyện</Link>
                <Link href="/leaderboard" className="text-gray-500 hover:text-[#4caf50] transition-colors font-black text-[10px] uppercase tracking-[0.2em] whitespace-nowrap">BXH</Link>
                <Link href="/bookmarks" className="text-gray-500 hover:text-[#4caf50] transition-colors font-black text-[10px] uppercase tracking-[0.2em] whitespace-nowrap">Tủ Truyện</Link>
                <Link href="/history" className="text-gray-500 hover:text-[#4caf50] transition-colors font-black text-[10px] uppercase tracking-[0.2em] whitespace-nowrap">Lịch sử</Link>
              </div>
            </div>

            <div className="flex items-center gap-4 lg:gap-6 shrink-0 ml-auto lg:ml-0">
              {!isMounted ? (
                <div className="w-24 h-8 bg-white/5 animate-pulse rounded-xl"></div>
              ) : user ? (
                 <div className="flex items-center gap-4 animate-fade-in py-2">
                    {(user?.role === 'admin' || user?.role === 'staff' || user?.username?.toLowerCase() === 'atheist1504') && (
                       <Link href="/admin/create-manga" className="hidden lg:flex items-center px-4 py-2 bg-[#4caf50] text-[#0a0c0a] rounded-xl font-black text-[9px] uppercase tracking-[0.2em] hover:brightness-110 transition-all shadow-lg shadow-[#4caf50]/10">
                          ĐĂNG TRUYỆN
                       </Link>
                    )}

                    <div className="flex items-center gap-4 border-l border-white/5 pl-6">
                      <div className="hidden sm:flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                            <span className="bg-[#4caf50]/20 text-[#4caf50] text-[8px] font-black px-1.5 py-0.5 rounded-lg border border-[#4caf50]/20 italic">
                                LVL {calculateLevel(user.xp)}
                            </span>
                            <span className="text-[11px] text-white font-bold uppercase tracking-widest truncate max-w-[100px]">{user.display_name || user.username}</span>
                         </div>
                         <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-[#4caf50]" style={{ width: `${calculateProgress(user.xp)}%` }}></div>
                         </div>
                      </div>

                      <div className="flex items-center gap-1 sm:gap-2 relative" ref={userMenuRef}>
                          <NotificationBell />
                          
                          <button 
                            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                            className={`w-9 h-9 md:w-10 md:h-10 rounded-xl overflow-hidden border transition-all bg-[#141814] shadow-xl relative group ${
                                isUserMenuOpen ? 'border-[#4caf50] ring-4 ring-[#4caf50]/20' : 'border-white/10 hover:border-[#4caf50]/50'
                            }`}
                          >
                              <img src={user.avatar_url || 'https://psgivxgycjireinwnelc.supabase.co/storage/v1/object/public/avatars/default-avatar.png'} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="Avatar" />
                          </button>

                          {/* 👤 USER DROPDOWN MENU 🍀 */}
                          <AnimatePresence>
                            {isUserMenuOpen && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 top-full mt-4 w-56 bg-[#0c0f0c]/95 backdrop-blur-2xl border border-white/5 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[2100] overflow-hidden"
                                >
                                    <div className="p-5 border-b border-white/5">
                                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Thành viên</p>
                                        <p className="text-[12px] font-black text-white truncate">{user.display_name || user.username}</p>
                                    </div>
                                    
                                    <div className="p-2">
                                        <Link 
                                            href="/profile" 
                                            onClick={() => setIsUserMenuOpen(false)}
                                            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#4caf50]/10 text-gray-300 hover:text-[#4caf50] transition-all group"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-[#4caf50]/20">👤</div>
                                            <span className="text-[11px] font-black uppercase tracking-wider">Trang cá nhân</span>
                                        </Link>

                                        <Link 
                                            href="/profile?tab=settings" 
                                            onClick={() => setIsUserMenuOpen(false)}
                                            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#4caf50]/10 text-gray-300 hover:text-[#4caf50] transition-all group"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-[#4caf50]/20">⚙️</div>
                                            <span className="text-[11px] font-black uppercase tracking-wider">Cài đặt</span>
                                        </Link>

                                        <a 
                                            href="/api/logout"
                                            onClick={() => { localStorage.removeItem('shiroi_user'); }}
                                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 text-gray-300 hover:text-red-500 transition-all group"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-red-500/20">🚪</div>
                                            <span className="text-[11px] font-black uppercase tracking-wider">Đăng xuất</span>
                                        </a>
                                    </div>
                                    
                                    <div className="p-3 bg-white/[0.02] text-center">
                                        <span className="text-[8px] font-bold text-gray-600 uppercase tracking-widest italic">Shiroi Arika v3.0</span>
                                    </div>
                                </motion.div>
                            )}
                          </AnimatePresence>
                      </div>
                    </div>
                 </div>
              ) : (
                <Link 
                  href="/login" 
                  className="px-6 py-2.5 bg-[#4caf50] text-[#0a0c0a] font-black rounded-xl hover:scale-105 transition-all text-[10px] uppercase tracking-wider"
                >
                  Đăng nhập
                </Link>
              )}
            </div>
          </div>

          <div className="hidden lg:flex h-10 items-center justify-start relative px-6 mb-2 gap-6">
                {isMounted && (
                  <>
                    <div className="scale-100 flex items-center gap-6">
                      <CheckIn />
                      <div className="w-[1px] h-3 bg-white/10"></div>
                    </div>
                    
                    <div className="scale-100 flex items-center gap-6">
                      <LuckyDraw />
                      <div className="w-[1px] h-3 bg-white/10"></div>
                    </div>
    
                    <button 
                      onClick={() => setIsMissionsOpen(true)}
                      className="text-gray-500 hover:text-[#4caf50] transition-all font-black text-[10px] uppercase tracking-[0.2em] whitespace-nowrap flex items-center gap-2"
                    >
                      <span className="text-sm opacity-80">🎯</span>
                      Nhiệm vụ
                    </button>
    
                    <div className="w-[1px] h-3 bg-white/10"></div>
                    <Link 
                      href={(user?.role === 'admin' || user?.username?.toLowerCase() === 'atheist1504') ? "/admin/reports" : "/profile?tab=reports"} 
                      className="text-gray-500 hover:text-[#4caf50] transition-all font-black text-[10px] uppercase tracking-[0.2em] whitespace-nowrap flex items-center gap-2"
                    >
                        <span className="text-sm opacity-80">🚩</span>
                        Báo cáo
                    </Link>

                  </>
                )}
          </div>

        </div>
      </nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[2000]">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm shadow-2xl"
            />
            <motion.div 
              ref={navRef}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute top-0 left-0 bottom-0 w-[85%] max-w-[300px] bg-[#0a0c0a] border-r border-[#4caf50]/30 p-6 flex flex-col shadow-[20px_0_100px_rgba(0,0,0,1)] z-[2001]"
              style={{ backgroundColor: '#0a0c0a' }}
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🍀</span>
                  <span className="logo-text gradient-text font-black text-lg tracking-tighter">SHIROI ARIKA</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-[#4caf50] hover:bg-[#4caf50]/10 rounded-full transition-all">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <form ref={searchRef} onSubmit={handleSearchSubmit} className="relative mb-6">
                <input 
                  type="text" 
                  placeholder="Tìm truyện..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#141814] border border-white/5 rounded-2xl py-3 px-5 pl-12 text-sm focus:border-[#4caf50] outline-none text-white"
                />
                <svg className="w-4 h-4 absolute left-4 top-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </form>

              <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar flex-1 pb-10">
                <div className="bg-[#141814] p-4 rounded-3xl mb-2 border border-white/5 shadow-inner flex flex-col gap-3">
                   <div className="flex gap-3">
                      <div className="flex-1"><LuckyDraw /></div>
                      <div className="flex-1"><CheckIn /></div>
                   </div>
                   <div className="h-px bg-white/5 w-full"></div>
                   <button 
                      onClick={() => { setIsMissionsOpen(true); setIsMobileMenuOpen(false); }}
                      className="flex items-center justify-center gap-3 py-3 bg-[#4caf50]/10 text-[#4caf50] rounded-xl font-black text-[10px] uppercase tracking-[0.2em] border border-[#4caf50]/20 active:scale-95 transition-all"
                   >
                      <span className="text-sm">🎯</span> NHIỆM VỤ & THƯỞNG
                   </button>
                   <Link 
                        href={(user?.role === 'admin' || user?.username?.toLowerCase() === 'atheist1504') ? "/admin/reports" : "/profile?tab=reports"} 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-center gap-3 py-3 bg-white/5 text-gray-400 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] border border-white/5 active:scale-95 transition-all"
                   >
                        <span className="text-sm">🚩</span> {(user?.role === 'admin' || user?.username?.toLowerCase() === 'atheist1504') ? 'DANH SÁCH BÁO CÁO' : 'BÁO CÁO CỦA BẠN'}
                   </Link>

                </div>
                
                <Link href="/manga" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-4 hover:bg-[#141814] rounded-2xl text-gray-300 font-bold transition-all border border-transparent hover:border-[#4caf50]/20 group">
                  <div className="w-10 h-10 bg-[#141814] rounded-xl flex items-center justify-center group-hover:bg-[#4caf50] group-hover:text-[#0a0c0a] transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5s3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                  </div>
                  Kho Truyện
                </Link>

                <Link href="/leaderboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-4 hover:bg-[#141814] rounded-2xl text-gray-300 font-bold transition-all border border-transparent hover:border-[#4caf50]/20 group">
                  <div className="w-10 h-10 bg-[#141814] rounded-xl flex items-center justify-center group-hover:text-[#4caf50] transition-all text-xl">🏆</div> 
                  Bảng Xếp Hạng
                </Link>

                <Link href="/bookmarks" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-4 hover:bg-[#141814] rounded-2xl text-gray-300 font-bold transition-all group">
                   <div className="w-10 h-10 bg-[#141814] rounded-xl flex items-center justify-center group-hover:text-[#4caf50] transition-all text-xl">❤️</div>
                   Tủ Truyện (Theo dõi)
                </Link>

                <Link href="/history" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                  <span className="text-lg">🕒</span> Lịch sử xem
                </Link>

                {(user?.role === 'admin' || user?.role === 'staff' || user?.username?.toLowerCase() === 'atheist1504') && (
                  <Link href="/admin/create-manga" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl bg-[#4caf50]/10 border border-[#4caf50]/20 text-[#4caf50] font-black uppercase text-[10px] tracking-widest shadow-[0_0_15px_rgba(76,175,80,0.1)]">
                    <span className="text-lg">🎨</span> Đăng truyện mới
                  </Link>
                )}

                <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-4 hover:bg-[#141814] rounded-2xl text-gray-300 font-bold transition-all group">
                  <div className="w-10 h-10 bg-[#141814] rounded-xl flex items-center justify-center group-hover:text-[#4caf50] transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                  </div>
                  Trang cá nhân
                </Link>
              </div>

              <div className="mt-auto pt-6 border-t border-white/5 bg-[#0a0c0a] pb-8 md:pb-0 flex flex-col gap-4">
                {isMounted ? (
                  user ? (
                    <a 
                      href="/api/logout"
                      onClick={() => { localStorage.removeItem('shiroi_user'); }}
                      className="w-full flex items-center justify-center gap-3 p-4 bg-red-500/10 text-red-500 rounded-2xl font-bold hover:bg-red-500 hover:text-white transition-all shadow-lg"
                    >
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                       Đăng xuất
                    </a>
                ) : (
                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="w-full flex items-center justify-center p-4 bg-[#4caf50] text-[#0a0c0a] rounded-2xl font-bold">
                    Đăng nhập ngay
                  </Link>
                  )
                ) : (
                  <div className="w-full h-14 bg-white/5 animate-pulse rounded-2xl"></div>
                )}
                <div className="text-center">
                  <span className="text-[8px] font-black text-gray-700 uppercase tracking-[0.3em]">v1.2 - Shiroi Mobile Fix</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <MissionsModal isOpen={isMissionsOpen} onClose={handleCloseMissions} />
    </>
  );
}
