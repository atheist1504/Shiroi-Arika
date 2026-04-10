'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

import CheckIn from "./CheckIn";
import { calculateLevel, calculateProgress } from '@/lib/xp';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchRef = useRef(null);

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
        setUser(JSON.parse(storedUser));
      } else {
        setUser(null);
      }
    };

    checkUser();
    window.addEventListener('storage', checkUser);
    
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearch(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener('storage', checkUser);
    };
  }, [pathname]);

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
    localStorage.removeItem('shiroi_user');
    setUser(null);
    router.push('/');
    router.refresh();
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
        router.push(`/search?q=${encodeURIComponent(searchTerm)}`);
        setShowSearch(false);
    }
  };

  return (
    <nav className="glass sticky-nav z-[1000] border-b border-white/5 h-[70px] flex items-center">
      <div className="container mx-auto px-4 flex justify-between items-center w-full relative">
        
        {/* LEFT: HAMBURGER (MOBILE ONLY) */}
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

        <Link href="/" className="logo shrink-0 flex items-center gap-2 group absolute left-1/2 -translate-x-1/2 lg:static lg:translate-x-0">
          <span className="clover-icon text-2xl group-hover:rotate-12 transition-transform drop-shadow-[0_0_10px_rgba(76,175,80,0.3)]">🍀</span>
          <span className="logo-text gradient-text font-black tracking-tighter text-lg md:text-xl">SHIROI ARIKA</span>
        </Link>
        
        <div className="hidden lg:flex-1 max-w-sm md:max-w-md mx-10 relative" ref={searchRef}>
           <form onSubmit={handleSearchSubmit} className="relative group">
              <input 
                type="text" 
                placeholder="Tìm truyện Shiroi..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => results.length > 0 && setShowSearch(true)}
                className="w-full bg-[#141814]/50 border border-white/5 rounded-2xl py-2 px-5 pl-10 text-xs focus:border-[#4caf50] focus:ring-1 focus:ring-[#4caf50]/20 outline-none transition-all placeholder:text-gray-700 font-bold"
              />
              <svg className="w-3.5 h-3.5 absolute left-3.5 top-2.5 text-gray-700 group-focus-within:text-[#4caf50] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
           </form>

           {showSearch && results.length > 0 && (
             <div className="absolute mt-2 w-full bg-[#1c221c] border border-white/5 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-3xl animate-fade-in z-[50]">
                {results.map(manga => (
                    <Link 
                      key={manga.id} 
                      href={`/manga/${manga.id}`}
                      onClick={() => setShowSearch(false)}
                      className="flex items-center gap-3 p-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                    >
                        <img src={manga.cover_image || 'https://psgivxgycjireinwnelc.supabase.co/storage/v1/object/public/avatars/default-avatar.png'} className="w-8 h-12 object-cover rounded shadow-md flex-shrink-0 bg-black/40" alt="" />
                        <span className="text-[12px] font-bold text-gray-400 truncate">{manga.title}</span>
                    </Link>
                ))}
             </div>
           )}
        </div>

        <div className="flex items-center gap-3 lg:gap-7 shrink-0 ml-auto lg:ml-0">
          <div className="hidden lg:flex items-center gap-7">
            <Link href="/manga" className="text-gray-500 hover:text-[#4caf50] transition-colors font-black text-[10px] uppercase tracking-widest">Kho Truyện</Link>
            <Link href="/leaderboard" className="text-[#4caf50] hover:scale-105 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 group">
               <span className="group-hover:rotate-12 transition-transform drop-shadow-[0_0_8px_rgba(76,175,80,0.4)]">🏆</span> BXH
            </Link>
            <Link href="/history" className="text-gray-500 hover:text-[#4caf50] transition-colors font-black text-[10px] uppercase tracking-widest">Lịch sử</Link>
            
            {/* ADMIN LINK */}
            {(user?.username?.toLowerCase().includes('admin') || user?.display_name?.toLowerCase().includes('quản trị')) && (
               <Link href="/admin/create-manga" className="flex items-center gap-2 px-4 py-2 bg-[#4caf50]/10 border border-[#4caf50]/20 text-[#4caf50] rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#4caf50] hover:text-[#0a0c0a] transition-all shadow-lg shadow-[#4caf50]/5 animate-pulse">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
                  Đăng Truyện
               </Link>
            )}
          </div>
          
          {user ? (
             <div className="flex items-center gap-5 border-l border-white/5 pl-8 animate-fade-in group/user">
                
                {/* ĐIỂM DANH COMPONENT - Ẩn trên Mobile Header (Đã có trong Menu) 🍀 */}
                <div className="hidden lg:block">
                  <CheckIn />
                </div>

                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex flex-col items-end gap-1 group">
                    <div className="flex items-center gap-2">
                        <span className="bg-[#4caf50] text-[#0a0c0a] text-[8px] font-black px-1.5 py-0.5 rounded-lg border border-[#4caf50]/20 shadow-lg italic">
                           LVL {calculateLevel(user.xp)}
                        </span>
                        <span className="text-[12px] text-[#4caf50] font-black uppercase tracking-widest drop-shadow-[0_0_8px_rgba(76,175,80,0.2)] truncate max-w-[120px]">{user.display_name || user.username}</span>
                     </div>
                     <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden" title={`${calculateProgress(user.xp)}/100 XP tới cấp tiếp theo ✨`}>
                        <div 
                          className="h-full bg-gradient-to-r from-[#4caf50] via-[#81c784] to-[#4caf50] animate-pulse" 
                          style={{ width: `${calculateProgress(user.xp)}%` }}
                        ></div>
                     </div>
                  </div>

                  <Link href="/profile" className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 hover:border-[#4caf50]/50 transition-all shadow-xl shadow-black/50 hover:scale-105 active:scale-95 group bg-[#141814]">
                      <img src={user.avatar_url || 'https://psgivxgycjireinwnelc.supabase.co/storage/v1/object/public/avatars/default-avatar.png'} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="Avatar" />
                  </Link>

                  <button 
                    onClick={handleLogout}
                    className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all group"
                    title="Đăng xuất"
                  >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                  </button>
                </div>
             </div>
          ) : (
            <Link 
              href="/login" 
              className="px-6 py-2.5 bg-[#4caf50] text-[#0a0c0a] font-black rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#4caf50]/20 text-[10px] uppercase tracking-wider"
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </div>

      {/* MOBILE MENU OVERLAY */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[99]"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 left-0 bottom-0 w-[85%] max-w-[300px] bg-[#0a0c0a] border-r border-[#4caf50]/20 z-[2000] p-6 flex flex-col shadow-[10px_0_50px_rgba(0,0,0,0.9)]"
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

              {/* Mobile Search */}
              <form onSubmit={handleSearchSubmit} className="relative mb-8">
                <input 
                  type="text" 
                  placeholder="Tìm truyện..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#141814] border border-white/5 rounded-2xl py-3 px-5 pl-12 text-sm focus:border-[#4caf50] outline-none"
                />
                <svg className="w-4 h-4 absolute left-4 top-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </form>

              <div className="flex flex-col gap-3">
                <div className="bg-[#141814] p-4 rounded-3xl mb-4 border border-white/5 shadow-inner">
                   <CheckIn />
                </div>
                
                <Link href="/manga" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-4 hover:bg-[#141814] rounded-2xl text-gray-300 font-bold transition-all border border-transparent hover:border-[#4caf50]/20 group">
                  <div className="w-10 h-10 bg-[#141814] rounded-xl flex items-center justify-center group-hover:bg-[#4caf50] group-hover:text-[#0a0c0a] transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5s3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                  </div>
                  Kho Truyện
                </Link>

                <Link href="/leaderboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-4 bg-gradient-to-r from-[#141814] to-transparent hover:from-[#4caf50]/10 rounded-2xl text-[#4caf50] font-black transition-all border border-[#4caf50]/10">
                  <div className="w-10 h-10 bg-[#4caf50]/10 rounded-xl flex items-center justify-center text-xl">🏆</div> 
                  BẢNG XẾP HẠNG
                </Link>

                <Link href="/history" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-4 hover:bg-[#141814] rounded-2xl text-gray-300 font-bold transition-all group">
                  <div className="w-10 h-10 bg-[#141814] rounded-xl flex items-center justify-center group-hover:text-[#4caf50] transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                  Lịch sử đọc
                </Link>

                <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-4 hover:bg-[#141814] rounded-2xl text-gray-300 font-bold transition-all group">
                  <div className="w-10 h-10 bg-[#141814] rounded-xl flex items-center justify-center group-hover:text-[#4caf50] transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                  </div>
                  Trang cá nhân
                </Link>

                {user && (user?.username?.toLowerCase().includes('admin') || user?.display_name?.toLowerCase().includes('quản trị')) && (
                  <Link href="/admin/create-manga" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-4 bg-orange-500/10 hover:bg-orange-500 hover:text-white rounded-2xl font-black text-orange-500 transition-all border border-orange-500/20">
                     <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
                     </div>
                     Admin: Đăng Truyện
                  </Link>
                )}
              </div>

              <div className="mt-auto pt-6 border-t border-white/5">
                {user ? (
                   <button 
                     onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
                     className="w-full flex items-center justify-center gap-3 p-4 bg-red-500/10 text-red-500 rounded-2xl font-bold hover:bg-red-500 hover:text-white transition-all"
                   >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                      Đăng xuất
                   </button>
                ) : (
                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="w-full flex items-center justify-center p-4 bg-[#4caf50] text-[#0a0c0a] rounded-2xl font-bold">
                    Đăng nhập ngay
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}
