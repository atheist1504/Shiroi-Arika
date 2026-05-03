import React from 'react';

export const metadata = {
  title: 'Shiroi Arika - Hệ thống đang bảo trì',
  description: 'Chúng mình đang cập nhật hệ thống để mang lại trải nghiệm tốt hơn.',
};

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 font-sans text-white">
      <div className="max-w-2xl w-full text-center space-y-8 animate-in fade-in zoom-in duration-700">
        {/* Logo/Icon */}
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-purple-600 blur-3xl opacity-20 rounded-full animate-pulse"></div>
          <div className="relative bg-[#1a1a1a] p-6 rounded-3xl border border-white/10 shadow-2xl">
            <svg 
              className="w-16 h-16 text-purple-500" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" 
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-white via-white/80 to-white/50 bg-clip-text text-transparent">
            Bảo Trì Hệ Thống
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-md mx-auto leading-relaxed">
            Shiroi Arika đang tạm đóng cửa để Admin cập nhật thêm chương mới và tối ưu hóa hệ thống.
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-[#111] border border-white/5 rounded-2xl p-6 max-w-sm mx-auto backdrop-blur-sm">
          <div className="flex items-center justify-center gap-3 text-sm font-medium">
            <span className="flex h-2 w-2 rounded-full bg-purple-500 animate-ping"></span>
            <span className="text-purple-400 uppercase tracking-widest">Đang thực hiện</span>
          </div>
          <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-600 to-pink-600 w-2/3 rounded-full shadow-[0_0_15px_rgba(147,51,234,0.5)]"></div>
          </div>
          <p className="mt-4 text-xs text-gray-500 italic">
            Dự kiến quay trở lại sớm nhất. Cảm ơn bạn đã kiên nhẫn!
          </p>
        </div>

        {/* Socials/Links */}
        <div className="pt-8 flex justify-center gap-6 text-gray-500">
          <a href="#" className="hover:text-white transition-colors">Discord</a>
          <a href="#" className="hover:text-white transition-colors">Facebook</a>
          <a href="#" className="hover:text-white transition-colors">Github</a>
        </div>
      </div>

      <style jsx global>{`
        body {
          background-color: #0a0a0a;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
