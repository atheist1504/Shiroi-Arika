'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { calculateLevel, calculateProgress, calculateTitle } from '@/lib/xp';
import Link from 'next/link';
import { optimizeImage } from '@/lib/cloudinary';
import { motion } from 'framer-motion';
import { requestNotificationPermission } from '@/lib/fcmClient';
import { useMemo } from 'react';

export default function ProfileClient({ userId, initialUser, initialStats, initialXpLogs }) {
  const router = useRouter();
  
  const [targetUser, setTargetUser] = useState(initialUser);
  const [stats, setStats] = useState(initialStats || { total_mangas: 0, total_chapters: 0 });
  const [loading, setLoading] = useState(!initialUser);
  const [error, setError] = useState(null);
  
  const [sessionUser, setSessionUser] = useState(null);
  
  // 🛡️ Sử dụng useMemo để tính toán isOwner an toàn, tránh lỗi hoisting 🍀
  const isOwner = useMemo(() => {
    return sessionUser?.id === targetUser?.id && !!targetUser?.id;
  }, [sessionUser, targetUser?.id]);

  useEffect(() => {
    // Lấy thông tin session từ Cookie (Client-side)
    const sessionCookie = document.cookie.split('; ').find(row => row.startsWith('shiroi_session='))?.split('=')[1];
    if (sessionCookie) {
      try {
        const decoded = JSON.parse(decodeURIComponent(sessionCookie));
        setSessionUser(decoded);
      } catch (err) {
        console.error("Lỗi giải mã session cookie:", err);
      }
    }
  }, []);

  // 🔔 Yêu cầu quyền thông báo nếu là chủ sở hữu
  useEffect(() => {
    if (isOwner) {
      const timer = setTimeout(() => {
        requestNotificationPermission().catch(err => console.error("FCM Profile Error:", err));
      }, 2000); // Đợi 2s cho mượt 🍀
      return () => clearTimeout(timer);
    }
  }, [isOwner]);

  useEffect(() => {
    if (!initialUser && userId) fetchUserData();
  }, [userId, initialUser]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      // 1. Fetch User Info - Hỗ trợ cả ID và Username 🍀
      let { data: userData, error: userError } = await supabase
        .from('shiroi_users')
        .select('id, username, display_name, avatar_url, bio, role, xp, level, created_at, selected_badge, last_check_in, last_lucky_draw, check_in_streak')
        .eq('id', userId.length === 36 ? userId : '00000000-0000-0000-0000-000000000000')
        .maybeSingle();

      if (!userData) {
        const { data: byUsername } = await supabase
          .from('shiroi_users')
          .select('id, username, display_name, avatar_url, bio, role, xp, level, created_at, selected_badge, last_check_in, last_lucky_draw, check_in_streak')
          .eq('username', userId)
          .maybeSingle();
        userData = byUsername;
      }

      if (!userData) {
        setError('Không tìm thấy người dùng này trong Thánh địa Shiroi!');
        return;
      }

      setTargetUser(userData);

      // 2. Fetch Stats
      const { count: mangaCount } = await supabase
        .from('shiroi_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userData.id);

      const { count: chapterCount } = await supabase
        .from('shiroi_read_chapters')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userData.id);

      setStats({
        total_mangas: mangaCount || 0,
        total_chapters: chapterCount || 0
      });
    } catch (err) {
      console.error("Lỗi tải hồ sơ:", err);
      setError('Lỗi kết nối hệ thống. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0c0a] relative overflow-hidden">
      {/* Loading Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#4caf50]/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="flex flex-col items-center gap-6 relative z-10">
        <div className="w-16 h-16 border-4 border-[#4caf50]/20 border-t-[#4caf50] rounded-full animate-spin"></div>
        <div className="text-[#4caf50] font-black text-[10px] uppercase tracking-[0.5em] italic">Đang triệu hồi ký ức...</div>
      </div>
    </div>
  );

  if (error || !targetUser) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0c0a] text-center p-6">
      <div className="text-6xl mb-6">🌵</div>
      <h1 className="text-xl font-black text-white uppercase tracking-widest mb-4">{error || 'Có lỗi xảy ra'}</h1>
      <button onClick={() => router.back()} className="px-8 py-3 bg-[#4caf50] text-[#0a0c0a] font-black rounded-xl text-xs uppercase tracking-widest">Quay lại</button>
    </div>
  );

  const userTitle = calculateTitle(targetUser?.xp || 0, targetUser?.selected_badge);

  return (
    <div className="min-h-screen bg-[#050605] text-white p-6 pt-32 pb-24 relative overflow-x-hidden selection:bg-[#4caf50]/30">
      {/* Premium Background Elements */}
      <div className="fixed top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,#1a201a,transparent)] pointer-events-none"></div>
      <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-[#4caf50]/5 rounded-full blur-[180px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#4caf50]/3 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto z-10 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* LEFT COLUMN: IDENTITY & AVATAR */}
          <div className="lg:col-span-5 flex flex-col items-center text-center space-y-8">
            <div className="relative p-1.5 bg-gradient-to-br from-[#4caf50]/30 to-transparent rounded-[56px] shadow-[0_0_60px_rgba(76,175,80,0.15)]">
               <div className="w-64 h-64 rounded-[48px] overflow-hidden border-4 border-[#141814] bg-[#0a0c0a] relative group shadow-2xl">
                  <img 
                    src={optimizeImage(targetUser?.avatar_url || 'https://psgivxgycjireinwnelc.supabase.co/storage/v1/object/public/avatars/default-avatar.png', 400)} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    alt="Avatar" 
                  />
                  <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent"></div>
               </div>
               
               {/* Floating Badge */}
               <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-[#4caf50] text-[#0a0c0a] font-black text-[10px] uppercase tracking-[0.3em] rounded-full shadow-[0_10px_30px_rgba(76,175,80,0.4)] whitespace-nowrap z-20">
                  Cấp {calculateLevel(targetUser?.xp)}
               </div>
            </div>

            <div className="flex flex-col items-center gap-4">
               <div className="px-5 py-2 bg-[#4caf50]/10 border border-[#4caf50]/20 rounded-full backdrop-blur-md shadow-inner">
                  <span className="text-[10px] font-black text-[#4caf50] uppercase tracking-[0.4em]">{userTitle.name}</span>
               </div>
               <h1 className="text-4xl md:text-6xl font-black tracking-tight uppercase gradient-text drop-shadow-2xl leading-none">
                  {targetUser?.display_name || targetUser?.username || 'Thành viên Shiroi'}
               </h1>
               <div className="w-24 h-1 bg-gradient-to-r from-transparent via-[#4caf50]/40 to-transparent"></div>
            </div>

            <p className="text-gray-500 font-bold italic text-sm leading-relaxed max-w-sm">
                  "{targetUser?.bio || 'Một lãng khách bí ẩn chưa để lại lời giới thiệu nào tại Shiroi Arika...'}"
               </p>
            </div>

            <div className="w-full max-w-xs p-8 bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[40px] space-y-5 shadow-2xl relative overflow-hidden group">
               <div className="absolute inset-0 bg-gradient-to-br from-[#4caf50]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
               <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-[0.2em] text-[#4caf50] relative z-10">
                  <span>Tiến trình cấp độ</span>
                  <span className="bg-[#4caf50]/10 px-3 py-1 rounded-full">{calculateProgress(targetUser?.xp)}%</span>
               </div>
               <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px] relative z-10">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${calculateProgress(targetUser?.xp)}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-[#4caf50] to-[#a5d6a7] shadow-[0_0_20px_rgba(76,175,80,0.5)] rounded-full"
                  />
               </div>
               <div className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.15em] flex justify-between relative z-10">
                  <span>{targetUser.xp?.toLocaleString()} XP</span>
                  <span className="opacity-40">100 XP Kế tiếp</span>
               </div>
            </div>
          </div>

          {/* RIGHT COLUMN: STATS & CONTENT */}
          <div className="lg:col-span-7 flex flex-col space-y-12 h-full">
            
            <div className="space-y-8">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-8 bg-[#4caf50] rounded-full shadow-[0_0_15px_rgba(76,175,80,0.4)]"></div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Thành tựu tu luyện</h2>
                  </div>
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/10 pb-1">Thống kê trọn đời</div>
                </div>

                {/* STATS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 p-10 rounded-[48px] flex flex-col justify-center items-center gap-4 group hover:bg-white/[0.04] transition-all relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-t-white/20">
                    <div className="absolute top-[-20%] right-[-20%] w-40 h-40 bg-[#4caf50]/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    <span className="text-[11px] text-[#4caf50] font-black uppercase tracking-[0.3em] relative z-10 opacity-60 group-hover:opacity-100 transition-all">Bộ truyện đã xem</span>
                    <div className="flex items-baseline gap-2 relative z-10">
                      <span className="text-7xl font-black text-white italic transition-transform group-hover:scale-110 duration-500 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">{stats.total_mangas}</span>
                    </div>
                  </div>
                  <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 p-10 rounded-[48px] flex flex-col justify-center items-center gap-4 group hover:bg-white/[0.04] transition-all relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-t-white/20">
                    <div className="absolute top-[-20%] right-[-20%] w-40 h-40 bg-[#4caf50]/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    <span className="text-[11px] text-[#4caf50] font-black uppercase tracking-[0.3em] relative z-10 opacity-60 group-hover:opacity-100 transition-all">Chương đã đọc</span>
                    <div className="flex items-baseline gap-2 relative z-10">
                      <span className="text-7xl font-black text-white italic transition-transform group-hover:scale-110 duration-500 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">{stats.total_chapters}</span>
                    </div>
                  </div>
                </div>
            </div>


            {/* ACTION BUTTONS */}
            <div className="flex items-center gap-4 pt-6">
               <button onClick={() => router.back()} className="flex-1 py-6 bg-white/5 border border-white/5 text-white font-black rounded-[32px] text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-3 shadow-xl">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                  Quay lại
               </button>
               <Link href="/" className="flex-1 py-6 bg-[#4caf50] text-[#0a0c0a] font-black rounded-[32px] text-[10px] uppercase tracking-widest shadow-[0_20px_40px_rgba(76,175,80,0.25)] hover:scale-[1.03] active:scale-95 transition-all text-center">
                  Đồng hành cùng {targetUser?.display_name?.split(' ')[0] || targetUser?.username || 'Bằng hữu'} 📖
               </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
