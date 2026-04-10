'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

import CheckIn from "./CheckIn";
import { calculateLevel, calculateProgress } from '@/lib/xp';

export default function Navbar() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
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
    <nav className="glass sticky-nav z-[1000] border-b border-white/5">
      <div className="container nav-content px-4">
        <Link href="/" className="logo shrink-0 flex items-center gap-2 group">
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

        <div className="flex items-center gap-7 shrink-0">
          <div className="hidden lg:flex items-center gap-7">
            <Link href="/manga" className="text-gray-500 hover:text-[#4caf50] transition-colors font-black text-[10px] uppercase tracking-widest">Kho Truyện</Link>
            <Link href="/leaderboard" className="text-[#4caf50] hover:scale-105 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 group">
               <span className="group-hover:rotate-12 transition-transform drop-shadow-[0_0_8px_rgba(76,175,80,0.4)]">🏆</span> BXH
            </Link>
            <Link href="/history" className="text-gray-500 hover:text-[#4caf50] transition-colors font-black text-[10px] uppercase tracking-widest">Lịch sử</Link>
            
            {/* ADMIN LINK - Phục hồi nút đăng truyện cho Quản trị viên */}
            {(user?.username?.toLowerCase().includes('admin') || user?.display_name?.toLowerCase().includes('quản trị')) && (
               <Link href="/admin/create-manga" className="flex items-center gap-2 px-4 py-2 bg-[#4caf50]/10 border border-[#4caf50]/20 text-[#4caf50] rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#4caf50] hover:text-[#0a0c0a] transition-all shadow-lg shadow-[#4caf50]/5 animate-pulse">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
                  Đăng Truyện
               </Link>
            )}
          </div>
          
          {user ? (
             <div className="flex items-center gap-5 border-l border-white/5 pl-8 animate-fade-in group/user">
                
                {/* ĐIỂM DANH COMPONENT - HIỆN TRÊN MỌI THIẾT BỊ 🍀 */}
                <div className="block">
                  <CheckIn />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end gap-1 group">
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
    </nav>
  );
}
