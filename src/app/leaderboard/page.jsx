'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { optimizeImage } from '@/lib/cloudinary';
import Link from 'next/link';
import { calculateLevel, calculateTitle } from '@/lib/xp';

export default function LeaderboardPage() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('shiroi_user');
    if (storedUser) setCurrentUser(JSON.parse(storedUser));
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shiroi_users')
        .select('*')
        .order('xp', { ascending: false })
        .limit(50);

      if (!error && data) {
        setUsers(data);
      }
    } catch (err) {
      console.error("Lỗi lấy BXH:", err);
    } finally {
      setLoading(false);
    }
  };

  const adminUsers = users.filter(u => {
      const uname = u.username?.toLowerCase() || '';
      const dname = u.display_name?.toLowerCase() || '';
      return uname.includes('admin') || dname.includes('quản trị');
  });

  const normalUsers = users.filter(u => {
      const uname = u.username?.toLowerCase() || '';
      const dname = u.display_name?.toLowerCase() || '';
      return !(uname.includes('admin') || dname.includes('quản trị'));
  });

  const top3 = normalUsers.slice(0, 3);
  const top10 = normalUsers.slice(0, 10).filter(u => 
    (u.display_name || u.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0c0a] pt-28 pb-32 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-[#4caf50]/10 to-transparent pointer-events-none blur-[120px]"></div>
        
        <div className="max-w-6xl mx-auto relative z-10">
            <div className="text-center mb-20">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#4caf50]/10 border border-[#4caf50]/20 rounded-full mb-6">
                    <span className="w-2 h-2 bg-[#4caf50] rounded-full animate-pulse"></span>
                    <span className="text-[10px] font-black text-[#4caf50] uppercase tracking-[0.3em]">Hệ thống Gamification</span>
                </div>
                <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-6">
                    BẢNG VÀNG <span className="text-[#4caf50]">SHIROI</span> 🏆
                </h1>
                <p className="text-gray-500 font-bold max-w-xl mx-auto uppercase tracking-widest text-[10px]">
                    Vinh danh những độc giả trung thành nhất của Thánh địa Shiroi Arika
                </p>

                <div className="mt-12 max-w-md mx-auto relative group">
                    <input 
                       type="text" 
                       placeholder="Tìm kiếm danh tính thành viên..." 
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       className="w-full bg-[#141814]/40 border border-white/5 rounded-2xl py-3.5 px-6 pl-12 text-xs font-bold text-white focus:border-[#4caf50] outline-none transition-all placeholder:text-gray-700 shadow-2xl"
                    />
                    <svg className="w-4 h-4 absolute left-4 top-3.5 text-gray-700 group-focus-within:text-[#4caf50]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-30 animate-pulse">
                    <div className="w-16 h-16 border-t-4 border-[#4caf50] rounded-full animate-spin mb-4"></div>
                    <span className="text-xs font-black uppercase tracking-[0.5em] text-[#4caf50]">Đang giải mã thứ hạng...</span>
                </div>
            ) : (
                <>
                    {adminUsers.length > 0 && adminUsers.some(u => u.username !== 'admin') && (
                        <div className="max-w-4xl mx-auto bg-[#1a221a]/60 backdrop-blur-3xl border border-[#4caf50]/20 rounded-[30px] p-6 mb-16 text-center">
                            <h2 className="text-[#4caf50] text-[10px] font-black uppercase tracking-[0.3em] mb-6">👑 ĐANG SÁNG LẬP SHIROI 👑</h2>
                            <div className="flex flex-wrap items-center justify-center gap-4">
                                {adminUsers.map(admin => (
                                    <div key={admin.id} className="flex items-center gap-4 bg-black/40 px-6 py-4 rounded-2xl border border-[#4caf50]/10">
                                        <img src={admin.avatar_url || '/placeholder-avatar.jpg'} className="w-12 h-12 rounded-xl object-cover" alt="" />
                                        <div className="text-left">
                                            <div className="text-white font-black text-sm uppercase">{admin.display_name || admin.username}</div>
                                            <div className="text-[#4caf50] font-black text-[10px]">LV.{calculateLevel(admin.xp)} - {calculateTitle(admin.xp).name}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col md:flex-row items-end justify-center gap-6 mb-24 px-4">
                        {top3[1] && (
                            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="order-2 md:order-1 w-full md:w-1/4">
                                <div className="bg-[#141814]/60 backdrop-blur-3xl border border-white/5 p-8 rounded-[40px] text-center relative shadow-2xl">
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-3xl overflow-hidden border-4 border-gray-400 bg-[#141814]">
                                        <img src={optimizeImage(top3[1].avatar_url || 'https://res.cloudinary.com/demo/image/fetch/https://psgivxgycjireinwnelc.supabase.co/storage/v1/object/public/avatars/default-avatar.png', 200)} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="mt-10 mb-4 inline-block px-4 py-1 bg-gray-400 text-black text-[10px] font-black rounded-full uppercase">Á QUÂN 🥈</div>
                                    <h3 className="text-xl font-black text-white mb-1 truncate">{top3[1].display_name || top3[1].username}</h3>
                                    <p className="text-[#4caf50] font-black text-[9px] uppercase tracking-widest">LV.{calculateLevel(top3[1].xp)} - {calculateTitle(top3[1].xp).name}</p>
                                    <div className="mt-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{top3[1].xp.toLocaleString()} XP</div>
                                </div>
                            </motion.div>
                        )}

                        {top3[0] && (
                            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="order-1 md:order-2 w-full md:w-1/3 mb-12">
                                <div className="bg-[#1a221a] backdrop-blur-3xl border-2 border-[#4caf50]/30 p-10 rounded-[50px] text-center relative shadow-[0_40px_80px_rgba(76,175,80,0.15)] animate-float">
                                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-28 h-28 rounded-[35px] overflow-hidden border-4 border-[#4caf50] shadow-[0_0_40px_rgba(76,175,80,0.4)] bg-[#141814]">
                                        <img src={optimizeImage(top3[0].avatar_url || 'https://res.cloudinary.com/demo/image/fetch/https://psgivxgycjireinwnelc.supabase.co/storage/v1/object/public/avatars/default-avatar.png', 300)} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="mt-14 mb-5 inline-block px-6 py-2 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black text-xs font-black rounded-full uppercase shadow-lg animate-pulse">QUÁN QUÂN 🥇</div>
                                    <h3 className="text-3xl font-black text-white mb-2 truncate">{top3[0].display_name || top3[0].username}</h3>
                                    <p className="text-[#4caf50] font-black text-[10px] uppercase tracking-[0.2em]">CẤP {calculateLevel(top3[0].xp)} - {calculateTitle(top3[0].xp).name}</p>
                                    <div className="mt-8">
                                        <div className="inline-block px-5 py-2 bg-black/40 rounded-2xl border border-white/5">
                                            <span className="text-lg font-black text-white">{top3[0].xp.toLocaleString()}</span>
                                            <span className="text-[10px] text-[#4caf50] ml-1 font-black">XP</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {top3[2] && (
                            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="order-3 w-full md:w-1/4">
                                <div className="bg-[#141814]/60 backdrop-blur-3xl border border-white/5 p-8 rounded-[40px] text-center relative shadow-2xl">
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-3xl overflow-hidden border-4 border-orange-700 bg-[#141814]">
                                        <img src={optimizeImage(top3[2].avatar_url || 'https://res.cloudinary.com/demo/image/fetch/https://psgivxgycjireinwnelc.supabase.co/storage/v1/object/public/avatars/default-avatar.png', 200)} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="mt-10 mb-4 inline-block px-4 py-1 bg-orange-700 text-white text-[10px] font-black rounded-full uppercase">HẠNG 3 🥉</div>
                                    <h3 className="text-xl font-black text-white mb-1 truncate">{top3[2].display_name || top3[2].username}</h3>
                                    <p className="text-[#4caf50] font-black text-[9px] uppercase tracking-widest">LV.{calculateLevel(top3[2].xp)} - {calculateTitle(top3[2].xp).name}</p>
                                    <div className="mt-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{top3[2].xp.toLocaleString()} XP</div>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* BẢNG DANH SÁCH TOP 10 📜 - LUÔN HIỂN THỊ */}
                    <div className="max-w-4xl mx-auto bg-[#141814]/40 backdrop-blur-2xl border border-white/5 rounded-[40px] overflow-hidden shadow-2xl mb-24">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                                    <th className="py-6 px-8">#</th>
                                    <th className="py-6 px-4">THÀNH VIÊN</th>
                                    <th className="py-6 px-4 text-center">CẤP ĐỘ</th>
                                    <th className="py-6 px-4 text-right">KINH NGHIỆM</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.03]">
                                {top10.length > 0 ? top10.map((u, index) => (
                                    <motion.tr 
                                      key={u.id} 
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      className={`hover:bg-white/[0.02] transition-colors group ${currentUser?.id === u.id ? 'bg-[#4caf50]/5' : ''}`}
                                    >
                                        <td className="py-6 px-8 font-black text-gray-600 group-hover:text-[#4caf50] text-sm">{(index + 1).toString().padStart(2, '0')}</td>
                                        <td className="py-6 px-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-[#141814]">
                                                    <img src={u.avatar_url || 'https://psgivxgycjireinwnelc.supabase.co/storage/v1/object/public/avatars/default-avatar.png'} alt="" className="w-full h-full object-cover" />
                                                </div>
                                                <div>
                                                    <div className="text-white font-black text-sm">{u.display_name || u.username}</div>
                                                    <div className="text-[9px] font-black uppercase" style={{ color: calculateTitle(u.xp).color }}>{calculateTitle(u.xp).name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-6 px-4 text-center">
                                            <span className="px-3 py-1 bg-black/40 rounded-lg text-xs font-black text-[#4caf50] border border-white/5">LV.{calculateLevel(u.xp)}</span>
                                        </td>
                                        <td className="py-6 px-4 text-right">
                                            <span className="text-gray-100 font-black text-sm">{u.xp.toLocaleString()}</span>
                                            <span className="text-[10px] text-gray-600 ml-2 font-black">XP</span>
                                        </td>
                                    </motion.tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4" className="py-20 text-center text-gray-700 font-black uppercase tracking-widest text-[10px] italic">Chưa có cao thủ nào xuất hiện... ✨</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            <div className="text-center bg-gradient-to-br from-[#1a221a] to-black p-12 rounded-[50px] border border-[#4caf50]/20 shadow-2xl relative overflow-hidden mb-20">
                <h2 className="text-3xl font-black text-white mb-6">BẠN MUỐN CÓ TÊN TRÊN BẢNG VÀNG?</h2>
                <p className="text-gray-400 mb-10 max-w-lg mx-auto text-sm">Đọc truyện mỗi ngày, tham gia thảo luận để tích lũy XP và thăng hạng ngay nhé!</p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                    <Link href="/" className="px-10 py-4 bg-[#4caf50] text-[#0a0c0a] font-black rounded-2xl hover:scale-105 transition-all shadow-xl text-xs uppercase tracking-widest">ĐỌC TRUYỆN NGAY 📖</Link>
                </div>
            </div>
        </div>

        <style jsx global>{`
            @keyframes float {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-15px); }
            }
            .animate-float { animation: float 4s ease-in-out infinite; }
        `}</style>
    </div>
  );
}
