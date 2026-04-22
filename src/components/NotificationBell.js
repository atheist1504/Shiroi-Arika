'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getNotificationsAction, markNotificationAsReadAction, markAllNotificationsAsReadAction, unsubscribeFromTopicAction } from '@/lib/actions';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { requestNotificationPermission } from '@/lib/fcmClient';

// 🛡️ HÀM HELPER: Kiểm tra và định dạng thời gian an toàn, tránh sập trang (Anti-crash) 🍀
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

export default function NotificationBell() {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef(null);
    const [isMounted, setIsMounted] = useState(false);
    const [user, setUser] = useState(null);
    const [userId, setUserId] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [isLoading, setIsLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(0);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [pushEnabled, setPushEnabled] = useState(false);
    const LIMIT = 20;

    useEffect(() => {
        setIsMounted(true);
        
        const initAuth = async () => {
            setConnectionStatus('connecting');
            // 1. Ưu tiên lấy từ LocalStorage để nhanh ⚡
            const storedUser = localStorage.getItem('shiroi_user');
            let u = storedUser ? JSON.parse(storedUser) : null;
            
            // 2. Dự phòng: Nếu LocalStorage trống, gọi API để lấy từ Cookie 🍪
            if (!u || !u.id) {
                try {
                    const res = await fetch('/api/user');
                    const data = await res.json();
                    if (data.success && data.user) {
                        u = data.user;
                        localStorage.setItem('shiroi_user', JSON.stringify(u));
                    }
                } catch (e) {
                    console.error("❌ Không thể đồng bộ User ID từ API");
                    setConnectionStatus('error');
                    return null;
                }
            }

            if (u && u.id) {
                setUserId(u.id);
                setUser(u);
                return setupRealtime(u.id);
            }
            setConnectionStatus('disconnected');
            return null;
        };

        const setupRealtime = (uid) => {
            const channel = supabase
                .channel(`notif-${uid}`)
                .on('postgres_changes', { 
                    event: '*', 
                    schema: 'public', 
                    table: 'shiroi_notifications',
                    filter: `user_id=eq.${uid}`
                }, (payload) => {
                    if (payload.eventType === 'INSERT') {
                        console.log("🔔 Nhận thông báo mới:", payload.new);
                        setNotifications(prev => [payload.new, ...prev]);
                        setUnreadCount(prev => prev + 1);
                        
                        try {
                            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                            audio.volume = 0.15;
                            audio.play();
                        } catch (e) {}
                    } else if (payload.eventType === 'UPDATE') {
                        setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new : n));
                        // Cập nhật lại số lượng chưa đọc dựa trên toàn bộ state (để chính xác nhất)
                        setNotifications(current => {
                            const updated = current.map(n => n.id === payload.new.id ? payload.new : n);
                            setUnreadCount(updated.filter(n => !n.is_read).length);
                            return updated;
                        });
                    }
                })
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        setConnectionStatus('connected');
                    } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                        setConnectionStatus('error');
                    }
                });

            return channel;
        };

        const channelPromise = initAuth();
        fetchNotifications();

        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
                setIsSettingsOpen(false);
            }
        };

        // Lấy trạng thái Push từ LocalStorage 💾
        const storedPush = localStorage.getItem('shiroi_push_enabled');
        if (storedPush === 'true') setPushEnabled(true);

        document.addEventListener('mousedown', handleClickOutside);
        
        return () => {
            channelPromise.then(channel => {
                 if (channel && typeof channel.unsubscribe === 'function') channel.unsubscribe();
            });
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        };
    }, [isOpen]);

    const fetchNotifications = async (offset = 0) => {
        setIsLoading(true);
        const res = await getNotificationsAction(LIMIT, offset);
        if (res.success) {
            if (offset === 0) {
                setNotifications(res.notifications);
                setUnreadCount(res.notifications.filter(n => !n.is_read).length);
            } else {
                setNotifications(prev => [...prev, ...res.notifications]);
            }
            setHasMore(res.notifications.length === LIMIT);
        }
        setIsLoading(false);
    };

    const handleLoadMore = () => {
        if (!isLoading && hasMore) {
            const nextOffset = (page + 1) * LIMIT;
            setPage(prev => prev + 1);
            fetchNotifications(nextOffset);
        }
    };

    const handleMarkAsRead = async (id) => {
        const res = await markNotificationAsReadAction(id);
        if (res.success) {
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
    };

    const handleMarkAllRead = async () => {
        const res = await markAllNotificationsAsReadAction();
        if (res.success) {
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        }
    };

    const handleTogglePush = async () => {
        const newState = !pushEnabled;
        setPushEnabled(newState);
        localStorage.setItem('shiroi_push_enabled', newState.toString());

        try {
            if (newState) {
                // BẬT: Xin quyền và lấy Token
                const token = await requestNotificationPermission();
                if (!token) {
                    setPushEnabled(false);
                    localStorage.setItem('shiroi_push_enabled', 'false');
                }
            } else {
                // TẮT: Hủy đăng ký Topic (Nếu có token trong localStorage)
                const storedUser = localStorage.getItem('shiroi_user');
                const u = storedUser ? JSON.parse(storedUser) : null;
                if (u?.fcm_token) {
                    await unsubscribeFromTopicAction(u.fcm_token);
                }
            }
        } catch (err) {
            console.error("❌ Lỗi chuyển đổi Push:", err);
        }
    };

    const getIcon = (type, title = '') => {
        if (title.includes('Danh hiệu')) return '🏆';
        if (title.includes('Báo cáo')) return '🚩';
        if (title.includes('khắc phục')) return '🛠️';
        
        switch (type) {
            case 'chapter_update': return '📚';
            case 'system': return '🎯';
            case 'reply': return '💬';
            default: return '🔔';
        }
    };

    const getLink = (notif) => {
        const data = notif.data || {};
        
        // 💬 1. BÌNH LUẬN & PHẢN HỒI
        if (notif.type === 'reply') {
            if (data.mangaId && data.chapterId) return `/read/${data.chapterId}#comments`;
            if (data.mangaId) return `/manga/${data.mangaId}#comments`;
        }

        // 📚 2. CẬP NHẬT CHƯƠNG MỚI
        if (notif.type === 'chapter_update') {
            if (data.chapterId) return `/read/${data.chapterId}`;
            if (data.mangaId) return `/manga/${data.mangaId}`;
        }

        // 🎯 3. NHIỆM VỤ & THÀNH TỰU (MỞ MODAL)
        if (data.missionKey || notif.title?.includes('nhiệm vụ') || notif.title?.includes('Thưởng')) {
            // Đính kèm tab=achievements để Navbar mở MissionsModal
            const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
            return `${currentPath}?tab=achievements`;
        }

        // 🚩 4. BÁO CÁO (ADMIN & USER)
        if (notif.type === 'system' || notif.title?.includes('Báo cáo')) {
            // Link cho Admin
            if (data.reportId === 'new' || user?.username?.toLowerCase().includes('admin')) {
                return '/admin/reports';
            }
            // Link cho User
            return '/profile?tab=reports';
        }

        if (data.mangaId) return `/manga/${data.mangaId}`;
        return '#';
    };

    if (!isMounted) return <div className="w-10 h-10"></div>;

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Icon */}
            <button 
                onClick={() => {
                    setIsOpen(!isOpen);
                    // 🔔 Yêu cầu quyền thông báo khi người dùng quan tâm đến chuông
                    if (!isOpen) { 
                        requestNotificationPermission().catch(err => console.error("FCM Permission Error:", err));
                    }
                }}
                className={`p-2.5 rounded-xl transition-all duration-300 relative group ${
                    isOpen ? 'bg-[#4caf50] text-[#0a0c0a] shadow-[0_0_20px_rgba(76,175,80,0.4)]' : 'text-gray-400 hover:text-[#4caf50] hover:bg-[#4caf50]/10'
                }`}
            >
                <svg className="w-5 h-5 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-[#0a0c0a] animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: 15, scale: 0.95, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: 10, scale: 0.95, filter: 'blur(10px)' }}
                        className="absolute right-[-60px] sm:right-0 mt-4 w-[calc(100vw-32px)] sm:w-[360px] bg-[#0c0f0c]/95 backdrop-blur-xl border border-[#4caf50]/30 rounded-[28px] sm:rounded-[32px] shadow-[0_30px_90px_rgba(0,0,0,0.9),0_0_20px_rgba(76,175,80,0.1)] z-[200] overflow-hidden"
                    >
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-[#4caf50]/15 to-transparent">
                            <div className="flex items-center gap-4">
                                {isSettingsOpen && (
                                    <button 
                                        onClick={() => setIsSettingsOpen(false)}
                                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                )}
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2.5 mb-1">
                                        <div className="w-1.5 h-4 bg-[#4caf50] rounded-full shadow-[0_0_10px_rgba(76,175,80,0.5)]"></div>
                                        <h3 className="text-[12px] font-black uppercase tracking-[0.25em] text-white">
                                            {isSettingsOpen ? 'Cài đặt' : 'Thông báo'}
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-0.5">
                                        <div className={`w-1.5 h-1.5 rounded-full ${
                                            connectionStatus === 'connected' ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 
                                            connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
                                        }`}></div>
                                        <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">
                                            {connectionStatus === 'connected' ? 'Real-time Active' : 
                                            connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                {!isSettingsOpen && unreadCount > 0 && (
                                    <button 
                                        onClick={handleMarkAllRead}
                                        className="text-[10px] font-bold text-[#4caf50] hover:text-[#66bb6a] transition-colors uppercase tracking-wider"
                                    >
                                        Đọc tất cả
                                    </button>
                                )}
                                <button 
                                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                                    className={`p-2 rounded-lg transition-all ${isSettingsOpen ? 'bg-[#4caf50] text-[#0a0c0a]' : 'text-gray-400 hover:text-[#4caf50] hover:bg-[#4caf50]/10'}`}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[420px] overflow-y-auto custom-scrollbar">
                            {isSettingsOpen ? (
                                // ⚙️ SETTINGS VIEW
                                <div className="p-8 space-y-8">
                                    <div className="flex justify-between items-center">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[11px] font-black text-white uppercase tracking-wider">Thông báo đẩy (Push)</span>
                                            <span className="text-[10px] text-gray-500 font-medium">Nhận tin ngay cả khi tắt web</span>
                                        </div>
                                        <button 
                                            onClick={handleTogglePush}
                                            className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${pushEnabled ? 'bg-[#4caf50]' : 'bg-gray-800'}`}
                                        >
                                            <div className={`w-4 h-4 bg-white rounded-full shadow-lg transform transition-transform duration-300 ${pushEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                        </button>
                                    </div>

                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                        <p className="text-[10px] text-gray-400 leading-relaxed italic">
                                            Lưu ý: Bạn cần cấp quyền thông báo trên trình duyệt để tính năng này hoạt động ổn định. 🍀
                                        </p>
                                    </div>

                                    <div className="pt-4 opacity-50">
                                        <p className="text-[9px] font-bold text-gray-600 uppercase tracking-[0.2em] text-center italic">Phiên bản 1.0 (BETA)</p>
                                    </div>
                                </div>
                            ) : (
                                isLoading && page === 0 ? (
                                    // 🦴 SKELETON LOADING
                                    [...Array(5)].map((_, i) => (
                                        <div key={i} className="p-5 border-b border-[#2a332a]/40 animate-pulse">
                                            <div className="flex gap-4">
                                                <div className="w-8 h-8 bg-white/5 rounded-lg shrink-0"></div>
                                                <div className="flex-1 space-y-3">
                                                    <div className="h-2 w-1/3 bg-white/10 rounded"></div>
                                                    <div className="h-2 w-full bg-white/5 rounded"></div>
                                                    <div className="h-2 w-1/4 bg-white/5 rounded"></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : notifications.length > 0 ? (
                                    <>
                                        {notifications.map((notif) => (
                                            <div 
                                                key={notif.id}
                                                className={`p-5 border-b border-[#2a332a]/40 hover:bg-white/[0.03] transition-all relative group ${
                                                    !notif.is_read ? 'bg-[#4caf50]/5' : ''
                                                }`}
                                            >
                                                <div className="flex gap-4">
                                                    <div className="mt-1 text-xl shrink-0 group-hover:scale-125 transition-transform duration-300">
                                                        {getIcon(notif.type, notif.title)}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start mb-1.5">
                                                            <p className={`text-[11px] font-black uppercase tracking-wider leading-tight ${
                                                                !notif.is_read ? 'text-[#4caf50]' : 'text-gray-300'
                                                            }`}>
                                                                {notif.title}
                                                            </p>
                                                            {!notif.is_read && <div className="w-2 h-2 bg-[#4caf50] rounded-full mt-1 shrink-0 shadow-[0_0_8px_rgba(76,175,80,0.6)]"></div>}
                                                        </div>
                                                        <p className="text-[11px] text-gray-400 font-medium leading-relaxed mb-3 line-clamp-2 italic opacity-80 group-hover:opacity-100 transition-opacity">
                                                            {notif.body}
                                                        </p>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[10px] text-gray-600 font-bold uppercase tracking-tight">
                                                                {formatSafeDistance(notif.created_at)}
                                                            </span>
                                                            <Link 
                                                                href={getLink(notif)}
                                                                onClick={() => { handleMarkAsRead(notif.id); setIsOpen(false); }}
                                                                className="text-[10px] font-black text-[#4caf50] hover:scale-105 transition-all uppercase tracking-tighter bg-[#4caf50]/10 hover:bg-[#4caf50]/20 px-3 py-1 rounded-lg border border-[#4caf50]/20"
                                                            >
                                                                {notif.type === 'reply' ? 'TRẢ LỜI' : 'CHI TIẾT'}
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        
                                        {/* Nút Xem thêm */}
                                        {hasMore && (
                                            <div className="p-4 flex justify-center bg-black/10">
                                                <button 
                                                    onClick={handleLoadMore}
                                                    disabled={isLoading}
                                                    className={`text-[10px] font-black uppercase tracking-wider px-6 py-2 rounded-full border border-[#4caf50]/20 transition-all ${
                                                        isLoading ? 'opacity-50 cursor-not-allowed' : 'text-[#4caf50] hover:bg-[#4caf50]/10 hover:border-[#4caf50]/40'
                                                    }`}
                                                >
                                                    {isLoading ? 'Đang tải...' : 'Xem thêm thông báo cũ'}
                                                </button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    !isLoading && (
                                        <div className="py-16 px-8 text-center bg-gradient-to-b from-transparent to-black/20">
                                            <div className="text-5xl mb-5 grayscale opacity-20 group-hover:grayscale-0 transition-all">📭</div>
                                            <p className="text-[11px] font-black text-gray-600 uppercase tracking-[0.3em]">Hộp thư đang trống</p>
                                        </div>
                                    )
                                )
                            )}
                        </div>
                        <div className="p-5 bg-black/40 border-t border-white/5 text-center">
                             <Link href="/profile?tab=notifications" onClick={() => setIsOpen(false)} className="text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-[0.25em] transition-all hover:letter-spacing-[0.3em]">
                                Xem lịch sử hoạt động
                             </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
