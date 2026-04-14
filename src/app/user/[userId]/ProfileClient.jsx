'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { calculateLevel, calculateProgress, calculateTitle } from '@/lib/xp';
import Link from 'next/link';
import { optimizeImage } from '@/lib/cloudinary';
import { performLuckyDrawAction } from '@/lib/actions';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProfileClient({ userId, initialUser, initialStats, initialXpLogs }) {
  const router = useRouter();
  
  const [targetUser, setTargetUser] = useState(initialUser);
  const [stats, setStats] = useState(initialStats || { total_mangas: 0, total_chapters: 0 });
  const [xpLogs, setXpLogs] = useState(initialXpLogs || []);
  const [loading, setLoading] = useState(!initialUser);
  const [error, setError] = useState(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawResult, setDrawResult] = useState(null);
  const [sessionUser, setSessionUser] = useState(null);

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

  const isOwner = sessionUser?.id === userId;

  useEffect(() => {
    if (!initialUser && userId) fetchUserData();
  }, [userId, initialUser]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      // 1. Fetch User Info
      const { data: userData, error: userError } = await supabase
        .from('shiroi_users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        setError('Không tìm thấy người dùng này trong Thánh địa Shiroi!');
        return;
      }

      setTargetUser(userData);

      // 2. Fetch Stats
      const { count: mangaCount } = await supabase
        .from('shiroi_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      const { count: chapterCount } = await supabase
        .from('shiroi_read_chapters')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      setStats({
        total_mangas: mangaCount || 0,
        total_chapters: chapterCount || 0
      });

      // 3. Fetch Recent XP Logs (Công khai)
      const { data: logs } = await supabase
        .from('shiroi_xp_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      setXpLogs(logs || []);

    } catch (err) {
      console.error("Lỗi tải hồ sơ:", err);
      setError('Lỗi kết nối hệ thống. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const handleLuckyDraw = async () => {
    if (isDrawing) return;
    try {
      setIsDrawing(true);
      const res = await performLuckyDrawAction();
      
      if (res.success) {
        setDrawResult(res.xpGain);
        // Tự động cập nhật XP trên UI để người dùng thấy ngay thành quả 🍀
        setTargetUser(prev => ({
          ...prev,
          xp: (prev.xp || 0) + res.xpGain
        }));
        
        // Thêm log tạm thời vào UI
        const newLog = {
           id: Date.now(),
           amount: res.xpGain,
           type: 'lucky_draw',
           reason: `May mắn hàng ngày: +${res.xpGain} XP`,
           created_at: new Date().toISOString()
        };
        setXpLogs(prev => [newLog, ...prev.slice(0, 9)]);

        setTimeout(() => setDrawResult(null), 4000);
      } else {
        alert(res.error || 'Có lỗi xảy ra khi bốc quà!');
      }
    } catch (err) {
      console.error("Lỗi bốc quà:", err);
    } finally {
      setIsDrawing(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0c0a]">
      <div className="text-[#4caf50] font-black animate-pulse text-[10px] uppercase tracking-widest italic">Đang triệu hồi ký ức thành viên...</div>
    </div>
  );

  if (error || !targetUser) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0c0a] text-center p-6">
      <div className="text-6xl mb-6">🌵</div>
      <h1 className="text-xl font-black text-white uppercase tracking-widest mb-4">{error || 'Có lỗi xảy ra'}</h1>
      <button onClick={() => router.back()} className="px-8 py-3 bg-[#4caf50] text-[#0a0c0a] font-black rounded-xl text-xs uppercase tracking-widest">Quay lại</button>
    </div>
  );

  const userTitle = calculateTitle(targetUser.xp, targetUser.selected_badge);

  return (
    <div className="min-h-screen bg-[#0a0c0a] text-white p-6 pt-32 pb-24 relative overflow-x-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-[#4caf50]/5 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[30%] h-[30%] bg-[#4caf50]/3 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-4xl mx-auto z-10 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* LEFT COLUMN: IDENTITY & AVATAR */}
          <div className="lg:col-span-5 flex flex-col items-center text-center space-y-8">
            <div className="relative p-1.5 bg-gradient-to-br from-[#4caf50]/30 to-transparent rounded-[56px] shadow-[0_0_60px_rgba(76,175,80,0.15)]">
               <div className="w-64 h-64 rounded-[48px] overflow-hidden border-4 border-[#141814] bg-[#0a0c0a] relative group shadow-2xl">
                  <img 
                    src={optimizeImage(targetUser.avatar_url || 'https://psgivxgycjireinwnelc.supabase.co/storage/v1/object/public/avatars/default-avatar.png', 400)} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    alt="Avatar" 
                  />
                  <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent"></div>
               </div>
               
               {/* Floating Badge */}
               <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-[#4caf50] text-[#0a0c0a] font-black text-[10px] uppercase tracking-[0.3em] rounded-full shadow-[0_10px_30px_rgba(76,175,80,0.4)] whitespace-nowrap z-20">
                  Cấp {calculateLevel(targetUser.xp)}
               </div>
            </div>

            <div className="space-y-4">
               <div className="inline-block px-4 py-1.5 bg-[#4caf50]/10 border border-[#4caf50]/20 rounded-full">
                  <span className="text-[10px] font-black text-[#4caf50] uppercase tracking-[0.4em]">{userTitle.name}</span>
               </div>
               <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase gradient-text drop-shadow-2xl">
                  {targetUser.display_name || targetUser.username}
               </h1>
               <div className="w-20 h-1 whitespace-nowrap bg-gradient-to-r from-transparent via-[#4caf50]/40 to-transparent mx-auto"></div>
               <p className="text-gray-500 font-bold italic text-sm leading-relaxed max-w-sm">
                  "{targetUser.bio || 'Một lãng khách bí ẩn chưa để lại lời giới thiệu nào tại Shiroi Arika...'}"
               </p>
            </div>

            <div className="w-full max-w-xs p-6 bg-[#141814]/40 border border-white/5 rounded-[32px] space-y-4 shadow-xl">
               <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-[#4caf50]">
                  <span>Tiến trình cấp độ</span>
                  <span>{calculateProgress(targetUser.xp)}%</span>
               </div>
               <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-gradient-to-r from-[#4caf50] to-[#81c784] shadow-[0_0_15px_#4caf50]" style={{ width: `${calculateProgress(targetUser.xp)}%` }}></div>
               </div>
               <div className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">
                  Tổng Thánh tích: {targetUser.xp?.toLocaleString()} XP
               </div>
            </div>
          </div>

          {/* RIGHT COLUMN: STATS & ACTION */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-12">
            
            <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                  <div className="w-1.5 h-6 bg-[#4caf50] rounded-full"></div>
                  <h2 className="text-xl font-black uppercase tracking-tighter text-white">Thành tựu đạt được</h2>
                </div>

                {/* STATS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-[#141814]/60 border border-white/5 p-10 rounded-[40px] flex flex-col justify-center items-center gap-3 group hover:bg-[#141814] transition-all relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 p-10 bg-[#4caf50]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <span className="text-[11px] text-gray-400 font-black uppercase tracking-[0.2em] relative z-10 opacity-70">Bộ truyện đã xem</span>
                    <div className="flex items-baseline gap-2 relative z-10">
                      <span className="text-6xl font-black text-white italic group-hover:text-[#4caf50] transition-colors drop-shadow-2xl">{stats.total_mangas}</span>
                    </div>
                  </div>
                  <div className="bg-[#141814]/60 border border-white/5 p-10 rounded-[40px] flex flex-col justify-center items-center gap-3 group hover:bg-[#141814] transition-all relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 p-10 bg-[#4caf50]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <span className="text-[11px] text-gray-400 font-black uppercase tracking-[0.2em] relative z-10 opacity-70">Chương đã đọc</span>
                    <div className="flex items-baseline gap-2 relative z-10">
                      <span className="text-6xl font-black text-white italic group-hover:text-[#4caf50] transition-colors drop-shadow-2xl">{stats.total_chapters}</span>
                    </div>
                  </div>
                </div>
            </div>

            {/* 🎁 DAILY LUCKY DRAW (CHỈ HIỆN VỚI CHỦ SỞ HỮU HỒ SƠ) */}
            <AnimatePresence>
               {isOwner && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="relative p-8 bg-gradient-to-br from-[#1c221c] to-[#0a0c0a] border border-[#4caf50]/20 rounded-[40px] shadow-2xl overflow-hidden group"
                  >
                     {/* Background Glow */}
                     <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#4caf50]/10 rounded-full blur-[60px] group-hover:bg-[#4caf50]/20 transition-all"></div>
                     
                     <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                        <div className="w-20 h-20 bg-black/40 rounded-3xl flex items-center justify-center text-4xl border border-white/5 shadow-inner transform group-hover:rotate-12 transition-transform duration-500">
                           {isDrawing ? "⏳" : "🎁"}
                        </div>
                        <div className="flex-1 text-center md:text-left space-y-1">
                           <h3 className="text-sm font-black text-white uppercase tracking-widest">Hộp Quà May Mắn Shiroi</h3>
                           <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Mở quà mỗi ngày để nhận ngẫu nhiên tối đa 500 XP!</p>
                        </div>
                        <button 
                          onClick={handleLuckyDraw}
                          disabled={isDrawing}
                          className={`px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 whitespace-nowrap ${isDrawing ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-[#4caf50] text-[#0a0c0a] hover:shadow-[0_10px_30px_rgba(76,175,80,0.3)] hover:scale-105'}`}
                        >
                           {isDrawing ? "ĐANG TRIỆU HỒI..." : "MỞ QUÀ NGAY 💮"}
                        </button>
                     </div>

                     {/* Result Toast Overlay */}
                     <AnimatePresence>
                        {drawResult && (
                           <motion.div 
                             initial={{ scale: 0.8, opacity: 0 }}
                             animate={{ scale: 1, opacity: 1 }}
                             exit={{ scale: 1.2, opacity: 0 }}
                             className="absolute inset-0 bg-[#4caf50] flex flex-col items-center justify-center space-y-2 z-50 text-[#0a0c0a]"
                           >
                              <span className="text-4xl animate-bounce">🧧</span>
                              <div className="text-2xl font-black tracking-tighter">BẠN NHẬN ĐƯỢC +{drawResult} XP!</div>
                              <div className="text-[9px] font-black uppercase tracking-widest opacity-60 italic">Đã đồng bộ vào Thánh tích Shiroi</div>
                           </motion.div>
                        )}
                     </AnimatePresence>
                  </motion.div>
               )}
            </AnimatePresence>

            {/* ACTION BUTTONS */}
            <div className="flex items-center gap-4 pt-6">
               <button onClick={() => router.back()} className="flex-1 py-6 bg-white/5 border border-white/5 text-white font-black rounded-[32px] text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-3 shadow-xl">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                  Quay lại
               </button>
               <Link href="/" className="flex-1 py-6 bg-[#4caf50] text-[#0a0c0a] font-black rounded-[32px] text-[10px] uppercase tracking-widest shadow-[0_20px_40px_rgba(76,175,80,0.25)] hover:scale-[1.03] active:scale-95 transition-all text-center">
                  Đồng hành cùng {targetUser.display_name?.split(' ')[0]} 📖
               </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
