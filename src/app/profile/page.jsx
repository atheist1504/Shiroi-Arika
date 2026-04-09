'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { calculateLevel, calculateProgress, calculateTitle } from '@/lib/xp';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');
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
          .ilike('username', userData.username)
          .single();

        if (!error && data) {
          setUser(data);
          setDisplayName(data.display_name || '');
          setBio(data.bio || '');
          setAvatarUrl(data.avatar_url || '');
          localStorage.setItem('shiroi_user', JSON.stringify(data));
        } else {
          setUser(userData);
        }
      } catch (err) {
        console.error("Lỗi đồng bộ:", err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [router]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    try {
      setUpdating(true);
      setMessage('Đang truyền ảnh lên mây Shiroi... ☁️');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.username}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      setMessage('Tải ảnh thành công! 🍀');
    } catch (err) {
      setMessage(`Lỗi: ${err.message}`);
    } finally {
      setUpdating(false);
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
    <div className="min-h-screen bg-[#0a0c0a] text-white p-6 pt-24 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-[#4caf50]/5 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="max-w-2xl mx-auto z-10 relative space-y-16">
        <div className="flex flex-col items-center gap-10 text-center">
          <div className="relative group p-1 bg-gradient-to-br from-[#4caf50]/20 to-transparent rounded-[56px] shadow-[0_0_50px_rgba(76,175,80,0.1)]">
            <div className="w-56 h-56 rounded-[48px] overflow-hidden border-4 border-[#141814] shadow-2xl bg-[#0a0c0a] flex shrink-0 relative">
              {avatarUrl ? (
                <img src={avatarUrl} className="w-full h-full object-cover animate-fade-in border-4 border-[#4caf50]/20" alt="Avatar" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#4caf50] text-7xl font-black italic shadow-inner">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center pointer-events-none gap-2">
                <svg className="w-8 h-8 text-[#4caf50]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path></svg>
                <span className="text-white text-[10px] font-black uppercase tracking-[0.2em]">Thay hình đổi diện 🍀</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current.click()}
              className="absolute bottom-4 right-4 p-5 bg-[#4caf50] text-[#0a0c0a] rounded-3xl shadow-[0_10px_30px_rgba(76,175,80,0.4)] hover:scale-110 active:scale-95 transition-all z-20"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            </button>
          </div>

          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />

          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2">
              {user?.selected_badge && (
                <span className="text-[10px] font-black px-4 py-1.5 rounded-xl border border-[#4caf50]/30 text-[#4caf50] uppercase tracking-[0.3em] bg-[#4caf50]/10 shadow-[0_0_20px_rgba(76,175,80,0.2)] animate-pulse">
                  {user.selected_badge}
                </span>
              )}
              <h1 className="text-5xl font-black tracking-tight uppercase gradient-text drop-shadow-2xl">{user?.display_name || user?.username}</h1>
            </div>
          </div>

          {/* GAMIFICATION STATS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            <div className="bg-[#141814] border border-white/5 p-6 rounded-[32px] flex flex-col items-center gap-2">
              <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest opacity-60">Cấp độ hiện tại</span>
              <span className="text-4xl font-black text-[#4caf50] italic drop-shadow-[0_0_15px_rgba(76,175,80,0.3)]">{calculateLevel(user.xp)}</span>
            </div>
            <div className="bg-[#141814] border border-white/5 p-6 rounded-[32px] flex flex-col items-center gap-2">
              <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest opacity-60">Tổng Thánh tích (XP)</span>
              <span className="text-4xl font-black text-gray-200 italic">{user.xp || 0}</span>
            </div>
            <div className="bg-[#141814] border border-white/5 p-6 rounded-[32px] flex flex-col items-center gap-2">
              <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest opacity-60">Thanh tiến trình ({calculateProgress(user.xp)}/100)</span>
              <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-[#4caf50] shadow-[0_0_10px_#4caf50]" style={{ width: `${calculateProgress(user.xp)}%` }}></div>
              </div>
            </div>
          </div>

          {/* SET SELECTION SYSTEM 🏆 */}
          <div className="w-full space-y-8 animate-fade-in-up">
            <div className="flex items-center gap-3 px-2">
              <div className="w-1.5 h-6 bg-[#4caf50] rounded-full"></div>
              <h2 className="text-xl font-black uppercase tracking-tighter text-white">Thánh tích & Danh hiệu</h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {[
                { name: 'Lữ Khách', lv: 1, icon: '🚶' },
                { name: 'Chiến Binh', lv: 10, icon: '🗡️' },
                { name: 'Hộ Vệ', lv: 20, icon: '🛡️' },
                { name: 'Đại Sư', lv: 35, icon: '🎨' },
                { name: 'Hiền Giả', lv: 50, icon: '🧙‍♂️' }
              ].map(badge => {
                const userLv = calculateLevel(user.xp);
                const isUnlocked = userLv >= badge.lv;
                const isSelected = user.selected_badge === badge.name;

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
                    className={`p-5 rounded-[28px] flex flex-col items-center gap-3 text-center transition-all duration-500 relative border ${isSelected
                        ? 'bg-[#4caf50]/10 border-[#4caf50] shadow-[0_0_25px_rgba(76,175,80,0.3)] scale-105'
                        : isUnlocked
                          ? 'bg-[#141814] border-white/5 hover:border-[#4caf50]/30 hover:-translate-y-1'
                          : 'bg-black/40 border-white/5 opacity-40 grayscale pointer-events-none'
                      }`}
                  >
                    <div className={`text-3xl transition-transform ${isSelected ? 'scale-110' : ''}`}>{badge.icon}</div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-black uppercase text-white truncate w-full">{badge.name}</span>
                      <span className={`text-[7px] font-black uppercase ${isUnlocked ? 'text-[#4caf50]' : 'text-gray-600'}`}>
                        {isUnlocked ? (isSelected ? 'ĐANG DÙNG' : 'CHỌN') : `CẤP ${badge.lv}`}
                      </span>
                    </div>
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#4caf50] rounded-full flex items-center justify-center border-2 border-[#0a0c0a] shadow-xl">
                        <svg className="w-3 h-3 text-[#0a0c0a]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
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
