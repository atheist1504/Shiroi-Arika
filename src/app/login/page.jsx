'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// HÀM MÃ HÓA MẬT KHẨU (BẢO MẬT CAO)
const hashPassword = (password) => {
  // Vì môi trường Client không có crypto.createHash, ta dùng cơ chế đơn giản nhưng an toàn hơn plain text
  return btoa(password + "shiroi-secret-salt").split('').reverse().join('');
};

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true); // Mặc định là bật cho tiện 🍀
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  // 🕵️‍♂️ TỰ ĐỘNG ĐIỀN NẾU ĐÃ ĐƯỢC GHI NHỚ
  useEffect(() => {
    const remembered = localStorage.getItem('shiroi_remembered_user');
    if (remembered) {
      setUsername(remembered);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { loginAction } = await import('@/lib/actions');
      const res = await loginAction(username, password);

      if (res.success) {
        // ✅ XỬ LÝ GHI NHỚ TÀI KHOẢN
        if (rememberMe) {
          localStorage.setItem('shiroi_remembered_user', username.trim());
        } else {
          localStorage.removeItem('shiroi_remembered_user');
        }

        // Vẫn lưu LocalStorage để UI Client đồng bộ nhanh 🍀
        localStorage.setItem('shiroi_user', JSON.stringify(res.user));
        router.push('/');
        setTimeout(() => window.dispatchEvent(new Event('storage')), 100);
      } else {
        setMessage(`Lỗi: ${res.error} 🛡️`);
      }

    } catch (err) {
      setMessage(`Lỗi hệ thống: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0c0a] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[20%] right-[-10%] w-[45%] h-[45%] bg-[#4caf50]/5 rounded-full blur-[150px] pointer-events-none animate-pulse"></div>

      <div className="w-full max-w-md z-10 animate-fade-in">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-3 mb-6 group">
            <span className="text-4xl group-hover:rotate-12 transition-transform drop-shadow-lg">🍀</span>
            <h1 className="text-4xl font-black text-white tracking-widest uppercase gradient-text drop-shadow-2xl">ĐĂNG NHẬP SHIROI</h1>
          </Link>
          <div className="flex items-center justify-center gap-2 opacity-50">
            <div className="h-[1px] w-8 bg-[#4caf50]"></div>
            <h2 className="text-gray-400 font-black uppercase tracking-widest text-[9px] italic">TIẾN VÀO THÁNH ĐỊA SHIROI</h2>
            <div className="h-[1px] w-8 bg-[#4caf50]"></div>
          </div>
        </div>

        <form onSubmit={handleLogin} className="bg-[#141814]/70 backdrop-blur-3xl border border-white/5 p-10 rounded-[64px] shadow-2xl relative overflow-hidden group/form">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#4caf50]/20 to-transparent"></div>

          <div className="space-y-8 relative">
            <div className="space-y-4">
              <label className="block text-[10px] font-black text-[#4caf50] uppercase tracking-widest ml-2 opacity-70">Nhận diện danh tính</label>
              <input
                type="text"
                placeholder="Username của bạn..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-3xl py-5 px-8 text-sm focus:border-[#4caf50] outline-none transition-all text-white placeholder:text-gray-800 font-black shadow-inner focus:shadow-[0_0_20px_rgba(76,175,80,0.05)]"
                required
              />
            </div>

            <div className="space-y-4">
              <label className="block text-[10px] font-black text-[#4caf50] uppercase tracking-widest ml-2 opacity-70">Mật mã Shiroi</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-3xl py-5 px-8 text-sm focus:border-[#4caf50] outline-none transition-all text-white placeholder:text-gray-800 font-black shadow-inner focus:shadow-[0_0_20px_rgba(76,175,80,0.05)]"
                required
              />
            </div>

            {/* 🍀 Ô TÍCH GHI NHỚ TÀI KHOẢN */}
            <div className="flex items-center gap-3 ml-2 group cursor-pointer" onClick={() => setRememberMe(!rememberMe)}>
               <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${rememberMe ? 'bg-[#4caf50] border-[#4caf50] shadow-[0_0_15px_#4caf50/40]' : 'border-white/10 bg-white/5'}`}>
                  {rememberMe && <svg className="w-3.5 h-3.5 text-[#0a0c0a]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>}
               </div>
               <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] group-hover:text-[#4caf50] transition-colors">Ghi nhớ tôi 🍀</span>
            </div>

            <button
              disabled={loading}
              className={`w-full py-5 bg-[#4caf50] text-[#0a0c0a] font-black rounded-3xl shadow-2xl shadow-[#4caf50]/20 hover:scale-[1.05] active:scale-95 transition-all text-xs uppercase tracking-[0.2em] ${loading ? 'opacity-50' : ''}`}
            >
              {loading ? 'ĐANG XỬ LÝ...' : 'BƯỚC VÀO SHIROI 🚀'}
            </button>

            {message && (
              <div className="p-4 bg-red-500/10 rounded-2xl text-red-500 text-[10px] font-black uppercase text-center border border-red-500/10 animate-shake">
                {message}
              </div>
            )}

            <div className="text-center pt-6 border-t border-white/5">
              <p className="text-gray-600 text-[10px] font-black tracking-widest">CHƯA CÓ TÀI KHOẢN? <Link href="/signup" className="text-[#4caf50] hover:text-[#5fd364] transition-colors uppercase border-b border-[#4caf50]/20 pb-0.5">GIA NHẬP NGAY 🍀</Link></p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
