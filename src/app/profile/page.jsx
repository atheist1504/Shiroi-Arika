'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { calculateLevel, calculateProgress, calculateTitle, TITLES, XP_REWARDS, getStreakBonus, recordXpLog } from '@/lib/xp';
import { getNotificationsAction, markNotificationAsReadAction, cleanupNotificationsAction, updateUserProfileAction } from '@/lib/actions';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

// 🛡️ HÀM HELPER: Kiểm tra và định dạng thời gian an toàn 🍀
const formatSafeDistance = (dateStr) => {
  try {
    if (!dateStr) return "Vừa xong";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Vừa xong";
    return formatDistanceToNow(d, { addSuffix: true, locale: vi });
  } catch (err) {
    return "Vừa xong";
  }
};

export default function ProfilePage() {
  return (
    <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0a0c0a]">
            <div className="text-[#4caf50] font-black animate-pulse text-[10px] uppercase tracking-widest italic">Đang tải Thánh địa Shiroi...</div>
        </div>
    }>
        <ProfileContent />
    </Suspense>
  );
}

function ProfileContent() {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';
  const router = useRouter();

  // 🔐 STATE CHO ĐỔI MẬT KHẨU 🛡️
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdUpdating, setPwdUpdating] = useState(false);
  const [pwdMessage, setPwdMessage] = useState('');

  // 🕵️‍♂️ STATE CHO GỢI Ý DANH HIỆU 💡
  const [showSuggestForm, setShowSuggestForm] = useState(false);
  const [suggestTitle, setSuggestTitle] = useState('');
  const [suggestReason, setSuggestReason] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [suggestMessage, setSuggestMessage] = useState('');

  // 🕵️‍♂️ STATE CHO DANH HIỆU DYNAMIC 🏆
  const [dynamicTitles, setDynamicTitles] = useState(TITLES); // Mặc định dùng TITLES từ xp.js

  // 🕵️‍♂️ STATE CHO QUẢN TRỊ DANH HIỆU 🛡️
  const [titleSuggestions, setTitleSuggestions] = useState([]);

  // 🕵️‍♂️ STATE CHO QUẢN LÝ NHÂN SỰ 🛡️
  const [searchQuery, setSearchQuery] = useState('');
  const [foundUsers, setFoundUsers] = useState([]);

  const [stats, setStats] = useState({ total_mangas: 0, total_chapters: 0 });
  const [xpLogs, setXpLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [checkInDates, setCheckInDates] = useState([]);
  const [totalCheckIns, setTotalCheckIns] = useState(0);
  const fileInputRef = useRef(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
          .eq('id', userData.id)
          .single();

        if (!error && data) {
          setUser(data);
          setDisplayName(data.display_name || '');
          setBio(data.bio || '');
          setAvatarUrl(data.avatar_url || '');
          localStorage.setItem('shiroi_user', JSON.stringify(data));
          fetchStats(data.id);
          fetchXpLogs(data.id);
          fetchNotifications();
          fetchDynamicTitles();
          
          if (data.role === 'admin' || data.role === 'staff') {
            fetchPersonnel();
            fetchTitleSuggestions();
          }

          cleanupNotificationsAction();
        } else {
            const data = JSON.parse(storedUser);
            setUser(data);
            fetchDynamicTitles();
            if (data.role === 'admin' || data.role === 'staff') {
                fetchPersonnel();
                fetchTitleSuggestions();
            }

            cleanupNotificationsAction();
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
    const { count: mCount } = await supabase.from('shiroi_history').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    const { count: cCount } = await supabase.from('shiroi_read_chapters').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    setStats({ total_mangas: mCount || 0, total_chapters: cCount || 0 });
  };

  const fetchXpLogs = async (userId) => {
    const { data } = await supabase.from('shiroi_xp_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20);
    if (data) setXpLogs(data);
    
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const { data: ciData } = await supabase.from('shiroi_xp_logs').select('created_at').eq('user_id', userId).eq('type', 'check_in').gte('created_at', startOfMonth);
    if (ciData) {
        setCheckInDates(ciData.map(l => new Date(l.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })));
    }
    const { count } = await supabase.from('shiroi_xp_logs').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('type', 'check_in');
    setTotalCheckIns(count || 0);
  };

  const fetchNotifications = async () => {
    const res = await getNotificationsAction(20, 0);
    if (res.success) setNotifications(res.notifications);
  };

  const handleMarkAsRead = async (id) => {
    const res = await markNotificationAsReadAction(id);
    if (res.success) setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleCheckIn = async () => {
    setCheckInLoading(true);
    const { performCheckInAction } = await import('@/lib/actions');
    const res = await performCheckInAction();
    if (res.success) {
      setUser(res.user);
      localStorage.setItem('shiroi_user', JSON.stringify(res.user));
      setMessage('Điểm danh thành công! ✨');
      fetchXpLogs(res.user.id);
    }
    setCheckInLoading(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    setAvatarLoading(true);
    const fileName = `${user.id}-${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('avatars').upload(fileName, file);
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const res = await updateUserProfileAction(user.id, { 
          display_name: displayName, 
          bio: bio, 
          avatar_url: publicUrl,
          selected_badge: user.selected_badge 
      });
      if (res.success) {
        setAvatarUrl(publicUrl);
        setUser(res.user);
        localStorage.setItem('shiroi_user', JSON.stringify(res.user));
      }
    }
    setAvatarLoading(false);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setMessage('');
    const res = await updateUserProfileAction(user.id, { 
        display_name: displayName, 
        bio: bio, 
        avatar_url: avatarUrl,
        selected_badge: user.selected_badge 
    });
    if (res.success) {
        setUser(res.user);
        localStorage.setItem('shiroi_user', JSON.stringify(res.user));
        setMessage('Cập nhật thành công! 🍀');
    } else {
        setMessage(`Lỗi: ${res.error}`);
    }
    setUpdating(false);
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setPwdMessage('Mật khẩu không khớp!'); return; }
    setPwdUpdating(true);
    const { changePasswordAction } = await import('@/lib/actions');
    const res = await changePasswordAction(oldPassword, newPassword);
    setPwdMessage(res.success ? 'Đã đổi mật mã! 🔐' : `Lỗi: ${res.error}`);
    setPwdUpdating(false);
  };

  const handleSuggestTitle = async (e) => {
    e.preventDefault();
    if (!suggestTitle.trim()) return;
    setSuggesting(true);
    setSuggestMessage('');
    const { suggestTitleAction } = await import('@/lib/actions');
    const res = await suggestTitleAction(suggestTitle, suggestReason);
    if (res.success) {
        setSuggestMessage('Cảm ơn đóng góp của bạn! Gợi ý đã được gửi tới Admin. ✨');
        setSuggestTitle('');
        setSuggestReason('');
        setTimeout(() => setShowSuggestForm(false), 3000);
    } else {
        setSuggestMessage(`Lỗi: ${res.error}`);
    }
    setSuggesting(false);
  };

  const fetchDynamicTitles = async () => {
    const { getOfficialTitlesAction } = await import('@/lib/actions');
    const res = await getOfficialTitlesAction();
    if (res.success && res.titles?.length > 0) {
        setDynamicTitles(res.titles);
    }
  };

  const fetchTitleSuggestions = async () => {
    const { getTitleSuggestionsAction } = await import('@/lib/actions');
    const res = await getTitleSuggestionsAction();
    if (res.success) setTitleSuggestions(res.suggestions);
  };

  const handleProcessSuggestion = async (id, status) => {
    const { handleTitleSuggestionAction } = await import('@/lib/actions');
    const res = await handleTitleSuggestionAction(id, status);
    if (res.success) fetchTitleSuggestions();
  };

  const handleDeleteOfficialTitle = async (id) => {
    if (!confirm("Bạn có chắc chắn muốn xóa danh hiệu này không? 🗑️")) return;
    const { deleteOfficialTitleAction } = await import('@/lib/actions');
    const res = await deleteOfficialTitleAction(id);
    if (res.success) fetchDynamicTitles();
  };

  const fetchPersonnel = async () => {
    const { getPersonnelListAction } = await import('@/lib/actions');
    const res = await getPersonnelListAction();
    if (res.success) setFoundUsers(res.users);
  };

  const handleSearchUsers = async (e) => {
    e.preventDefault();
    const { searchUsersAction } = await import('@/lib/actions');
    const res = await searchUsersAction(searchQuery);
    if (res.success) setFoundUsers(res.users);
  };

  const handleUpdateRole = async (targetUserId, newRole) => {
    if (!confirm('Xác nhận đổi chức vụ?')) return;
    const { updateUserRoleAction } = await import('@/lib/actions');
    const res = await updateUserRoleAction(targetUserId, newRole);
    if (res.success) fetchPersonnel();
  };

  const currentDynamicTitle = user ? (() => {
    const lvl = calculateLevel(user.xp);
    const unlocked = dynamicTitles.filter(t => lvl >= t.lv);
    if (user.selected_badge) {
        const selected = dynamicTitles.find(t => t.name.toUpperCase() === user.selected_badge.toUpperCase());
        if (selected && lvl >= selected.lv) return selected;
    }
    return unlocked[0] || dynamicTitles[dynamicTitles.length - 1];
  })() : null;

  if (!isMounted || loading) return <div className="min-h-screen bg-[#0a0c0a] flex items-center justify-center text-[#4caf50]">Đang tải...</div>;

  return (
    <div className="min-h-screen bg-[#0a0c0a] text-white p-6 pt-24 relative overflow-x-hidden">
      <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-[#4caf50]/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-2xl mx-auto z-10 relative space-y-12">
        {/* TIÊU ĐỀ HỒ SƠ */}
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="relative group w-48 h-48 rounded-[48px] overflow-hidden border-4 border-[#141814] bg-[#0a0c0a] cursor-pointer shadow-2xl" onClick={() => fileInputRef.current.click()}>
            <img src={avatarUrl || 'https://psgivxgycjireinwnelc.supabase.co/storage/v1/object/public/avatars/default-avatar.png'} className="w-full h-full object-cover" />
            {avatarLoading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#4caf50] border-t-transparent rounded-full animate-spin" /></div>}
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          
          <div className="flex flex-col items-center gap-3">
            <h1 className="text-4xl font-black gradient-text uppercase tracking-tight">{user?.display_name || user?.username}</h1>
            <div className="px-5 py-2 rounded-2xl border border-[#4caf50]/30 text-[#4caf50] bg-[#4caf50]/10 shadow-[0_0_20px_rgba(76,175,80,0.1)]">
                <span className="text-[11px] font-black uppercase tracking-[0.3em]">
                    {user?.selected_badge || currentDynamicTitle?.name || calculateTitle(user?.xp).name}
                </span>
            </div>
          </div>
        </div>

        {/* CÁC THẺ ĐIỀU HƯỚNG (TABS) */}
        <div className="flex items-center justify-center gap-2 p-1.5 bg-[#141814]/80 rounded-2xl border border-white/5 sticky top-24 z-50">
          {[
            { id: 'profile', icon: '👤', label: 'Hồ sơ' },
            { id: 'settings', icon: '⚙️', label: 'Cài đặt' },
            { id: 'notifications', icon: '🔔', label: 'Thông báo' },
            ...(user?.role === 'admin' ? [{ id: 'admin', icon: '🛡️', label: 'Quản trị' }] : [])
          ].map(t => (
            <Link key={t.id} href={`/profile?tab=${t.id}`} className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-all ${activeTab === t.id ? 'bg-[#4caf50] text-[#0a0c0a] font-black' : 'text-gray-500 hover:text-white'}`}>
              <span>{t.icon}</span>
              <span className="text-[10px] uppercase font-black tracking-widest hidden sm:block">{t.label}</span>
            </Link>
          ))}
        </div>

        {/* NỘI DUNG CÁC TAB */}
        <div className="mt-8 min-h-[400px]">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-[#141814] p-8 rounded-[40px] border border-white/5 flex flex-col items-center gap-4 shadow-xl">
                    <span className="text-[10px] font-black text-[#4caf50] uppercase tracking-widest">Phúc lành mỗi ngày (Điểm danh)</span>
                    <span className="text-5xl">🔥 {user?.check_in_streak || 0}</span>
                    <button onClick={handleCheckIn} disabled={checkInLoading || (user?.last_check_in && new Date(user.last_check_in).toDateString() === new Date().toDateString())} className="w-full py-4 bg-[#4caf50] text-[#0a0c0a] font-black rounded-2xl text-[10px] uppercase tracking-widest disabled:opacity-20 hover:scale-105 transition-all">
                      {checkInLoading ? '...' : 'ĐIỂM DANH NGAY'}
                    </button>
                    <p className="text-[9px] text-gray-500 font-bold">Tổng tích lũy: {totalCheckIns} ngày ✨</p>

                    {/* 📅 LỊCH ĐIỂM DANH THÁNG 🍀 */}
                    <div className="w-full pt-4 border-t border-white/5 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Lịch tháng {new Date().getMonth() + 1}</span>
                            <span className="text-[8px] font-black text-[#4caf50] uppercase tracking-widest">{checkInDates.length} ngày 🔥</span>
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {(() => {
                                const now = new Date();
                                const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
                                const calendar = [];
                                const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
                                for (let i = 0; i < firstDay; i++) calendar.push(<div key={`e-${i}`} className="aspect-square opacity-0"></div>);
                                for (let d = 1; d <= daysInMonth; d++) {
                                    const dStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                    const isChecked = checkInDates.includes(dStr);
                                    calendar.push(<div key={`d-${d}`} className={`aspect-square rounded-md flex items-center justify-center text-[8px] font-black transition-all ${isChecked ? 'bg-[#4caf50] text-[#0a0c0a] shadow-[0_0_10px_#4caf50]' : (dStr === todayStr ? 'border border-[#4caf50] text-[#4caf50] animate-pulse' : 'bg-white/5 text-gray-700')}`}>{d}</div>);
                                }
                                return calendar;
                            })()}
                        </div>
                    </div>
                  </div>

                  <div className="bg-[#141814] p-8 rounded-[40px] border border-white/5 shadow-xl flex flex-col justify-between h-full">
                    {/* ⬆️ CẤP ĐỘ TU LUYỆN (LÊN ĐẦU) 🍀 */}
                    <div className="w-full text-center">
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Cấp độ & Danh hiệu hiện tại</h2>
                        <h1 className="text-2xl font-black text-[#4caf50] uppercase italic tracking-tighter leading-none">{currentDynamicTitle?.name || 'Đang tải...'}</h1>
                       <div className="w-full h-1.5 bg-black/50 rounded-full mt-4 overflow-hidden border border-white/5 relative">
                          <div className="h-full bg-gradient-to-r from-[#4caf50] to-[#81c784] shadow-[0_0_10px_#4caf50]" style={{ width: `${calculateProgress(user?.xp)}%` }} />
                       </div>
                       <div className="flex justify-between items-center mt-3 px-1">
                         <span className="text-[8px] text-gray-600 font-black uppercase">Kinh nghiệm tích lũy</span>
                         <span className="text-[9px] text-[#4caf50] font-black uppercase tracking-widest">{user?.xp || 0} XP</span>
                       </div>
                    </div>

                    {/* 🏆 DANH HIỆU TRUNG TÂM 🍀 */}
                    <div className="flex flex-col items-center py-4 relative">
                        <div className="absolute inset-0 bg-[#4caf50]/5 blur-3xl rounded-full" />
                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-[0.4em] mb-3 relative z-10">Danh phẩm hiện tại</span>
                        <div className="px-6 py-3 rounded-2xl bg-black/40 border border-[#4caf50]/20 relative z-10 shadow-inner group transition-all hover:border-[#4caf50]/50">
                            <span className="text-sm font-black uppercase tracking-[0.1em] gradient-text italic">
                                {user?.selected_badge || calculateTitle(user?.xp).name}
                            </span>
                        </div>
                    </div>

                    {/* ⬇️ THỐNG KÊ (XUỐNG DƯỚI) 🍀 */}
                    <div className="grid grid-cols-2 gap-4 w-full pt-6 border-t border-white/5">
                      <div className="text-center group cursor-default">
                        <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-1 group-hover:text-[#4caf50] transition-colors">Bộ truyện đã đọc</p>
                        <p className="text-3xl font-black italic">{stats.total_mangas}</p>
                      </div>
                      <div className="text-center group cursor-default">
                        <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-1 group-hover:text-[#4caf50] transition-colors">Số chương đã đọc</p>
                        <p className="text-3xl font-black italic">{stats.total_chapters}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 🏆 HỆ THỐNG DANH HIỆU (BADGE SELECTION) 🍀 */}
                <div className="bg-[#141814] p-8 rounded-[40px] border border-white/5 space-y-6 shadow-xl">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-[#4caf50] rounded-full"></div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-white">Thánh tích & Danh hiệu đã mở</h3>
                    </div>
                    <div className="max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[...dynamicTitles].reverse().map((title) => {
                                const isUnlocked = calculateLevel(user?.xp) >= title.lv;
                                const isSelected = user?.selected_badge === title.name || (currentDynamicTitle?.name === title.name && !user?.selected_badge);
                                
                                return (
                                    <button
                                        key={title.name}
                                        type="button"
                                        disabled={!isUnlocked || updating}
                                        onClick={async () => {
                                            if (isSelected) return;
                                            setUpdating(true);
                                            const res = await updateUserProfileAction(user.id, { 
                                                display_name: displayName, 
                                                bio: bio, 
                                                avatar_url: avatarUrl,
                                                selected_badge: title.name 
                                            });
                                            if (res.success) {
                                                setUser(res.user);
                                                localStorage.setItem('shiroi_user', JSON.stringify(res.user));
                                                setMessage(`Đã xưng danh: ${title.name}! ⚔️`);
                                            }
                                            setUpdating(false);
                                        }}
                                        className={`p-4 rounded-2xl border transition-all flex flex-col items-start gap-2 relative overflow-hidden group ${
                                            isSelected 
                                            ? 'bg-[#4caf50] border-[#4caf50] text-[#0a0c0a]' 
                                            : isUnlocked 
                                                ? 'bg-black/40 border-white/10 text-white hover:border-[#4caf50]/50 shadow-inner'
                                                : 'bg-black/10 border-white/5 text-gray-700 opacity-60 grayscale'
                                        }`}
                                    >
                                        <div className="flex justify-between w-full items-center">
                                             <span className={`text-[11px] font-black uppercase tracking-wider ${isSelected ? 'text-[#0a0c0a]' : 'text-inherit'}`}>{title.name}</span>
                                             {isSelected && <span className="text-xs">⚔️</span>}
                                        </div>
                                        <span className={`text-[8px] font-bold uppercase tracking-widest ${isSelected ? 'text-[#0a0c0a]/60' : 'text-gray-500'}`}>
                                            Cấp độ yêu cầu: {title.lv}
                                        </span>
                                        {!isUnlocked && (
                                            <div className="absolute top-2 right-2 text-[10px] opacity-40">🔒</div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 💡 FORM GỢI Ý DANH HIỆU 🍀 */}
                    <div className="pt-6 border-t border-white/5">
                        {!showSuggestForm ? (
                            <button 
                                onClick={() => setShowSuggestForm(true)}
                                className="w-full py-4 border border-dashed border-[#4caf50]/30 rounded-2xl text-[#4caf50] font-black text-[10px] uppercase tracking-widest hover:bg-[#4caf50]/5 transition-all flex items-center justify-center gap-2"
                            >
                                <span>💡</span> Gợi ý danh hiệu mới cho Thánh địa
                            </button>
                        ) : (
                            <motion.form 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                onSubmit={handleSuggestTitle}
                                className="space-y-4 bg-black/40 p-6 rounded-3xl border border-[#4caf50]/20"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-[10px] font-black text-[#4caf50] uppercase tracking-widest">Đóng góp ý tưởng</h4>
                                    <button type="button" onClick={() => setShowSuggestForm(false)} className="text-gray-600 hover:text-white">✕</button>
                                </div>
                                <input 
                                    type="text" 
                                    value={suggestTitle}
                                    onChange={e => setSuggestTitle(e.target.value)}
                                    placeholder="Tên danh hiệu (VD: Độc Bộ Thiên Hạ...)"
                                    className="w-full bg-[#141814] border border-white/5 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#4caf50]"
                                    required
                                />
                                <textarea 
                                    value={suggestReason}
                                    onChange={e => setSuggestReason(e.target.value)}
                                    placeholder="Lý do hoặc ý nghĩa (Không bắt buộc)"
                                    className="w-full bg-[#141814] border border-white/5 rounded-xl px-4 py-3 text-[11px] outline-none focus:border-[#4caf50] resize-none"
                                    rows="2"
                                />
                                <button 
                                    type="submit" 
                                    disabled={suggesting}
                                    className="w-full py-3 bg-[#4caf50] text-[#0a0c0a] rounded-xl font-black text-[10px] uppercase tracking-wider shadow-lg shadow-[#4caf50]/20"
                                >
                                    {suggesting ? 'ĐANG GỬI...' : 'GỬI GỢI Ý ✨'}
                                </button>
                                {suggestMessage && <p className="text-center text-[9px] font-bold text-[#4caf50] animate-pulse">{suggestMessage}</p>}
                            </motion.form>
                        )}
                    </div>
                </div>

                {/* 📜 BÍ KÍP TU LUYỆN (XP GUIDE) 🍀 */}
                <div className="bg-[#141814] p-8 rounded-[40px] border border-white/5 space-y-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#4caf50]/5 blur-3xl rounded-full" />
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-[#4caf50] rounded-full"></div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-white">Bí kíp thăng cấp (Cách nhận XP)</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                            { label: 'Điểm danh', xp: '+100', icon: '🔥' },
                            { label: 'Đọc chương mới', xp: '+20', icon: '📖' },
                            { label: 'Bình luận', xp: '+5~10', icon: '💬' },
                            { label: 'Bốc quà', xp: 'Random', icon: '🎁' },
                            { label: 'Nhiệm vụ', xp: 'Variable', icon: '🎯' },
                            { label: 'Gợi ý danh hiệu', xp: '+500', icon: '💡' }
                        ].map((item, idx) => (
                            <div key={idx} className="p-4 bg-black/40 border border-white/5 rounded-2xl flex flex-col items-center text-center gap-1 group hover:border-[#4caf50]/30 transition-all">
                                <span className="text-xl mb-1 group-hover:scale-110 transition-transform">{item.icon}</span>
                                <span className="text-[8px] font-black text-gray-500 uppercase tracking-tighter">{item.label}</span>
                                <span className="text-xs font-black text-[#4caf50] italic">{item.xp} XP</span>
                            </div>
                        ))}
                    </div>

                    {/* 📖 DIỄN GIẢI CHI TIẾT 🍀 */}
                    <div className="mt-6 p-5 bg-black/20 rounded-3xl border border-white/5 space-y-4">
                        {[
                            { title: 'Duyên phận mỗi ngày', desc: 'Điểm danh nhận ngay 100 XP. Chuỗi càng dài, phần thưởng càng lớn tại các mốc 3, 7, 30 ngày.' },
                            { title: 'Hành trình đọc truyện', desc: 'Mỗi chương truyện đọc xong sẽ giúp bạn tích lũy 20 XP tu luyện (Ghi nhận 1 chương/người).' },
                            { title: 'Tương tác đàm đạo', desc: 'Bình luận đầu tiên nhận 10 XP, các lần tiếp theo nhận 5 XP. Nhận tối đa 100 XP từ bình luận mỗi ngày.' },
                            { title: 'Vận khí may mắn', desc: 'Mỗi ngày bốc quà một lần để nhận thêm lượng kinh nghiệm ngẫu nhiên từ Thánh Địa.' },
                            { title: 'Cống hiến danh phẩm', desc: 'Đóng góp ý tưởng danh hiệu. Nếu được Admin duyệt, bạn nhận ngay 500 XP công đức.' }
                        ].map((rule, rIdx) => (
                            <div key={rIdx} className="flex gap-3 items-start">
                                <div className="w-1 h-1 rounded-full bg-[#4caf50] mt-1.5 shrink-0" />
                                <div>
                                    <p className="text-[9px] font-black uppercase text-[#4caf50] tracking-widest">{rule.title}</p>
                                    <p className="text-[10px] text-gray-400 leading-relaxed">{rule.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-[8px] text-gray-600 italic text-center">"Cần cù bù thông minh, tu luyện mỗi ngày để thăng hạng Thánh Địa!" 🍀</p>
                </div>

                <div className="bg-[#141814] p-8 rounded-[40px] border border-white/5 space-y-6 shadow-xl">
                  <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">🕰️ Nhật ký tu luyện</h3>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {xpLogs.map(l => {
                      const typeMap = {
                        'read': 'Đọc truyện',
                        'check_in': 'Điểm danh',
                        'comment': 'Bình luận',
                        'first_comment': 'Lần đầu bình luận',
                        'lucky_draw': 'Bốc quà',
                        'mission': 'Nhiệm vụ'
                      };
                      return (
                        <div key={l.id} className="flex justify-between items-center p-4 bg-black/40 rounded-2xl border border-white/5 hover:bg-black/60 transition-all">
                          <div>
                            <div className="text-[10px] font-black uppercase text-gray-400">{typeMap[l.type] || 'Khác'}</div>
                            <div className="text-[8px] text-gray-600 mt-1">{new Date(l.created_at).toLocaleString('vi-VN')}</div>
                          </div>
                          <div className="text-xs font-black text-[#4caf50]">+{l.amount} XP</div>
                        </div>
                      );
                    })}
                    {xpLogs.length === 0 && <p className="text-center text-gray-700 py-10 italic">Chưa có dấu ấn tu luyện... ✨</p>}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                <form onSubmit={handleUpdate} className="bg-[#141814] p-8 rounded-[40px] border border-white/5 space-y-6 shadow-xl">
                  <h3 className="text-xs font-black uppercase tracking-widest">Cài đặt hồ sơ Shiroi</h3>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Tên hiển thị</label>
                      <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-[#4caf50]" placeholder="Nhập tên hiển thị..." />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Giới thiệu bản thân (Bio)</label>
                      <textarea value={bio} onChange={e => setBio(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-[#4caf50] resize-none" rows="3" placeholder="Viết vài dòng giới thiệu về mình..." />
                    </div>
                    <button type="submit" disabled={updating} className="w-full py-4 bg-[#4caf50] text-[#0a0c0a] font-black rounded-xl text-[10px] uppercase shadow-lg disabled:opacity-20 transition-all hover:brightness-110">Lưu thay đổi hồ sơ 💾</button>
                    {message && <p className="text-center text-[10px] font-black text-[#4caf50] animate-pulse">{message}</p>}
                  </div>
                </form>

                <form onSubmit={handlePasswordUpdate} className="bg-[#141814] p-8 rounded-[40px] border border-white/5 space-y-6 shadow-xl">
                  <h3 className="text-xs font-black uppercase tracking-widest">Đổi mật mã bảo mật</h3>
                  <div className="space-y-4">
                    <input type="password" placeholder="Mật khẩu hiện tại" value={oldPassword} onChange={e => setOldPassword(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-[#4caf50]" />
                    <input type="password" placeholder="Mật khẩu mới" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-[#4caf50]" />
                    <input type="password" placeholder="Xác nhận mật khẩu mới" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-[#4caf50]" />
                    <button type="submit" disabled={pwdUpdating} className="w-full py-4 bg-white/5 text-white font-black rounded-xl text-[10px] uppercase border border-white/10 hover:bg-white/10 transition-all disabled:opacity-20">Cập nhật mật mã 🔐</button>
                    {pwdMessage && <p className="text-center text-[10px] font-black text-[#4caf50]">{pwdMessage}</p>}
                  </div>
                </form>
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div key="notifications" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                  <div className="bg-[#141814] p-8 rounded-[40px] border border-white/5 space-y-6 shadow-xl">
                     <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">🔔 Thông báo của bạn</h3>
                     <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {notifications.map(n => (
                          <div key={n.id} onClick={() => !n.is_read && handleMarkAsRead(n.id)} className={`p-5 rounded-2xl border transition-all cursor-pointer ${!n.is_read ? 'bg-[#4caf50]/5 border-[#4caf50]/20' : 'bg-black/20 border-white/5'}`}>
                            <p className={`text-[11px] font-black uppercase mb-1 ${!n.is_read ? 'text-[#4caf50]' : 'text-white'}`}>{n.title}</p>
                            <p className="text-[10px] text-gray-500 leading-relaxed">{n.body}</p>
                            <p className="text-[8px] text-gray-700 mt-2 italic">{formatSafeDistance(n.created_at)}</p>
                          </div>
                        ))}
                        {notifications.length === 0 && <p className="text-center text-gray-600 py-10 italic">Hiện chưa có thông báo nào mới ✨</p>}
                     </div>
                  </div>
              </motion.div>
            )}

            {activeTab === 'admin' && (user?.role === 'admin' || user?.role === 'staff') && (
              <motion.div key="admin" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                 <div className="bg-[#141814] p-8 rounded-[40px] border border-red-500/10 space-y-6 shadow-xl">
                    <h3 className="text-xs font-black uppercase tracking-widest text-red-500 flex items-center gap-2">🛡️ Quản lý nhân sự Thánh địa</h3>
                    <form onSubmit={handleSearchUsers} className="flex gap-2">
                       <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Tìm tên người dùng..." className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-red-500/50" />
                       <button className="bg-red-500 text-white px-6 rounded-xl font-black text-[10px] uppercase tracking-widest">TÌM</button>
                    </form>
                    <div className="space-y-2">
                       {foundUsers.map(u => (
                         <div key={u.id} className="p-4 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                               <img src={u.avatar_url || 'https://psgivxgycjireinwnelc.supabase.co/storage/v1/object/public/avatars/default-avatar.png'} className="w-9 h-9 rounded-full object-cover border border-white/10" alt=""/>
                               <div>
                                  <p className="text-[10px] font-black">{u.username}</p>
                                  <p className="text-[8px] text-gray-500 uppercase font-black">{u.role === 'admin' ? 'Quản trị viên' : u.role === 'staff' ? 'Nhân sự' : 'Thành viên'}</p>
                               </div>
                            </div>
                            <div className="flex gap-1">
                               <button onClick={() => handleUpdateRole(u.id, 'staff')} className="text-[7px] px-2 py-1 bg-blue-500/10 text-blue-500 rounded border border-blue-500/20 font-black uppercase">STAFF</button>
                               <button onClick={() => handleUpdateRole(u.id, 'admin')} className="text-[7px] px-2 py-1 bg-red-500/10 text-red-500 rounded border border-red-500/20 font-black uppercase">ADMIN</button>
                               <button onClick={() => handleUpdateRole(u.id, 'user')} className="text-[7px] px-2 py-1 bg-gray-500/10 text-gray-500 rounded border border-gray-500/20 font-black uppercase">USER</button>
                            </div>
                         </div>
                       ))}
                       {foundUsers.length === 0 && searchQuery && <p className="text-center text-[10px] text-gray-600 italic">Không tìm thấy ai phù hợp... 🕵️‍♂️</p>}
                    </div>
                 </div>

                 {/* 💡 QUẢN LÝ GỢI Ý DANH HIỆU 🍀 */}
                 <div className="bg-[#141814] p-8 rounded-[40px] border border-[#4caf50]/10 space-y-6 shadow-xl">
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#4caf50] flex items-center gap-2">💡 Gợi ý danh hiệu chưa duyệt</h3>
                    <div className="space-y-4">
                       {titleSuggestions.filter(s => s.status === 'pending').map(s => (
                         <div key={s.id} className="p-5 bg-black/40 rounded-2xl border border-white/5 space-y-3">
                            <div className="flex justify-between items-start">
                               <div>
                                  <p className="text-sm font-black text-[#4caf50] uppercase italic">"{s.title_name}"</p>
                                  <p className="text-[10px] text-gray-500 mt-1">Gửi bởi: <span className="text-white">{s.shiroi_users?.display_name || s.shiroi_users?.username}</span></p>
                               </div>
                               <span className="text-[8px] text-gray-700 italic">{formatSafeDistance(s.created_at)}</span>
                            </div>
                            {s.reason && <p className="text-[10px] text-gray-400 bg-white/5 p-3 rounded-xl leading-relaxed italic">"{s.reason}"</p>}
                            <div className="flex gap-2 pt-2">
                               <button onClick={() => handleProcessSuggestion(s.id, 'approved')} className="flex-1 py-2 bg-[#4caf50]/10 text-[#4caf50] border border-[#4caf50]/20 rounded-lg font-black text-[8px] uppercase tracking-widest hover:bg-[#4caf50] hover:text-[#0a0c0a] transition-all">CHẤP THUẬN ✅</button>
                               <button onClick={() => handleProcessSuggestion(s.id, 'rejected')} className="flex-1 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg font-black text-[8px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">TỪ CHỐI ✕</button>
                            </div>
                         </div>
                       ))}
                       {titleSuggestions.filter(s => s.status === 'pending').length === 0 && (
                         <p className="text-center text-[10px] text-gray-700 py-6 italic">Hiện chưa có gợi ý nào đang chờ... ✨</p>
                       )}
                    </div>
                 </div>

                 {/* 🏆 QUẢN LÝ TỔNG DANH HIỆU ⚔️ */}
                 <div className="bg-[#141814] p-8 rounded-[40px] border border-[#4caf50]/10 space-y-6 shadow-xl">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xs font-black uppercase tracking-widest text-[#4caf50] flex items-center gap-2">🏆 Danh sách danh hiệu chính thức</h3>
                        <span className="text-[10px] font-bold text-gray-600">{dynamicTitles.length} danh phẩm</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {dynamicTitles.map((t) => (
                            <div key={t.id} className="p-4 bg-black/40 rounded-xl border border-white/5 flex justify-between items-center group">
                                <div>
                                    <p className="text-[10px] font-black text-[#4caf50] uppercase tracking-wide italic leading-none mb-1">{t.name}</p>
                                    <p className="text-[8px] text-gray-600 font-bold">Yêu cầu: LVL {t.lv}</p>
                                </div>
                                <button 
                                    onClick={() => handleDeleteOfficialTitle(t.id)}
                                    className="p-2 text-gray-700 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
