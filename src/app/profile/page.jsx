'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { calculateLevel, calculateProgress, calculateTitle, TITLES, XP_REWARDS, getStreakBonus, recordXpLog } from '@/lib/xp';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false); // TRẠNG THÁI RIÊNG CHO AVATAR 🍀
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState({ total_mangas: 0, total_chapters: 0 });
  const [xpLogs, setXpLogs] = useState([]);
  const [checkInDates, setCheckInDates] = useState([]); // 📅 Các ngày đã điểm danh THÁNG NÀY 🍀
  const [totalCheckIns, setTotalCheckIns] = useState(0); // 🔥 Tổng số ngày điểm danh trọn đời 🍀
  const fileInputRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const storedUser = localStorage.getItem('shiroi_user');
      if (!storedUser) {
        router.push('/login');
        return;
      }

      try {
        const userData = JSON.parse(storedUser);
        const { data, error } = await supabase
          .from('shiroi_users')
          .select('*')
          .eq('id', userData.id) // ĐỒNG BỘ THEO ID - CHUẨN XÁC 100% 🛡️
          .single();

        if (!error && data) {
          setUser(data);
          setDisplayName(data.display_name || '');
          setBio(data.bio || '');
          setAvatarUrl(data.avatar_url || '');
          localStorage.setItem('shiroi_user', JSON.stringify(data));
          fetchStats(data.id);
          fetchXpLogs(data.id);
        } else {
          setUser(userData);
          fetchStats(userData.id);
          fetchXpLogs(userData.id);
        }
      } catch (err) {
        console.error("Lỗi đồng bộ:", err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [router]);

  const fetchStats = async (userId) => {
    try {
      if (!userId) return;

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
    } catch (err) {
      console.error("Lỗi tải thống kê:", err);
    }
  };

  const fetchXpLogs = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('shiroi_xp_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (!error && data) {
        setXpLogs(data);
        
        // 📅 Lọc các ngày điểm danh CHỈ TRONG THÁNG NÀY (BẢN NÂNG CẤP 🛡️)
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        
        // Truy vấn riêng biệt để không bị trôi log khi đọc quá nhiều truyện 🍀
        const { data: checkInData, error: checkInError } = await supabase
          .from('shiroi_xp_logs')
          .select('created_at')
          .eq('user_id', userId)
          .eq('type', 'check_in') // 🔍 Sửa lỗi: Phải là check_in 🛡️
          .gte('created_at', startOfMonth);
        
        if (!checkInError && checkInData) {
          // 🇻🇳 CHUYỂN ĐỔI NGÀY SANG DẠNG CHUỖI 'YYYY-MM-DD' (VN) ĐỂ SO SÁNH CHUẨN XÁC 🛡️
          const dates = checkInData.map(log => 
            new Date(log.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
          );
          setCheckInDates(dates);
        }

        // 🔥 Lấy TỔNG SỐ NGÀY điểm danh trọn đời 🛡️
        const { count, error: countErr } = await supabase
          .from('shiroi_xp_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('type', 'check_in'); // 🔍 Sửa lỗi: Phải là check_in 🛡️
        
        if (!countErr) setTotalCheckIns(count || 0);
      }
    } catch (err) {
      console.error("Lỗi lấy nhật ký XP:", err);
    }
  };

  const handleCheckIn = async () => {
    if (!user || checkInLoading) return;

    try {
      setCheckInLoading(true);
      setMessage('Đang kết nối Thánh địa để xác thực... ✨');

      const { performCheckInAction } = await import('@/lib/actions');
      const res = await performCheckInAction();

      if (res.success) {
        setUser(res.user);
        localStorage.setItem('shiroi_user', JSON.stringify(res.user));
        
        // ✨ CẬP NHẬT UI NGAY LẬP TỨC 🍀
        const todayDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
        setCheckInDates(prev => [...new Set([...prev, todayDateStr])]);
        setTotalCheckIns(prev => prev + 1);

        setMessage(`ĐIỂM DANH THÀNH CÔNG! +${res.xpGain} XP 💎`);
        window.dispatchEvent(new Event('storage'));
        await fetchXpLogs(user.id);
      } else {
        setMessage(res.error || 'Hệ thống bận, vui lòng thử lại sau! 🙏');
      }
    } catch (err) {
      console.error("Lỗi điểm danh:", err);
      setMessage(`Lỗi hệ thống: ${err.message}`);
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    try {
      setAvatarLoading(true);
      setMessage('Đang truyền ảnh lên mây Shiroi... ☁️');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`; // DÙNG ID ĐỂ ĐỊNH DANH 🛡️
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 🚀 LƯU LUÔN VÀO DATABASE (INSTANT SAVE UX)
      const { data: updatedUser, error: updateError } = await supabase
        .from('shiroi_users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      if (updatedUser) {
        setAvatarUrl(publicUrl);
        setUser(updatedUser);
        localStorage.setItem('shiroi_user', JSON.stringify(updatedUser));
        setMessage('DIỆN MẠO MỚI ĐÃ ĐƯỢC CẬP NHẬT! 🍀✨');
        window.dispatchEvent(new Event('storage'));
      }
    } catch (err) {
      console.error("Lỗi thay ảnh:", err);
      setMessage(`Lỗi: ${err.message}`);
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setMessage('');

    try {
      const { data, error } = await supabase
        .from('shiroi_users')
        .update({
          display_name: displayName.trim(),
          bio: bio.trim(),
          avatar_url: avatarUrl
        })
        .eq('id', user.id)
        .select()
        .single();

      if (!error && data) {
        localStorage.setItem('shiroi_user', JSON.stringify(data));
        setUser(data);
        setMessage('THÀNH CÔNG! HỒ SƠ ĐÃ ĐƯỢC CHỨNG THỰC! 🍀');
        window.dispatchEvent(new Event('storage'));
      } else {
        setMessage('LỖI: HÃY THỬ ĐĂNG XUẤT VÀ ĐĂNG NHẬP LẠI! 🆘');
      }
    } catch (err) {
      setMessage(`LỖI LƯU TRỮ: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0c0a]">
      <div className="text-[#4caf50] font-black animate-pulse text-[10px] uppercase tracking-widest italic">Đang kết nối Thánh địa Shiroi...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0c0a] text-white p-6 pt-24 relative overflow-x-hidden">
      <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-[#4caf50]/5 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="max-w-2xl mx-auto z-10 relative space-y-16">
        <div className="flex flex-col items-center gap-10 text-center">
          <div className="relative group p-1 bg-gradient-to-br from-[#4caf50]/20 to-transparent rounded-[56px] shadow-[0_0_50px_rgba(76,175,80,0.1)]">
            <div 
              onClick={() => fileInputRef.current.click()}
              className="w-56 h-56 rounded-[48px] overflow-hidden border-4 border-[#141814] shadow-2xl bg-[#0a0c0a] flex shrink-0 relative group/avatar cursor-pointer hover:border-[#4caf50]/40 transition-all active:scale-95"
            >
              {avatarUrl ? (
                <img src={avatarUrl} className={`w-full h-full object-cover animate-fade-in border-4 border-[#4caf50]/20 transition-all duration-500 ${avatarLoading ? 'blur-sm grayscale opacity-50' : ''}`} alt="Avatar" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#4caf50] text-7xl font-black italic shadow-inner">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
              )}
              
              {/* LOADING OVERLAY 🌀 */}
              {avatarLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-30">
                   <div className="w-12 h-12 border-4 border-[#4caf50]/10 border-t-[#4caf50] rounded-full animate-spin shadow-[0_0_20px_rgba(76,175,80,0.5)]"></div>
                </div>
              )}

              {/* MOBILE TIP & ICON 📱 */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 md:group-hover/avatar:opacity-100 sm:opacity-0 transition-opacity flex flex-col items-center justify-center gap-2 z-20">
                <div className="w-12 h-12 bg-[#4caf50] text-[#0a0c0a] rounded-2xl flex items-center justify-center shadow-lg">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path></svg>
                </div>
                <span className="text-white text-[10px] font-black uppercase tracking-[0.2em] hidden md:block">Thay hình đổi diện 🍀</span>
                <span className="text-white text-[8px] font-black uppercase tracking-[0.2em] md:hidden">Chạm để thay ảnh</span>
              </div>
            </div>

            {/* FLOATING ACTION BUTTON FOR MOBILE 📱 */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }}
              className="absolute -bottom-2 -right-2 p-5 bg-[#4caf50] text-[#0a0c0a] rounded-[24px] shadow-[0_10px_30px_rgba(76,175,80,0.4)] hover:scale-110 active:scale-90 transition-all z-20 md:hidden"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            </button>
          </div>

          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />

          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2">
              {user && (user.selected_badge || calculateTitle(user.xp).name) && (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-black px-6 py-2 rounded-xl border border-[#4caf50]/30 text-[#4caf50] uppercase tracking-[0.4em] bg-[#4caf50]/15 shadow-[0_0_30px_rgba(76,175,80,0.2)] animate-pulse border-t-[#4caf50]/60">
                    {user.selected_badge || calculateTitle(user.xp).name}
                  </span>
                  {user.selected_badge && user.selected_badge !== calculateTitle(user.xp).name && (
                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest opacity-40">
                       DANH HIỆU GỐC: {calculateTitle(user.xp).name}
                    </span>
                  )}
                </div>
              )}
              <h1 className="text-5xl font-black tracking-tight uppercase gradient-text drop-shadow-2xl">{user?.display_name || user?.username}</h1>
            </div>
          </div>

          {/* DAILY CHECK-IN & STATS 💎 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            <div className={`p-8 rounded-[48px] border-2 transition-all duration-700 relative overflow-hidden flex flex-col items-center gap-6 group ${
                user?.last_check_in && new Date(user.last_check_in).toDateString() === new Date().toDateString()
                ? 'bg-[#141814]/40 border-white/10 shadow-inner'
                : 'bg-gradient-to-br from-[#1a221a] to-[#0a0c0a] border-[#4caf50]/20 shadow-[0_20px_50px_rgba(76,175,80,0.1)] hover:border-[#4caf50]/40'
              }`}>
              <div className="absolute top-0 right-0 p-10 bg-[#4caf50]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#4caf50] animate-pulse">Daily Blessing</span>
                <h3 className="text-2xl font-black italic text-white uppercase tracking-tighter">Chuỗi điểm danh</h3>
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className="text-5xl mb-2 group-hover:scale-125 transition-transform duration-500 drop-shadow-[0_0_20px_rgba(255,165,0,0.5)]">🔥</div>
                <div className="flex flex-col gap-2">
                   <div className="px-5 py-2 bg-[#4caf50]/10 rounded-2xl border border-[#4caf50]/20 backdrop-blur-md text-center">
                      <span className="text-[10px] font-black text-[#4caf50] uppercase tracking-widest whitespace-nowrap">
                         Chuỗi hiện tại: <span className="text-xl">{user?.check_in_streak || 0}</span> ngày
                      </span>
                   </div>
                   <div className="px-5 py-2 bg-black/60 rounded-2xl border border-white/10 backdrop-blur-md text-center">
                      <span className="text-[9px] font-black text-white/60 uppercase tracking-widest whitespace-nowrap">
                         Tổng tích lũy: <span className="text-white text-lg">{totalCheckIns}</span> ngày ⚡
                      </span>
                   </div>
                </div>
              </div>

              <button
                disabled={checkInLoading || (user?.last_check_in && new Date(user.last_check_in).toDateString() === new Date().toDateString())}
                onClick={handleCheckIn}
                className="w-full py-5 bg-[#4caf50] text-[#0a0c0a] font-black rounded-3xl text-xs uppercase tracking-widest shadow-[0_15px_30px_rgba(76,175,80,0.3)] hover:scale-[1.03] active:scale-95 transition-all disabled:bg-white/5 disabled:text-gray-600 disabled:shadow-none disabled:cursor-not-allowed"
              >
                {checkInLoading ? 'ĐANG ĐIỂM DANH...' : (user?.last_check_in && new Date(user.last_check_in).toDateString() === new Date().toDateString() ? 'ĐÃ NHẬN HÔM NAY' : 'ĐIỂM DANH NGAY ✨')}
              </button>

              {/* 📅 CALENDAR GRID 🍀 */}
              <div className="w-full pt-6 border-t border-white/5 space-y-4">
                 <div className="flex items-center justify-between px-1">
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Lịch tháng {new Date().getMonth() + 1}</span>
                    <span className="text-[9px] font-black text-[#4caf50] uppercase tracking-widest">{(checkInDates.length / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() * 100).toFixed(0)}% Lấp đầy</span>
                 </div>
                 <div className="grid grid-cols-7 gap-1.5">
                    {(() => {
                        const now = new Date();
                        const year = now.getFullYear();
                        const month = now.getMonth();
                        const daysInMonth = new Date(year, month + 1, 0).getDate();
                        const firstDay = new Date(year, month, 1).getDay();
                        
                        const calendar = [];
                        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

                        // Padding cho ngày trống đầu tuần
                        for (let i = 0; i < firstDay; i++) {
                            calendar.push(<div key={`empty-${i}`} className="aspect-square opacity-0"></div>);
                        }
                        // Các ngày trong tháng
                        for (let d = 1; d <= daysInMonth; d++) {
                            const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                            const isChecked = checkInDates.includes(dayStr);
                            const isToday = dayStr === todayStr;
                            const isPast = dayStr < todayStr;
                            
                            calendar.push(
                                <div 
                                    key={`day-${d}`} 
                                    title={`Ngày ${d}`}
                                    className={`aspect-square rounded-lg flex items-center justify-center text-[9px] font-black transition-all relative
                                        ${isChecked ? 'bg-[#4caf50] text-[#0a0c0a] shadow-[0_0_15px_rgba(76,175,80,0.4)] scale-105 z-10' : 
                                          isToday ? 'border-2 border-[#4caf50]/50 text-[#4caf50] animate-pulse' :
                                          isPast ? 'bg-white/5 text-gray-700' : 'bg-white/[0.02] text-gray-800'}
                                    `}
                                >
                                    {d}
                                </div>
                            );
                        }
                        return calendar;
                    })()}
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 h-full">
               <div className="bg-[#141814]/60 border border-white/5 p-8 rounded-[40px] flex flex-col justify-center items-center gap-2 group hover:bg-[#141814] transition-all">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Hành trình đã đi</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-white italic group-hover:text-[#4caf50] transition-colors">{stats.total_mangas}</span>
                    <span className="text-[10px] font-black text-gray-500 uppercase">Bộ truyện</span>
                  </div>
               </div>
               <div className="bg-[#141814]/60 border border-white/5 p-8 rounded-[40px] flex flex-col justify-center items-center gap-2 group hover:bg-[#141814] transition-all">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Kiến thức tích lũy</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-white italic group-hover:text-[#4caf50] transition-colors">{stats.total_chapters}</span>
                    <span className="text-[10px] font-black text-gray-500 uppercase">Chương đọc</span>
                  </div>
               </div>
            </div>
          </div>

          {/* GAMIFICATION STATS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            <div className="bg-gradient-to-br from-[#141814] to-black border border-white/5 p-6 rounded-[32px] flex flex-col items-center gap-2 shadow-xl">
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest opacity-60">Cấp độ hiện tại</span>
              <span className="text-4xl font-black text-[#4caf50] italic drop-shadow-[0_0_15px_rgba(76,175,80,0.3)]">{calculateLevel(user?.xp)}</span>
            </div>
            <div className="bg-gradient-to-br from-[#141814] to-black border border-white/5 p-6 rounded-[32px] flex flex-col items-center gap-2 shadow-xl">
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest opacity-60">Tổng Thánh tích (XP)</span>
              <span className="text-4xl font-black text-gray-200 italic">{user?.xp || 0}</span>
            </div>
            <div className="bg-gradient-to-br from-[#141814] to-black border border-white/5 p-6 rounded-[32px] flex flex-col items-center gap-2 shadow-xl">
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest opacity-60">Tiến trình ({calculateProgress(user?.xp)}/100)</span>
              <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden mt-2 border border-white/5">
                <div className="h-full bg-gradient-to-r from-[#4caf50] to-[#81c784] shadow-[0_0_15px_#4caf50]" style={{ width: `${calculateProgress(user?.xp)}%` }}></div>
              </div>
            </div>
          </div>

          {/* SET SELECTION SYSTEM 🏆 */}
          <div className="w-full space-y-8 animate-fade-in-up">
            <div className="flex items-center gap-3 px-2">
              <div className="w-1.5 h-6 bg-[#4caf50] rounded-full"></div>
              <h2 className="text-xl font-black uppercase tracking-tighter text-white">Thánh tích & Danh hiệu</h2>
            </div>

            {/* 📜 HƯỚNG DẪN TU LUYỆN (XP GUIDE) 🍀 */}
            <div className="bg-[#141814]/40 border border-[#4caf50]/10 rounded-[40px] p-8 space-y-6 animate-fade-in relative group overflow-hidden">
               <div className="absolute top-0 right-0 p-12 bg-[#4caf50]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-[#4caf50]/10 transition-all"></div>
               
               <div className="flex items-center gap-4 mb-2">
                  <div className="w-10 h-10 bg-[#4caf50]/20 rounded-xl flex items-center justify-center text-xl shadow-[0_0_15px_rgba(76,175,80,0.2)]">📜</div>
                  <h3 className="text-sm font-black text-[#4caf50] uppercase tracking-widest">Bí kíp thăng cấp Shiroi</h3>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="p-5 bg-black/40 rounded-3xl border border-white/5 space-y-2 group/item hover:border-[#4caf50]/30 transition-all">
                      <div className="flex items-center gap-2">
                         <span className="text-lg">🎯</span>
                         <span className="text-[10px] font-black text-[#4caf50] uppercase tracking-wider">Làm Nhiệm vụ</span>
                      </div>
                      <p className="text-[9px] text-gray-500 font-bold leading-relaxed">
                         Hoàn thành các nhiệm vụ tại mục <span className="text-[#4caf50]">Nhiệm vụ & Thưởng</span> để nhận lượng lớn XP.
                      </p>
                   </div>

                   <div className="p-5 bg-black/40 rounded-3xl border border-white/5 space-y-2 group/item hover:border-[#4caf50]/30 transition-all">
                      <div className="flex items-center gap-2">
                         <span className="text-lg">📖</span>
                         <span className="text-[10px] font-black text-white uppercase tracking-wider">Đọc truyện</span>
                      </div>
                      <p className="text-[9px] text-gray-500 font-bold leading-relaxed">
                         Mỗi chương truyện đọc xong giúp tích lũy <span className="text-[#4caf50]">+20 XP</span>. <br/>
                         (Chỉ tính 1 lần duy nhất cho mỗi chương).
                      </p>
                   </div>

                   <div className="p-5 bg-black/40 rounded-3xl border border-white/5 space-y-2 group/item hover:border-[#4caf50]/30 transition-all">
                      <div className="flex items-center gap-2">
                         <span className="text-lg">💬</span>
                         <span className="text-[10px] font-black text-white uppercase tracking-wider">Bình luận</span>
                      </div>
                      <p className="text-[9px] text-gray-500 font-bold leading-relaxed">
                         Bình luận nhận <span className="text-[#4caf50]">+5 đến +10 XP</span> mỗi lần. <br/>
                         (Giới hạn tối đa 10 bình luận chất lượng mỗi ngày).
                      </p>
                   </div>

                   <div className="p-5 bg-black/40 rounded-3xl border border-white/5 space-y-2 group/item hover:border-[#4caf50]/30 transition-all">
                      <div className="flex items-center gap-2">
                         <span className="text-lg">🗓️</span>
                         <span className="text-[10px] font-black text-white uppercase tracking-wider">Điểm danh</span>
                      </div>
                      <p className="text-[9px] text-gray-500 font-bold leading-relaxed">
                         Mỗi ngày nhận <span className="text-[#4caf50]">+100 XP</span>. <br/>
                         Chuỗi: 7đ (+200), 14đ/21đ (+500), 30đ (+1000)!
                      </p>
                   </div>

                   <div className="p-5 bg-black/40 rounded-3xl border border-white/5 space-y-2 group/item hover:border-[#4caf50]/30 transition-all">
                      <div className="flex items-center gap-2">
                         <span className="text-lg">🧧</span>
                         <span className="text-[10px] font-black text-[#4caf50] uppercase tracking-wider">Vận khí</span>
                      </div>
                      <p className="text-[9px] text-gray-500 font-bold leading-relaxed">
                         Bốc quà hàng ngày nhận <span className="text-[#4caf50]">10-500 XP</span>. <br/>
                         Vận may sẽ đến với người kiên trì!
                      </p>
                   </div>

                   <div className="p-5 bg-black/40 rounded-3xl border border-white/5 space-y-2 group/item hover:border-[#4caf50]/30 transition-all">
                      <div className="flex items-center gap-2">
                         <span className="text-lg">⚡</span>
                         <span className="text-[10px] font-black text-white uppercase tracking-wider">Thăng cấp</span>
                      </div>
                      <p className="text-[9px] text-gray-500 font-bold leading-relaxed">
                         Cứ mỗi <span className="text-[#4caf50]">100 XP</span> bạn sẽ thăng 1 cấp. <br/>
                         Cấp càng cao, danh hiệu và quyền hạn càng lớn!
                      </p>
                   </div>
               </div>
            </div>

            {/* 🕰️ NHẬT KÝ TU LUYỆN (XP HISTORY) 🍀 */}
            <div className="bg-[#141814]/40 border border-white/5 rounded-[40px] p-8 space-y-6 animate-fade-in relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#4caf50]/20 to-transparent"></div>
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-xl">🕰️</div>
                     <h3 className="text-sm font-black text-white uppercase tracking-widest">Nhật ký tu luyện</h3>
                  </div>
                  <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest italic">100 giao dịch gần nhất</span>
               </div>

               <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {xpLogs && xpLogs.length > 0 ? xpLogs.map((log) => {
                      const typeInfo = {
                        'read': { label: 'Đọc truyện', icon: '📖', color: 'text-blue-400' },
                        'check_in': { label: 'Điểm danh', icon: '🗓️', color: 'text-amber-400' },
                        'comment': { label: 'Bình luận', icon: '💬', color: 'text-purple-400' },
                        'lucky_draw': { label: 'Bốc quà', icon: '🧧', color: 'text-[#4caf50]' },
                        'mission': { label: 'Nhiệm vụ', icon: '🎯', color: 'text-[#4caf50]' }
                     }[log.type] || { label: 'Khác', icon: '✨', color: 'text-gray-400' };

                     return (
                        <div key={log.id} className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
                           <div className="flex items-center gap-4">
                              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-sm group-hover:scale-110 transition-transform">
                                 {typeInfo.icon}
                              </div>
                              <div>
                                 <div className="text-[10px] font-black text-white uppercase tracking-tight">{typeInfo.label}</div>
                                 <div className="text-[8px] text-gray-600 font-bold">{new Date(log.created_at).toLocaleString('vi-VN')}</div>
                              </div>
                           </div>
                           <div className="text-right">
                              <div className={`text-xs font-black ${typeInfo.color}`}>+{log.amount} XP</div>
                              {log.reason && log.reason.includes('Streak') && (
                                 <div className="text-[7px] font-black text-amber-500/80 uppercase tracking-tighter">🔥 {log.reason}</div>
                              )}
                           </div>
                        </div>
                     );
                  }) : (
                     <div className="py-10 text-center text-[10px] font-black uppercase text-gray-700 tracking-widest italic opacity-50">
                        Chưa có dấu ấn tu luyện nào... ✨
                     </div>
                  )}
               </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {TITLES.slice().reverse().map(badge => {
                const userLv = calculateLevel(user?.xp);
                const isUnlocked = userLv >= badge.lv;
                const isSelected = user?.selected_badge === badge.name || (!user?.selected_badge && badge.name === 'Vô danh tiểu tốt');

                return (
                  <button
                    key={badge.name}
                    disabled={!isUnlocked || updating}
                    onClick={async () => {
                      try {
                        setUpdating(true);
                        const { data, error } = await supabase
                          .from('shiroi_users')
                          .update({ selected_badge: badge.name })
                          .eq('id', user.id)
                          .select().single();

                        if (!error && data) {
                          setUser(data);
                          localStorage.setItem('shiroi_user', JSON.stringify(data));
                          window.dispatchEvent(new Event('storage'));
                        }
                      } finally {
                        setUpdating(false);
                      }
                    }}
                    className={`p-4 rounded-[24px] flex flex-col items-center justify-center gap-2 text-center transition-all duration-500 relative border ${isSelected
                        ? 'bg-[#4caf50]/10 border-[#4caf50] shadow-[0_0_20px_rgba(76,175,80,0.2)] scale-105'
                        : isUnlocked
                          ? 'bg-[#141814] border-white/5 hover:border-[#4caf50]/30 hover:-translate-y-1'
                          : 'bg-black/40 border-white/5 opacity-40 grayscale pointer-events-none'
                      }`}
                  >
                    <div className="flex flex-col gap-1 items-center">
                      <span className={`text-[9px] font-black uppercase truncate w-full ${isSelected ? 'text-[#4caf50]' : 'text-white'}`}>{badge.name}</span>
                      <span className={`text-[7px] font-black uppercase ${isUnlocked ? (isSelected ? 'text-[#4caf50]/80' : 'text-[#4caf50]/60') : 'text-gray-700'}`}>
                        {isUnlocked ? (isSelected ? 'ĐANG DÙNG' : 'CHỌN') : `CẤP ${badge.lv}`}
                      </span>
                    </div>
                    {isSelected && (
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#4caf50] rounded-full flex items-center justify-center border-2 border-[#0a0c0a] shadow-lg">
                        <svg className="w-2.5 h-2.5 text-[#0a0c0a]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdate} className="bg-[#141814]/70 backdrop-blur-3xl border border-white/5 p-8 md:p-14 rounded-[64px] shadow-2xl relative space-y-10">
          <div className="w-full relative">
            <label htmlFor="display_name" className="block text-[10px] font-black text-[#4caf50] uppercase tracking-widest mb-3 ml-1">Biệt hiệu hiển thị</label>
            <input
              id="display_name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-black/40 border border-white/5 rounded-3xl py-5 px-8 text-sm focus:border-[#4caf50] outline-none transition-all text-white font-black"
            />
          </div>

          <div className="relative">
            <label htmlFor="bio" className="block text-[10px] font-black text-[#4caf50] uppercase tracking-widest mb-3 ml-1">Lời giới thiệu cá nhân</label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-black/40 border border-white/5 rounded-[32px] py-6 px-8 text-sm focus:border-[#4caf50] outline-none transition-all text-gray-300 min-h-[160px] resize-none"
            ></textarea>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-6 border-t border-white/5">
            {message && <span className={`text-[10px] font-black uppercase tracking-tight ${message.includes('LỖI') ? 'text-red-500' : 'text-[#4caf50]'}`}>{message}</span>}
            <button
              disabled={updating}
              className="w-full md:w-auto px-16 py-5 bg-[#4caf50] text-[#0a0c0a] font-black rounded-3xl shadow-2xl hover:scale-105 active:scale-95 transition-all text-xs uppercase"
            >
              {updating ? 'ĐANG LƯU...' : 'XÁC NHẬN LƯU 🍀'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
