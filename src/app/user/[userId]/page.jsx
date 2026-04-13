'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { calculateLevel, calculateProgress, calculateTitle, TITLES } from '@/lib/xp';
import Link from 'next/link';
import { optimizeImage } from '@/lib/cloudinary';

export default function PublicProfilePage() {
  const params = useParams();
  const userId = params.userId;
  const router = useRouter();
  
  const [targetUser, setTargetUser] = useState(null);
  const [stats, setStats] = useState({ total_mangas: 0, total_chapters: 0 });
  const [xpLogs, setXpLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userId) fetchUserData();
  }, [userId]);

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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0c0a]">
      <div className="text-[#4caf50] font-black animate-pulse text-[10px] uppercase tracking-widest italic">Đang triệu hồi ký ức thành viên...</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0c0a] text-center p-6">
      <div className="text-6xl mb-6"> Desert Desert Desert 🏜️ Desert Desert Desert 🏜️ Desert Desert Desert 🏜️</div>
      <h1 className="text-xl font-black text-white uppercase tracking-widest mb-4">{error}</h1>
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

          {/* RIGHT COLUMN: STATS & ACTIVITY */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* STATS GRID */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#141814]/60 border border-white/5 p-8 rounded-[40px] flex flex-col justify-center items-center gap-2 group hover:bg-[#141814] transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 bg-[#4caf50]/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest relative z-10">Bộ truyện đã xem</span>
                <div className="flex items-baseline gap-2 relative z-10">
                  <span className="text-5xl font-black text-white italic group-hover:text-[#4caf50] transition-colors">{stats.total_mangas}</span>
                </div>
              </div>
              <div className="bg-[#141814]/60 border border-white/5 p-8 rounded-[40px] flex flex-col justify-center items-center gap-2 group hover:bg-[#141814] transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 bg-blue-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest relative z-10">Chương đã đọc</span>
                <div className="flex items-baseline gap-2 relative z-10">
                  <span className="text-5xl font-black text-white italic group-hover:text-[#4caf50] transition-colors">{stats.total_chapters}</span>
                </div>
              </div>
            </div>

            {/* RECENT ACTIVITY */}
            <div className="bg-[#141814]/40 border border-white/5 rounded-[40px] p-8 space-y-6 relative overflow-hidden shadow-2xl">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#4caf50]/20 to-transparent"></div>
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-xl shadow-inner">🕰️</div>
                     <h3 className="text-sm font-black text-white uppercase tracking-widest">Dấu ấn tu luyện</h3>
                  </div>
                  <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest italic">Hoạt động mới nhất</span>
               </div>

               <div className="space-y-3">
                  {xpLogs.length > 0 ? xpLogs.map((log) => {
                     const typeInfo = {
                        'read': { label: 'Đọc truyện', icon: '📖', color: 'text-blue-400' },
                        'checkin': { label: 'Điểm danh', icon: '🗓️', color: 'text-amber-400' },
                        'comment': { label: 'Bình luận', icon: '💬', color: 'text-purple-400' }
                     }[log.type] || { label: 'Cống hiến', icon: '✨', color: 'text-[#4caf50]' };

                     return (
                        <div key={log.id} className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
                           <div className="flex items-center gap-4">
                              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-sm group-hover:scale-110 transition-transform">
                                 {typeInfo.icon}
                              </div>
                              <div>
                                 <div className="text-[10px] font-black text-white uppercase tracking-tight">{typeInfo.label}</div>
                                 <div className="text-[8px] text-gray-600 font-bold italic">{new Date(log.created_at).toLocaleDateString('vi-VN')}</div>
                              </div>
                           </div>
                           <div className="text-right">
                              <div className={`text-xs font-black ${typeInfo.color}`}>+{log.amount} XP</div>
                           </div>
                        </div>
                     );
                  }) : (
                     <div className="py-10 text-center text-[10px] font-black uppercase text-gray-700 tracking-widest italic opacity-50">
                        Chưa ghi nhận hoạt động nào... ✨
                     </div>
                  )}
               </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center gap-4 pt-4">
               <button onClick={() => router.back()} className="flex-1 py-5 bg-white/5 border border-white/5 text-white font-black rounded-3xl text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                  Quay lại
               </button>
               <Link href="/" className="flex-1 py-5 bg-[#4caf50] text-[#0a0c0a] font-black rounded-3xl text-[10px] uppercase tracking-widest shadow-[0_15px_30px_rgba(76,175,80,0.3)] hover:scale-[1.03] transition-all text-center">
                  Đọc truyện cùng {targetUser.display_name?.split(' ')[0]} 📖
               </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
