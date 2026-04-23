'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getNotificationsAction, markNotificationAsReadAction, markAllNotificationsAsReadAction, unsubscribeFromTopicAction } from '@/lib/actions';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { requestNotificationPermission } from '@/lib/fcmClient';

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
            const storedUser = localStorage.getItem('shiroi_user');
            let u = storedUser ? JSON.parse(storedUser) : null;
            
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
                        setNotifications(prev => [payload.new, ...prev]);
                        setUnreadCount(prev => prev + 1);
                        try {
                            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                            audio.volume = 0.15;
                            audio.play();
                        } catch (e) {}
                    } else if (payload.eventType === 'UPDATE') {
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
                const token = await requestNotificationPermission();
                if (!token) {
                    setPushEnabled(false);
                    localStorage.setItem('shiroi_push_enabled', 'false');
                }
            } else {
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
        if (notif.type === 'reply') {
            if (data.mangaId && data.chapterId) return `/read/${data.chapterId}#comments`;
            if (data.mangaId) return `/manga/${data.mangaId}#comments`;
        }
        if (notif.type === 'chapter_update') {
            if (data.chapterId) return `/read/${data.chapterId}`;
            if (data.mangaId) return `/manga/${data.mangaId}`;
        }
        if (data.missionKey || notif.title?.includes('nhiệm vụ') || notif.title?.includes('Thưởng')) {
            return `/profile?tab=achievements`;
        }
        if (notif.type === 'system' || notif.title?.includes('Báo cáo')) {
            if (data.reportId === 'new' || user?.username?.toLowerCase().includes('admin')) return '/admin/reports';
            return '/profile?tab=reports';
        }
        if (data.mangaId) return `/manga/${data.mangaId}`;
        return '#';
    };

    if (!isMounted) return <div className="w-10 h-10"></div>;

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) { requestNotificationPermission().catch(() => {}); }
                }}
                className={`p-2.5 rounded-xl transition-all duration-300 relative group ${
                    isOpen ? 'bg-[#4caf50] text-[#0a0c0a]' : 'text-gray-400 hover:text-[#4caf50] hover:bg-[#4caf50]/10'
                }`}
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-[#0a0c0a]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-[-60px] sm:right-0 mt-4 w-[calc(100vw-32px)] sm:w-[560px] md:w-[400px] bg-[#0c0f0c]/95 backdrop-blur-xl border border-[#4caf50]/30 rounded-[32px] shadow-2xl z-[200] overflow-hidden"
                    >
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-[#4caf50]/10 to-transparent">
                            <div className="flex flex-col">
                                <h3 className="text-[12px] font-black uppercase tracking-widest text-white">
                                    {isSettingsOpen ? 'Cài đặt thông báo' : 'Thông báo mới'}
                                </h3>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <div className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} />
                                    <span className="text-[8px] font-bold text-gray-500 uppercase">
                                        {connectionStatus === 'connected' ? 'Đã kết nối' : connectionStatus === 'connecting' ? 'Đang kết nối...' : 'Mất kết nối'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {!isSettingsOpen && unreadCount > 0 && (
                                    <button onClick={handleMarkAllRead} className="text-[10px] font-black text-[#4caf50] uppercase">Đọc tất cả</button>
                                )}
                                <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className={`p-2 rounded-lg transition-all ${isSettingsOpen ? 'bg-[#4caf50] text-[#0a0c0a]' : 'text-gray-400 hover:bg-[#4caf50]/10'}`}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                            {isSettingsOpen ? (
                                <div className="p-8 space-y-6">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-[11px] font-black text-white uppercase">Thông báo trình duyệt</p>
                                            <p className="text-[9px] text-gray-500">Nhận tin nhắn ngay cả khi không mở web</p>
                                        </div>
                                        <button onClick={handleTogglePush} className={`w-12 h-6 rounded-full p-1 transition-all ${pushEnabled ? 'bg-[#4caf50]' : 'bg-gray-800'}`}>
                                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${pushEnabled ? 'translate-x-6' : ''}`} />
                                        </button>
                                    </div>
                                    <p className="text-[9px] text-gray-500 italic bg-white/5 p-4 rounded-xl">Lưu ý: Bạn cần đồng ý cấp quyền thông báo cho Shiroi Arika trên trình duyệt để sử dụng tính năng này.</p>
                                </div>
                            ) : (
                                notifications.length > 0 ? (
                                    <>
                                        {notifications.map(n => (
                                            <div key={n.id} className={`p-5 border-b border-white/5 transition-all ${!n.is_read ? 'bg-[#4caf50]/5' : ''}`}>
                                                <div className="flex gap-4">
                                                    <span className="text-xl shrink-0">{getIcon(n.type, n.title)}</span>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <p className={`text-[10px] font-black uppercase ${!n.is_read ? 'text-[#4caf50]' : 'text-gray-400'}`}>{n.title}</p>
                                                            {!n.is_read && <div className="w-2 h-2 bg-[#4caf50] rounded-full shadow-[0_0_5px_#4caf50]" />}
                                                        </div>
                                                        <p className="text-[10px] text-gray-500 leading-relaxed mb-3 line-clamp-2">{n.body}</p>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[9px] text-gray-600 font-bold uppercase">{formatSafeDistance(n.created_at)}</span>
                                                            <Link href={getLink(n)} onClick={() => { handleMarkAsRead(n.id); setIsOpen(false); }} className="text-[9px] font-black text-[#4caf50] uppercase px-3 py-1 rounded-lg border border-[#4caf50]/20 hover:bg-[#4caf50]/10 transition-all">
                                                                {n.type === 'reply' ? 'Trả lời' : 'Chi tiết'}
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {hasMore && (
                                            <button onClick={handleLoadMore} className="w-full py-4 text-[9px] font-black text-gray-500 uppercase hover:text-[#4caf50] transition-all">Xem thêm thông báo cũ</button>
                                        )}
                                    </>
                                ) : (
                                    <div className="py-20 text-center opacity-30">
                                        <div className="text-4xl mb-4">📭</div>
                                        <p className="text-[10px] font-black uppercase tracking-widest">Hộp thư đang trống</p>
                                    </div>
                                )
                            )}
                        </div>
                        <div className="p-4 bg-black/40 border-t border-white/5 text-center">
                             <Link href="/profile?tab=notifications" onClick={() => setIsOpen(false)} className="text-[9px] font-black text-gray-600 hover:text-white uppercase tracking-widest transition-all">Xem toàn bộ lịch sử</Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
