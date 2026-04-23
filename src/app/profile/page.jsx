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

  // 🕵️‍♂️ STATE CHO QUẢN LÝ NHÂN SỰ 🛡️
  const [searchQuery, setSearchQuery] = useState('');
  const [foundUsers, setFoundUsers] = useState([]);
  const [personnelList, setPersonnelList] = useState([]);
  const [mgmtLoading, setMgmtLoading] = useState(false);
  const [mgmtMessage, setMgmtMessage] = useState('');

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
          
          if (data.role === 'admin' || data.role === 'staff') {
            fetchPersonnel();
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
    const { data } = await supabase.from('shiroi_xp_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
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
    const res = await getNotificationsAction(50, 0);
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
      const res = await updateUserProfileAction(user.id, { display_name: displayName, bio: bio, avatar_url: publicUrl });
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
    const res = await updateUserProfileAction(user.id, { display_name: displayName, bio: bio, avatar_url: avatarUrl });
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

  if (!isMounted || loading) return <div className="min-h-screen bg-[#0a0c0a] flex items-center justify-center text-[#4caf50]">Đang tải...</div>;

  return (
    <div className="min-h-screen bg-[#0a0c0a] text-white p-6 pt-24 relative overflow-x-hidden">
      <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-[#4caf50]/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-2xl mx-auto z-10 relative space-y-12">
        {/* TIÊU ĐỀ HỒ SƠ */}
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="relative group w-48 h-48 rounded-[48px] overflow-hidden border-4 border-[#141814] bg-[#0a0c0a] cursor-pointer" onClick={() => fileInputRef.current.click()}>
            <img src={avatarUrl || 'https://psgivxgycjireinwnelc.supabase.co/storage/v1/object/public/avatars/default-avatar.png'} className="w-full h-full object-cover" />
            {avatarLoading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#4caf50] border-t-transparent rounded-full animate-spin" /></div>}
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          <div className="space-y-2">
            <h1 className="text-4xl font-black gradient-text uppercase">{user?.display_name || user?.username}</h1>
            <span className="text-[10px] font-black px-4 py-1.5 rounded-lg border border-[#4caf50]/30 text-[#4caf50] uppercase tracking-widest bg-[#4caf50]/10">
                {user?.selected_badge || calculateTitle(user?.xp).name}
            </span>
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
                  <div className="bg-[#141814] p-8 rounded-[40px] border border-white/5 flex flex-col items-center gap-4">
                    <span className="text-[10px] font-black text-[#4caf50] uppercase tracking-widest">Phúc lành mỗi ngày (Điểm danh)</span>
                    <span className="text-5xl">🔥 {user?.check_in_streak || 0}</span>
                    <button onClick={handleCheckIn} disabled={checkInLoading || (user?.last_check_in && new Date(user.last_check_in).toDateString() === new Date().toDateString())} className="w-full py-4 bg-[#4caf50] text-[#0a0c0a] font-black rounded-2xl text-[10px] uppercase tracking-widest disabled:opacity-20 hover:scale-105 transition-all">
                      {checkInLoading ? '...' : 'ĐIỂM DANH NGAY'}
                    </button>
                    <p className="text-[9px] text-gray-500 font-bold">Tổng tích lũy: {totalCheckIns} ngày ✨</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#141814] p-6 rounded-3xl border border-white/5 text-center">
                      <p className="text-[10px] text-gray-500 uppercase font-black">Bộ truyện</p>
                      <p className="text-3xl font-black">{stats.total_mangas}</p>
                    </div>
                    <div className="bg-[#141814] p-6 rounded-3xl border border-white/5 text-center">
                      <p className="text-[10px] text-gray-500 uppercase font-black">Chương</p>
                      <p className="text-3xl font-black">{stats.total_chapters}</p>
                    </div>
                    <div className="bg-[#141814] p-6 rounded-3xl border border-white/5 text-center col-span-2">
                       <p className="text-[10px] text-gray-500 uppercase font-black">Cấp độ tu luyện</p>
                       <p className="text-3xl font-black text-[#4caf50]">LVL {calculateLevel(user?.xp)}</p>
                       <div className="w-full h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                          <div className="h-full bg-[#4caf50]" style={{ width: `${calculateProgress(user?.xp)}%` }} />
                       </div>
                       <p className="text-[8px] text-gray-600 mt-1 uppercase tracking-widest">Kinh nghiệm: {user?.xp || 0} XP</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#141814] p-8 rounded-[40px] border border-white/5 space-y-6">
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
                        <div key={l.id} className="flex justify-between items-center p-4 bg-black/40 rounded-2xl border border-white/5">
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
                <form onSubmit={handleUpdate} className="bg-[#141814] p-8 rounded-[40px] border border-white/5 space-y-6">
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

                <form onSubmit={handlePasswordUpdate} className="bg-[#141814] p-8 rounded-[40px] border border-white/5 space-y-6">
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
                  <div className="bg-[#141814] p-8 rounded-[40px] border border-white/5 space-y-6">
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
                 <div className="bg-[#141814] p-8 rounded-[40px] border border-red-500/10 space-y-6">
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
