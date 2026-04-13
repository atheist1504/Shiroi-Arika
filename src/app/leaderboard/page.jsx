'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { optimizeImage } from '@/lib/cloudinary';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { calculateLevel, calculateTitle } from '@/lib/xp';

function LeaderboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const query = searchParams.get('q') || '';
  const currentPage = parseInt(searchParams.get('page') || '1') || 1;
  const pageSize = 10;

  const [users, setUsers] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(query);
  const [activeTab, setActiveTab] = useState('total'); // 'total', 'this_month', 'last_month'
  const [dbError, setDbError] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('shiroi_user');
    if (storedUser) setCurrentUser(JSON.parse(storedUser));
    fetchAdmins();
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [currentPage, query, activeTab]);

  const fetchAdmins = async () => {
    try {
        const { data } = await supabase
            .from('shiroi_users')
            .select('*')
            .or('username.ilike.%admin%,display_name.ilike.%quản trị%');
        if (data) setAdminUsers(data);
    } catch (err) {
        console.error("Lỗi lấy admin:", err);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setUsers([]); 
      setTotalCount(0); // 🧹 Reset cả phân trang để tránh nhầm lẫn 🍀
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      if (activeTab === 'total') {
          // 🏆 BXH TỔNG (Logic cũ)
          let baseQuery = supabase.from('shiroi_users').select('*', { count: 'exact' });
          baseQuery = baseQuery.not('username', 'ilike', '%admin%').not('display_name', 'ilike', '%quản trị%');
          if (query) baseQuery = baseQuery.or(`username.ilike.%${query}%,display_name.ilike.%${query}%`);
          
          const { data, error, count } = await baseQuery.order('xp', { ascending: false }).range(from, to);
          if (!error && data) {
            setUsers(data.map(u => ({ ...u, total_xp: u.xp, ranking_xp: u.xp })));
            setTotalCount(count || 0);
          }
      } else {
          // 📅 BXH THÁNG (RPC Logic mới)
          setDbError(null);
          const monthOffset = activeTab === 'this_month' ? 0 : 1;
          const { data, error } = await supabase.rpc('get_monthly_leaderboard', { month_offset: monthOffset });
          
          if (error) {
              console.error("Lỗi RPC:", error);
              setDbError(`Lỗi Database: ${error.message} (Code: ${error.code})`);
              return;
          }

          if (data) {
            // Lọc theo search query nếu có
            let filtered = data;
            if (query) {
                const q = query.toLowerCase();
                filtered = data.filter(u => 
                    (u.username && u.username.toLowerCase().includes(q)) || 
                    (u.display_name && u.display_name.toLowerCase().includes(q))
                );
            }
            
            setTotalCount(filtered.length);
            setUsers(filtered.slice(from, to + 1).map(u => ({
                ...u,
                total_xp: u.total_xp,
                ranking_xp: u.monthly_xp
            })));
          }
      }
    } catch (err) {
      console.error("Lỗi lấy BXH:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchInput) params.set('q', searchInput);
    else params.delete('q');
    params.set('page', '1');
    router.push(`/leaderboard?${params.toString()}`);
  };

  const handlePageChange = (p) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', p);
    router.push(`/leaderboard?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = Math.ceil(totalCount / pageSize);
  const top3 = currentPage === 1 ? users.slice(0, 3) : [];

  return (
    <div className="min-h-screen bg-[#0a0c0a] pt-28 pb-32 px-4 relative overflow-x-hidden">
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
                
                {/* 🧧 TAB SWITCHER - BXH PHÂN CẤP 🍀 */}
                <div className="flex items-center justify-center gap-2 mb-10 mt-12 bg-white/[0.02] p-1.5 rounded-3xl border border-white/5 w-fit mx-auto backdrop-blur-xl">
                    <button 
                        onClick={() => { setActiveTab('this_month'); handlePageChange(1); }}
                        className={`px-8 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'this_month' ? 'bg-[#4caf50] text-[#0a0c0a] shadow-[0_10px_30px_rgba(76,175,80,0.3)]' : 'text-gray-500 hover:text-white'}`}
                    >
                        Tháng này
                    </button>
                    <button 
                        onClick={() => { setActiveTab('last_month'); handlePageChange(1); }}
                        className={`px-8 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'last_month' ? 'bg-[#4caf50] text-[#0a0c0a] shadow-[0_10px_30px_rgba(76,175,80,0.3)]' : 'text-gray-500 hover:text-white'}`}
                    >
                        Tháng trước
                    </button>
                    <button 
                        onClick={() => { setActiveTab('total'); handlePageChange(1); }}
                        className={`px-8 py-3 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'total' ? 'bg-[#4caf50] text-[#0a0c0a] shadow-[0_10px_30px_rgba(76,175,80,0.3)]' : 'text-gray-500 hover:text-white'}`}
                    >
                        Tổng hạng
                    </button>
                </div>
                
                <p className="text-gray-500 font-bold max-w-xl mx-auto uppercase tracking-widest text-[10px]">
                    {activeTab === 'total' ? 'Mọi nỗ lực từ trước đến nay đều được vinh danh tại đây' : (activeTab === 'this_month' ? 'Cuộc đua giành ngôi vương đầy kịch tính của tháng này' : 'Bảng thành tích huy hoàng của tháng vừa qua')}
                </p>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-30 animate-pulse">
                    <div className="w-16 h-16 border-t-4 border-[#4caf50] rounded-full animate-spin mb-4"></div>
                    <span className="text-xs font-black uppercase tracking-[0.5em] text-[#4caf50]">Đang giải mã thứ hạng...</span>
                </div>
            ) : dbError ? (
                <div className="max-w-xl mx-auto mb-12 p-8 bg-red-500/10 border border-red-500/20 rounded-[40px] text-center animate-shake">
                    <div className="text-4xl mb-4">🆘</div>
                    <h3 className="text-red-500 font-black uppercase tracking-widest text-sm mb-2">Lỗi truy xuất dữ liệu</h3>
                    <p className="text-gray-400 text-[10px] font-bold mb-6 leading-relaxed">
                        {dbError}<br/>
                        <span className="text-red-500/50">Gợi ý: Đảm bảo bạn đã chạy đúng Script SQL trong Supabase.</span>
                    </p>
                    <button onClick={() => fetchLeaderboard()} className="px-8 py-3 bg-red-500 text-white font-black text-[10px] uppercase rounded-2xl hover:scale-105 transition-all">Thử lại ngay</button>
                </div>
            ) : (
                <>
                    {/* KHU VỰC ADMIN (CHỈ HIỆN TRANG 1 & KHI XEM TỔNG HẠNG) */}
                    {currentPage === 1 && activeTab === 'total' && adminUsers.length > 0 && (
                        <div className="max-w-4xl mx-auto bg-[#1a221a]/60 backdrop-blur-3xl border border-[#4caf50]/20 rounded-[30px] p-6 mb-16 text-center">
                            <h2 className="text-[#4caf50] text-[10px] font-black uppercase tracking-[0.3em] mb-6">👑 Đội ngũ quản trị 👑</h2>
                            <div className="flex flex-wrap items-center justify-center gap-4">
                                {adminUsers.map(admin => (
                                    <div key={admin.id} className="flex items-center gap-4 bg-black/40 px-6 py-4 rounded-2xl border border-[#4caf50]/10">
                                        <img src={optimizeImage(admin.avatar_url || 'https://psgivxgycjireinwnelc.supabase.co/storage/v1/object/public/avatars/default-avatar.png', 100)} className="w-10 h-10 rounded-xl object-cover" alt="" />
                                        <div className="text-left">
                                            <div className="text-white font-black text-sm uppercase">{admin.display_name || admin.username}</div>
                                            <div className="text-[#4caf50] font-black text-[10px]">LV.{calculateLevel(admin.xp)} - {calculateTitle(admin.xp, admin.selected_badge).name}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* PODIUM TOP 3 (CHỈ HIỆN TRANG 1) */}
                    {currentPage === 1 && top3.length > 0 && (
                        <div className="flex flex-col md:flex-row items-end justify-center gap-6 mb-24 px-4">
                            {top3[1] && (
                                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="order-2 md:order-1 w-full md:w-1/4">
                                    <div className="bg-[#141814]/60 backdrop-blur-3xl border border-white/5 p-8 rounded-[40px] text-center relative shadow-2xl">
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-3xl overflow-hidden border-4 border-gray-400 bg-[#141814]">
                                            <img src={optimizeImage(top3[1].avatar_url || 'https://psgivxgycjireinwnelc.supabase.co/storage/v1/object/public/avatars/default-avatar.png', 200)} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="mt-10 mb-4 inline-block px-4 py-1 bg-gray-400 text-black text-[10px] font-black rounded-full uppercase">Á QUÂN 🥈</div>
                                        <h3 className="text-xl font-black text-white mb-1 truncate">{top3[1].display_name || top3[1].username}</h3>
                                        <p className="text-[#4caf50] font-black text-[9px] uppercase tracking-widest">LV.{calculateLevel(top3[1].total_xp || top3[1].xp)} - {calculateTitle(top3[1].total_xp || top3[1].xp, top3[1].selected_badge).name}</p>
                                        <div className="mt-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{(top3[1].ranking_xp || 0).toLocaleString()} <span className="text-[#4caf50]/60">XP</span></div>
                                    </div>
                                </motion.div>
                            )}

                            {top3[0] && (
                                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="order-1 md:order-2 w-full md:w-1/3 mb-12">
                                    <div className="bg-[#1a221a] backdrop-blur-3xl border-2 border-[#4caf50]/30 p-10 rounded-[50px] text-center relative shadow-[0_40px_80px_rgba(76,175,80,0.15)] animate-float">
                                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-28 h-28 rounded-[35px] overflow-hidden border-4 border-[#4caf50] shadow-[0_0_40px_rgba(76,175,80,0.4)] bg-[#141814]">
                                            <img src={optimizeImage(top3[0].avatar_url || 'https://psgivxgycjireinwnelc.supabase.co/storage/v1/object/public/avatars/default-avatar.png', 300)} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="mt-14 mb-5 inline-block px-6 py-2 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black text-xs font-black rounded-full uppercase shadow-lg animate-pulse">QUÁN QUÂN 🥇</div>
                                        <h3 className="text-3xl font-black text-white mb-2 truncate">{top3[0].display_name || top3[0].username}</h3>
                                        <p className="text-[#4caf50] font-black text-[10px] uppercase tracking-[0.2em]">CẤP {calculateLevel(top3[0].total_xp || top3[0].xp)} - {calculateTitle(top3[0].total_xp || top3[0].xp, top3[0].selected_badge).name}</p>
                                        <div className="mt-8">
                                            <div className="inline-block px-5 py-2 bg-black/40 rounded-2xl border border-white/5">
                                                <span className="text-lg font-black text-white">{(top3[0].ranking_xp || 0).toLocaleString()}</span>
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
                                            <img src={optimizeImage(top3[2].avatar_url || 'https://psgivxgycjireinwnelc.supabase.co/storage/v1/object/public/avatars/default-avatar.png', 200)} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <div className="mt-10 mb-4 inline-block px-4 py-1 bg-orange-700 text-white text-[10px] font-black rounded-full uppercase">HẠNG 3 🥉</div>
                                        <h3 className="text-xl font-black text-white mb-1 truncate">{top3[2].display_name || top3[2].username}</h3>
                                        <p className="text-[#4caf50] font-black text-[9px] uppercase tracking-widest">LV.{calculateLevel(top3[2].total_xp || top3[2].xp)} - {calculateTitle(top3[2].total_xp || top3[2].xp, top3[2].selected_badge).name}</p>
                                        <div className="mt-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{(top3[2].ranking_xp || 0).toLocaleString()} <span className="text-[#4caf50]/60">XP</span></div>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    )}

                    {/* BẢNG DANH SÁCH THÀNH VIÊN 📜 */}
                    <div className="max-w-4xl mx-auto mb-8">
                        <form onSubmit={handleSearchSubmit} className="relative group">
                            <input 
                               type="text" 
                               placeholder="Tìm kiếm danh tính thành viên..." 
                               value={searchInput}
                               onChange={(e) => setSearchInput(e.target.value)}
                               className="w-full bg-[#141814]/40 border border-white/5 rounded-2xl py-3.5 px-6 pl-12 text-xs font-bold text-white focus:border-[#4caf50] outline-none transition-all placeholder:text-gray-700 shadow-xl"
                            />
                            <button type="submit" className="absolute left-4 top-3.5 text-gray-700 group-focus-within:text-[#4caf50]">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            </button>
                        </form>
                    </div>

                    <div className="max-w-4xl mx-auto bg-[#141814]/40 backdrop-blur-2xl border border-white/5 rounded-[40px] overflow-hidden shadow-2xl mb-12">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[500px]">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                                    <th className="py-6 px-8">#</th>
                                    <th className="py-6 px-4">THÀNH VIÊN</th>
                                    <th className="py-6 px-4 text-center">CẤP ĐỘ</th>
                                    <th className="py-6 px-4 text-right">{activeTab === 'total' ? 'KINH NGHIỆM' : 'KINH NGHIỆM THÁNG'}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.03]">
                                {users.length > 0 ? users.map((u, index) => {
                                    const rank = (currentPage - 1) * pageSize + index + 1;
                                    const txp = u.total_xp || u.xp;
                                    const rxp = u.ranking_xp || 0;
                                    return (
                                        <motion.tr 
                                          key={u.id} 
                                          initial={{ opacity: 0 }}
                                          animate={{ opacity: 1 }}
                                          className={`hover:bg-white/[0.02] transition-colors group ${currentUser?.id === u.id ? 'bg-[#4caf50]/5' : ''}`}
                                        >
                                            <td className="py-6 px-8 font-black text-gray-600 group-hover:text-[#4caf50] text-sm">{rank.toString().padStart(2, '0')}</td>
                                            <td className="py-6 px-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-[#141814]">
                                                        <img src={optimizeImage(u.avatar_url || 'https://psgivxgycjireinwnelc.supabase.co/storage/v1/object/public/avatars/default-avatar.png', 100)} alt="" className="w-full h-full object-cover" />
                                                    </div>
                                                    <div>
                                                        <div className="text-white font-black text-sm">{u.display_name || u.username}</div>
                                                        <div className="text-[9px] font-black uppercase text-[#4caf50]/80">{calculateTitle(txp, u.selected_badge).name}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-6 px-4 text-center">
                                                <span className="px-3 py-1 bg-black/40 rounded-lg text-xs font-black text-[#4caf50] border border-white/5">LV.{calculateLevel(txp)}</span>
                                            </td>
                                            <td className="py-6 px-4 text-right">
                                                <span className="text-gray-100 font-black text-sm">{rxp.toLocaleString()}</span>
                                                <span className="text-[10px] text-gray-600 ml-2 font-black">XP</span>
                                            </td>
                                        </motion.tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan="4" className="py-20 text-center space-y-4">
                                            <div className="text-gray-700 font-black uppercase tracking-widest text-[10px] italic">Chưa có cao thủ nào xuất hiện... ✨</div>
                                            {activeTab !== 'total' && (
                                                <div className="text-[#4caf50]/40 text-[8px] font-bold uppercase tracking-widest">
                                                    Mẹo: Nếu đã có điểm nhưng trang này vẫn trống, <br/>hãy chạy Script "Backfill XP" trong Supabase Editor.
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        </div>
                    </div>

                    {/* PHÂN TRANG 🍀 */}
                    {totalPages > 1 && (
                      <div className="mb-20 flex flex-wrap justify-center items-center gap-2">
                        <button
                          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                          className={`px-4 py-2 rounded-xl font-bold text-[10px] uppercase transition-all border ${
                            currentPage === 1 
                            ? 'opacity-30 cursor-not-allowed border-white/5' 
                            : 'bg-[#141814] border-white/5 text-gray-400 hover:border-[#4caf50] hover:text-[#4caf50]'
                          }`}
                        >
                          TRƯỚC
                        </button>

                        {[...Array(totalPages)].map((_, i) => {
                          const p = i + 1;
                          if (p === 1 || p === totalPages || (p >= currentPage - 2 && p <= currentPage + 2)) {
                            return (
                              <button
                                key={p}
                                onClick={() => handlePageChange(p)}
                                className={`w-10 h-10 flex items-center justify-center rounded-xl font-black text-xs transition-all border ${
                                  currentPage === p
                                  ? 'bg-[#4caf50] border-[#4caf50] text-[#0a0c0a] scale-110 shadow-lg shadow-[#4caf50]/20'
                                  : 'bg-[#141814] border-white/5 text-gray-500 hover:border-[#4caf50] hover:text-[#4caf50]'
                                }`}
                              >
                                {p}
                              </button>
                            );
                          }
                          if (p === currentPage - 3 || p === currentPage + 3) return <span key={p} className="text-gray-700">...</span>;
                          return null;
                        })}

                        <button
                          onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                          className={`px-4 py-2 rounded-xl font-bold text-[10px] uppercase transition-all border ${
                            currentPage === totalPages 
                            ? 'opacity-30 cursor-not-allowed border-white/5' 
                            : 'bg-[#141814] border-white/5 text-gray-400 hover:border-[#4caf50] hover:text-[#4caf50]'
                          }`}
                        >
                          SAU
                        </button>
                      </div>
                    )}
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

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0c0a] flex items-center justify-center"><div className="w-12 h-12 border-4 border-[#4caf50]/20 border-t-[#4caf50] rounded-full animate-spin"></div></div>}>
      <LeaderboardContent />
    </Suspense>
  );
}
