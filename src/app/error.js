'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({ error, reset }) {
  useEffect(() => {
    // Ghi log lỗi để Admin theo dõi 🕵️‍♂️
    console.error('🚨 [Shiroi Error Boundary]:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0a0c0a] flex flex-col items-center justify-center p-6 text-center">
      {/* Hiệu ứng nền 🌌 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-red-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 space-y-8 animate-fade-in">
        <div className="text-8xl mb-4">🛡️</div>
        
        <div className="space-y-2">
            <h1 className="text-3xl font-black italic text-white tracking-tighter uppercase">Kết nối gián đoạn!</h1>
            <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">
              Thánh địa Shiroi đang gặp chút trục trặc về kết nối (Supabase/Firebase). 
              Đừng lo, dữ liệu của bạn vẫn an toàn.
            </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
                onClick={() => reset()}
                className="px-8 py-4 bg-[#4caf50] text-[#0a0c0a] font-black rounded-2xl text-[11px] uppercase tracking-[0.2em] shadow-[0_8px_20px_rgba(76,175,80,0.3)] hover:scale-105 active:scale-95 transition-all"
            >
                Thử kết nối lại 🔄
            </button>
            
            <Link
                href="/"
                className="px-8 py-4 bg-white/5 border border-white/10 text-white font-black rounded-2xl text-[11px] uppercase tracking-[0.2em] hover:bg-white/10 transition-all"
            >
                Quay về Trang chủ 🏠
            </Link>
        </div>

        <div className="pt-12">
            <p className="text-[10px] font-bold text-gray-700 uppercase tracking-[0.4em] italic">
                Error Code: {error?.digest || 'UNKNOWN_ANOMALY'}
            </p>
        </div>
      </div>
    </div>
  );
}
