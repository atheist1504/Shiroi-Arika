'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { fetchUserMissionProgress } from '@/lib/missions';
import { claimMissionRewardAction } from '@/lib/actions';
import { fixR2Url, optimizeImage } from '@/lib/cloudinary';


export default function MissionsModal({ isOpen, onClose }) {
    const [activeTab, setActiveTab] = useState('missions'); // 'missions' | 'compass'
    const [missions, setMissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [claimingKey, setClaimingKey] = useState(null);
    const [user, setUser] = useState(null);
    const [compassData, setCompassData] = useState({ total: 0, finished: 0, pending: [] });

    useEffect(() => {
        if (isOpen) {
            const raw = localStorage.getItem('shiroi_user');
            if (raw) {
                const u = JSON.parse(raw);
                setUser(u);
                loadProgress(u.id);
                loadCompass(u.id);
            }
        }
    }, [isOpen]);

    const loadProgress = async (userId) => {
        setLoading(true);
        const data = await fetchUserMissionProgress(userId);
        setMissions(data);
        setLoading(false);
    };

    const loadCompass = async (userId) => {
        try {
            const { data: allManga } = await supabase.from('mangas').select('id, title, cover_image, status');
            const { data: readLogs } = await supabase.from('shiroi_read_chapters').select('manga_id, chapter_id').eq('user_id', userId);
            const { data: allChapters } = await supabase.from('chapters').select('id, manga_id');

            const mangaMap = {};
            allManga.forEach(m => {
                mangaMap[m.id] = { ...m, chapters: [], readCount: 0 };
            });

            allChapters.forEach(c => {
                if (mangaMap[c.manga_id]) mangaMap[c.manga_id].chapters.push(c.id);
            });

            readLogs.forEach(log => {
                if (mangaMap[log.manga_id]) mangaMap[log.manga_id].readCount++;
            });

            const pending = Object.values(mangaMap).filter(m => m.readCount < m.chapters.length && m.chapters.length > 0)
                .sort((a, b) => b.readCount - a.readCount);
            
            const finishedCount = Object.values(mangaMap).filter(m => m.readCount >= m.chapters.length && m.chapters.length > 0).length;

            setCompassData({
                total: allManga.length,
                finished: finishedCount,
                pending: pending.slice(0, 5) // Show top 5 pending
            });
        } catch (err) { console.error("Compass error:", err); }
    };

    const handleClaim = async (missionKey) => {
        if (!user || claimingKey) return;
        setClaimingKey(missionKey);
        try {
            const res = await claimMissionRewardAction(missionKey);
            if (res.success) {
                // Update local missions state 🚀
                setMissions(prev => prev.map(m => m.key === missionKey ? { ...m, isClaimed: true } : m));
                
                // Update local storage XP
                localStorage.setItem('shiroi_user', JSON.stringify(res.user));
                setUser(res.user);
                window.dispatchEvent(new Event('storage'));
            } else {
                alert(res.error || "Có lỗi khi nhận thưởng! 🛡️");
            }
        } finally {
            setClaimingKey(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60000] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={onClose}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="relative w-full max-w-2xl bg-[#0a0c0a]/90 border border-white/10 rounded-[40px] overflow-hidden shadow-2xl"
            >
                {/* 🎨 HEADER ✨ */}
                <div className="p-8 pb-0">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-black text-[#4caf50] uppercase tracking-widest">KHO THÀNH TỰU</h2>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight mt-1">LÀM NHIỆM VỤ - NHẬN LƯỢNG LỚN XP 💎</p>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-red-500/20 hover:text-red-500 transition-all">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    {/* 📑 TABS 🚀 */}
                    <div className="flex gap-2 p-1 bg-white/5 rounded-2xl mb-6">
                        <button 
                            onClick={() => setActiveTab('missions')}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'missions' ? 'bg-[#4caf50] text-[#0a0c0a] shadow-lg shadow-[#4caf50]/20' : 'text-gray-400 hover:text-white'}`}
                        >
                            Nhiệm vụ & Thưởng
                        </button>
                        <button 
                            onClick={() => setActiveTab('compass')}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'compass' ? 'bg-[#4caf50] text-[#0a0c0a] shadow-lg shadow-[#4caf50]/20' : 'text-gray-400 hover:text-white'}`}
                        >
                            La bàn Chinh phục
                        </button>
                    </div>
                </div>

                {/* 📜 CONTENT AREA 🌊 */}
                <div className="p-8 pt-0 h-[500px] overflow-y-auto custom-scrollbar">
                    {activeTab === 'missions' ? (
                        <div className="space-y-4">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-40 opacity-30 animate-pulse">
                                    <div className="w-10 h-10 border-4 border-[#4caf50] border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-[10px] font-black uppercase mt-4 tracking-widest">Đang tính toán tu vi...</p>
                                </div>
                            ) : (
                                Object.entries(
                                    missions.reduce((acc, m) => {
                                        if (!acc[m.category]) acc[m.category] = [];
                                        acc[m.category].push(m);
                                        return acc;
                                    }, {})
                                ).map(([category, items]) => (
                                    <div key={category} className="space-y-4 pt-4 first:pt-0">
                                        <h3 className="text-[11px] font-black text-gray-600 uppercase tracking-[0.3em] pl-2">{category}</h3>
                                        {items.map(m => (
                                            <div key={m.key} className={`group p-5 bg-white/5 border rounded-3xl transition-all ${m.isCompleted && !m.isClaimed ? 'border-[#4caf50]/50 bg-[#4caf50]/5' : 'border-white/5'}`}>
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex-1">
                                                        <h4 className={`text-xs font-black uppercase tracking-wide ${m.isClaimed ? 'text-gray-600' : 'text-white'}`}>{m.title}</h4>
                                                        <p className="text-[9px] text-gray-500 font-medium mt-1 uppercase tracking-tight">{m.description}</p>
                                                        
                                                        {/* Progress Bar 📏 */}
                                                        {!m.isClaimed && (
                                                            <div className="mt-4 h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                                                                <motion.div 
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${Math.min(100, (m.current / m.target) * 100)}%` }}
                                                                    className={`h-full rounded-full ${m.isCompleted ? 'bg-[#4caf50]' : 'bg-amber-500'}`}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="text-right">
                                                        {m.isClaimed ? (
                                                            <span className="text-[9px] font-black text-gray-700 uppercase tracking-widest px-4 py-2 bg-white/5 rounded-xl border border-white/5 italic">Đã nhận</span>
                                                        ) : m.isCompleted ? (
                                                            <button 
                                                                onClick={() => handleClaim(m.key)}
                                                                disabled={claimingKey === m.key}
                                                                className="px-6 py-2 bg-[#4caf50] text-[#0a0c0a] text-[10px] font-black rounded-xl shadow-lg shadow-[#4caf50]/20 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest"
                                                            >
                                                                {claimingKey === m.key ? '...' : `NHẬN +${m.xp} XP`}
                                                            </button>
                                                        ) : (
                                                            <div className="text-[10px] font-black text-amber-500/80 bg-amber-500/5 px-4 py-2 rounded-xl border border-amber-500/20 tracking-tighter">
                                                                {m.current}/{m.target}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="space-y-8 animate-fade-in">
                            {/* 📈 GLOBAL PROGRESS 🌍 */}
                            <div className="bg-gradient-to-br from-[#4caf50]/10 to-transparent p-8 rounded-[32px] border border-[#4caf50]/10">
                                <div className="flex items-end justify-between mb-4">
                                    <div>
                                        <p className="text-[9px] font-black text-[#4caf50] uppercase tracking-widest opacity-60">PHÁ ĐẢO SHIROI</p>
                                        <h3 className="text-3xl font-black text-white italic mt-1">{Math.floor((compassData.finished / Math.max(1, compassData.total)) * 100)}%</h3>
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-tighter">
                                        Đã xong {compassData.finished} / {compassData.total} bộ
                                    </p>
                                </div>
                                <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden shadow-inner">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(compassData.finished / Math.max(1, compassData.total)) * 100}%` }}
                                        className="h-full bg-gradient-to-r from-[#4caf50] to-emerald-400 rounded-full"
                                    />
                                </div>
                                <p className="text-[8px] text-gray-600 mt-4 uppercase font-black tracking-widest text-center">Đọc hết toàn bộ {compassData.total} bộ truyện để nhận 10.000 XP Kẻ Chinh Phục! 🏆</p>
                            </div>

                            {/* 🧭 UNFINISHED LIST 📔 */}
                            <div className="space-y-4">
                                <h3 className="text-[11px] font-black text-gray-600 uppercase tracking-[0.3em] pl-2">La bàn định hướng (Truyện dở dang)</h3>
                                {compassData.pending.length === 0 ? (
                                    <div className="py-20 text-center bg-white/5 rounded-[40px] border border-dashed border-white/10">
                                        <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Đã chinh phục hết mọi phụ bản! 👑</p>
                                    </div>
                                ) : (
                                    compassData.pending.map(m => (
                                        <div key={m.id} className="flex gap-4 p-4 bg-white/5 border border-white/5 rounded-3xl hover:border-[#4caf50]/20 transition-all group">
                                            <div className="w-16 h-20 rounded-xl overflow-hidden bg-black shrink-0 border border-white/10 flex items-center justify-center">
                                                {m.cover_image ? (
                                                    <img src={optimizeImage(fixR2Url(m.cover_image), '200')} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500" alt="" />
                                                ) : (
                                                    <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                                )}
                                            </div>
                                            <div className="flex-1 flex flex-col justify-center">
                                                <h4 className="text-xs font-black text-white uppercase tracking-tight line-clamp-1">{m.title}</h4>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <div className="flex-1 h-1 bg-black/40 rounded-full overflow-hidden">
                                                        <div className="h-full bg-amber-500/50" style={{ width: `${(m.readCount / Math.max(1, m.chapters.length)) * 100}%` }}></div>
                                                    </div>
                                                    <span className="text-[9px] font-bold text-gray-500">{m.readCount}/{m.chapters.length}</span>
                                                </div>
                                                <button onClick={() => window.location.href = `/manga/${m.id}`} className="mt-3 text-[9px] font-black text-[#4caf50] uppercase tracking-widest hover:underline text-left">Tiếp tục cày ➔</button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            
                            {/* 💡 TIP 🚀 */}
                            <div className="mt-8 p-4 bg-[#4caf50]/5 border border-[#4caf50]/10 rounded-2xl text-center">
                                <p className="text-[9px] font-bold text-[#4caf50] uppercase tracking-widest">
                                    Đã đọc xong một bộ truyện? <br/>
                                    Hãy sang tab <span className="underline decoration-wavy mx-1">Nhiệm vụ & Thưởng</span> để nhận ngay XP Chinh phục! ⚔️
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* 🔒 FOOTER NOTE 🍀 */}
                <div className="p-6 bg-black/40 border-t border-white/5 text-center">
                    <p className="text-[8px] text-gray-700 font-bold uppercase tracking-[0.4em]">NHẤN CÁC NÚT NHẬN THƯỞNG ĐỂ QUY ĐỔI THÀNH XP THẬT 💎</p>
                </div>
            </motion.div>
        </div>
    );
}
