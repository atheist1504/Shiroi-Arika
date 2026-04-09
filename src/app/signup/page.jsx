'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// HÀM MÃ HÓA MẬT KHẨU (ĐỒNG BỘ VỚI LOGIN)
const hashPassword = (password) => {
  return btoa(password + "shiroi-secret-salt").split('').reverse().join('');
};

export default function Signup() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // 1. Kiểm tra hai mật mã có giống nhau không
    if (password !== confirmPassword) {
      setMessage('Lỗi: Hai mật mã chưa đồng nhất với nhau! 🆘');
      setLoading(false);
      return;
    }

    try {
      // 2. Kiểm tra username đã tồn tại chưa
      const { data: existingUser } = await supabase
        .from('shiroi_users')
        .select('username')
        .ilike('username', username.trim())
        .single();
      
      if (existingUser) {
        setMessage('Lỗi: Tên này đã có chủ nhân sở hữu rồi! 🏰');
        setLoading(false);
        return;
      }

      // 3. Mã hóa và tạo tài khoản
      const hashedPassword = hashPassword(password);
      
      const { data, error } = await supabase
        .from('shiroi_users')
        .insert([{ 
           username: username.trim(), 
           password: hashedPassword,
           display_name: username.trim(),
           bio: 'Chào mừng tôi gia nhập Shiroi Arika! 🍀'
        }])
        .select();

      if (error) throw error;

      if (data) {
        setMessage('Chúc mừng! Bạn đã trở thành cư dân Shiroi! 🍀🚀');
        localStorage.setItem('shiroi_user', JSON.stringify(data[0]));
        setTimeout(() => router.push('/'), 1500);
      }
      
    } catch (err) {
      setMessage(`Lỗi: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0c0a] flex items-center justify-center p-6 relative overflow-hidden">
      {/* BACKGROUND EFFECTS */}
      <div className="absolute bottom-[10%] left-[-10%] w-[50%] h-[50%] bg-[#4caf50]/5 rounded-full blur-[200px] pointer-events-none"></div>

      <div className="w-full max-w-lg z-10 animate-fade-in shadow-2xl">
        <div className="text-center mb-12">
           <Link href="/" className="inline-flex items-center gap-4 mb-8 transform hover:scale-110 transition-all duration-500">
              <span className="text-5xl animate-bounce-slow drop-shadow-[0_0_20px_rgba(76,175,80,0.4)]">🍀</span>
              <h1 className="text-5xl font-black text-white tracking-widest uppercase gradient-text drop-shadow-2xl italic">GIA NHẬP SHIROI</h1>
           </Link>
           <h2 className="text-gray-500 font-black uppercase tracking-[0.3em] text-[10px] opacity-70">Thành lập Hội đồng Shiroi Arika</h2>
        </div>

        <form onSubmit={handleSignup} className="bg-[#141814]/70 backdrop-blur-3xl border border-white/5 p-12 rounded-[64px] shadow-2xl relative overflow-hidden group/form shadow-[0_30px_100px_rgba(0,0,0,0.5)]">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-[#4caf50]/30 to-transparent"></div>

            <div className="space-y-8 relative">
                <div className="relative">
                    <label className="block text-[10px] font-black text-[#4caf50] uppercase tracking-widest mb-3 ml-2 italic">Tên danh tính (Username)</label>
                    <input 
                      type="text" 
                      placeholder="Chọn tên hiên ngang..." 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded-3xl py-6 px-10 text-sm focus:border-[#4caf50] outline-none transition-all text-white font-black shadow-inner focus:shadow-xl"
                      required
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="relative">
                        <label className="block text-[10px] font-black text-[#4caf50] uppercase tracking-widest mb-3 ml-2 italic">MẬT MÃ BÍ MẬT</label>
                        <input 
                        type="password" 
                        placeholder="Mật khẩu của bạn..." 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-black/40 border border-white/5 rounded-3xl py-6 px-10 text-sm focus:border-[#4caf50] outline-none transition-all text-white shadow-inner focus:shadow-xl"
                        required
                        />
                    </div>

                    <div className="relative">
                        <label className="block text-[10px] font-black text-[#4caf50] uppercase tracking-widest mb-3 ml-2 italic">XÁC NHẬN LẠI</label>
                        <input 
                        type="password" 
                        placeholder="Gõ lại một lần nữa..." 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-black/40 border border-white/5 rounded-3xl py-6 px-10 text-sm focus:border-[#4caf50] outline-none transition-all text-white shadow-inner focus:shadow-xl"
                        required
                        />
                    </div>
                </div>

                <div className="pt-4">
                    <button 
                      disabled={loading}
                      className={`w-full py-6 bg-[#4caf50] text-[#0a0c0a] font-black rounded-3xl shadow-2xl shadow-[#4caf50]/20 hover:scale-[1.05] active:scale-95 transition-all text-xs uppercase tracking-[0.3em] font-black ${loading ? 'opacity-50' : ''}`}
                    >
                       {loading ? 'ĐANG KẾT NẠP...' : 'XÁC NHẬN GIA NHẬP 🍀🚀'}
                    </button>
                </div>

                {message && (
                    <div className={`p-5 rounded-3xl text-[10px] font-black uppercase text-center border animate-fade-in ${message.includes('Lỗi') ? 'bg-red-500/10 text-red-500 border-red-500/10' : 'bg-[#4caf50]/10 text-[#4caf50] border-[#4caf50]/10'}`}>
                       {message}
                    </div>
                )}

                <div className="text-center pt-8 border-t border-white/5">
                   <p className="text-gray-600 text-[10px] font-black tracking-widest">ĐÃ LÀ CƯ DÂN? <Link href="/login" className="text-[#4caf50] hover:text-[#5fd364] transition-colors border-b-2 border-transparent hover:border-[#4caf50]/50 pb-1">TRỞ VỀ NHÀ 🏠</Link></p>
                </div>
            </div>
        </form>
      </div>
    </div>
  );
}
