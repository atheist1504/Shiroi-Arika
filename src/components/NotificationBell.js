'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getNotificationsAction, markNotificationAsReadAction, markAllNotificationsAsReadAction } from '@/lib/actions';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function NotificationBell() {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('shiroi_user');
        const user = storedUser ? JSON.parse(storedUser) : null;
        
        fetchNotifications();

        let channel;
        if (user && user.id) {
            // ⚡ KÍCH HOẠT THÔNG BÁO TỨC THỜI (REAL-TIME) 🚀
            const { supabase } = require('@/lib/supabase');
            channel = supabase
                .channel(`notif-${user.id}`)
                .on('postgres_changes', { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'shiroi_notifications',
                    filter: `user_id=eq.${user.id}`
                }, (payload) => {
                    console.log("🔔 Nhận thông báo mới:", payload.new);
                    setNotifications(prev => [payload.new, ...prev]);
                    setUnreadCount(prev => prev + 1);
                    
                    // ✨ Hiệu ứng âm thanh nhẹ (Tùy chọn)
                    try {
                        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                        audio.volume = 0.2;
                        audio.play();
                    } catch (e) {}
                })
                .subscribe();
        }

        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        
        return () => {
            if (channel) channel.unsubscribe();
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const fetchNotifications = async () => {
        const res = await getNotificationsAction();
        if (res.success) {
            setNotifications(res.notifications);
            setUnreadCount(res.notifications.filter(n => !n.is_read).length);
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

    const getIcon = (type) => {
        switch (type) {
            case 'chapter_update': return '📚';
            case 'system': return '🛡️';
            case 'reply': return '💬';
            default: return '🔔';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Icon */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2.5 rounded-xl transition-all relative ${
                    isOpen ? 'bg-[#4caf50] text-[#0a0c0a] shadow-lg' : 'text-gray-400 hover:text-[#4caf50] hover:bg-[#4caf50]/10'
                }`}
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-4 w-[340px] bg-[#0c0f0c] border border-[#4caf50]/20 rounded-[32px] shadow-[0_30px_90px_rgba(0,0,0,0.9),0_0_20px_rgba(76,175,80,0.05)] z-[200] overflow-hidden"
                    >
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-[#4caf50]/10 to-transparent">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-4 bg-[#4caf50] rounded-full"></div>
                                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Thông báo</h3>
                            </div>
                            {unreadCount > 0 && (
                                <button 
                                    onClick={handleMarkAllRead}
                                    className="text-[9px] font-bold text-[#4caf50] hover:underline uppercase tracking-wider"
                                >
                                    Đọc tất cả
                                </button>
                            )}
                        </div>

                        <div className="max-h-[380px] overflow-y-auto custom-scrollbar">
                            {notifications.length > 0 ? (
                                notifications.map((notif) => (
                                    <div 
                                        key={notif.id}
                                        className={`p-4 border-b border-[#2a332a]/50 hover:bg-white/[0.02] transition-colors relative group ${
                                            !notif.is_read ? 'bg-[#4caf50]/5' : ''
                                        }`}
                                    >
                                        <div className="flex gap-3">
                                            <div className="mt-1 text-lg shrink-0">
                                                {getIcon(notif.type)}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start mb-1">
                                                    <p className={`text-[11px] font-bold uppercase tracking-wide leading-tight ${
                                                        !notif.is_read ? 'text-[#4caf50]' : 'text-gray-300'
                                                    }`}>
                                                        {notif.title}
                                                    </p>
                                                    {!notif.is_read && <div className="w-1.5 h-1.5 bg-[#4caf50] rounded-full mt-1 shrink-0"></div>}
                                                </div>
                                                <p className="text-[10px] text-gray-500 leading-relaxed mb-2 line-clamp-2 italic">
                                                    {notif.body}
                                                </p>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[9px] text-gray-700 font-bold uppercase">
                                                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: vi })}
                                                    </span>
                                                    {notif.data?.mangaId && (
                                                        <Link 
                                                            href={`/manga/${notif.data.mangaId}`}
                                                            onClick={() => { handleMarkAsRead(notif.id); setIsOpen(false); }}
                                                            className="text-[9px] font-black text-[#4caf50] hover:scale-105 transition-transform uppercase tracking-tighter bg-[#4caf50]/10 px-2 py-0.5 rounded"
                                                        >
                                                            XEM NGAY
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-12 px-8 text-center">
                                    <div className="text-4xl mb-4 opacity-20">📭</div>
                                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Không có thông báo nào</p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 bg-black/20 text-center">
                             <Link href="/profile?tab=notifications" onClick={() => setIsOpen(false)} className="text-[9px] font-black text-gray-500 hover:text-white uppercase tracking-[0.2em] transition-colors">
                                Xem tất cả lịch sử
                             </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
