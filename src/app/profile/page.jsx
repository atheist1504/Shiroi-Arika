'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { calculateLevel, calculateProgress, calculateTitle, TITLES, XP_REWARDS, getStreakBonus, recordXpLog } from '@/lib/xp';
import { 
    getNotificationsAction, 
    markNotificationAsReadAction, 
    cleanupNotificationsAction, 
    cleanupXpLogsAction,
    updateUserProfileAction,
    getOfficialTitlesAction,
    createOfficialTitleAction,
    getTitleSuggestionsAction,
    handleTitleSuggestionAction,
    deleteOfficialTitleAction,
    getReportsAction,
    getReportMessagesAction,
    sendReportMessageAction,
    submitReportAction,
    getUserStatsAction,
    getUserXpLogsAction,
    getUserCheckInDatesAction,
    getMyFullProfileAction
} from '@/lib/actions';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

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

export default function ProfilePage() {
  return (
    <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0a0c0a]">
            <div className="text-[#4caf50] font-black animate-pulse text-[10px] uppercase tracking-widest italic">Đang tải Thánh địa Shiroi...</div>
        </div>
    }>
        <ProfileContent />
    </Suspense>
  );
}

function ProfileContent() {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [hasSynced, setHasSynced] = useState(false); // 🛡️ LOCK: Ngăn sync lặp lại gây lag 🚀
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const searchParams = useSearchParams();
  const rawTab = searchParams.get('tab') || 'profile';
  const activeTab = (rawTab === 'achievements' || rawTab === 'missions') ? 'profile' : rawTab;
  const router = useRouter();

  // 🔐 STATE CHO ĐỔI MẬT KHẨU 🛡️
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdUpdating, setPwdUpdating] = useState(false);
  const [pwdMessage, setPwdMessage] = useState('');

  // 🕵️‍♂️ STATE CHO GỢI Ý DANH HIỆU 💡
  const [showSuggestForm, setShowSuggestForm] = useState(false);
  const [suggestTitle, setSuggestTitle] = useState('');
  const [suggestReason, setSuggestReason] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [suggestMessage, setSuggestMessage] = useState('');

  // 🕵️‍♂️ STATE CHO DANH HIỆU DYNAMIC 🏆
  const [dynamicTitles, setDynamicTitles] = useState(TITLES); // Mặc định dùng TITLES từ xp.js

  // 🕵️‍♂️ STATE CHO QUẢN TRỊ DANH HIỆU 🛡️
  const [titleSuggestions, setTitleSuggestions] = useState([]);
  const [newTitleName, setNewTitleName] = useState('');
  const [newTitleLv, setNewTitleLv] = useState('');
  const [addingTitle, setAddingTitle] = useState(false);

  // 🕵️‍♂️ STATE CHO THÔNG BÁO ĐẨY 🔔
  const [fcmEnabled, setFcmEnabled] = useState(false);
  const [fcmLoading, setFcmLoading] = useState(false);
  const [showFcmGuide, setShowFcmGuide] = useState(false);

  // 🕵️‍♂️ STATE CHO QUẢN LÝ NHÂN SỰ 🛡️
  const [searchQuery, setSearchQuery] = useState('');
  const [foundUsers, setFoundUsers] = useState([]);

  const [stats, setStats] = useState({ total_mangas: 0, total_chapters: 0 });
  const [xpLogs, setXpLogs] = useState([]);
  const [xpPage, setXpPage] = useState(0);
  const [hasMoreXp, setHasMoreXp] = useState(true);
  const [loadingMoreXp, setLoadingMoreXp] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [checkInDates, setCheckInDates] = useState([]);
  const [totalCheckIns, setTotalCheckIns] = useState(0);
  const [userReports, setUserReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportMessages, setReportMessages] = useState([]);
  const [newReportMessage, setNewReportMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  const [isCreatingReport, setIsCreatingReport] = useState(false);
  const [newReportType, setNewReportType] = useState('platform_bug');
  const [newReportDescription, setNewReportDescription] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const getTypeLabel = (type) => {
    switch (type) {
      case 'image_broken': return 'ẢNH HỎNG';
      case 'wrong_translation': return 'DỊCH SAI';
      case 'wrong_order': return 'NHẦM THỨ TỰ';
      case 'platform_bug': return 'LỖI HỆ THỐNG';
      case 'account_issue': return 'LỖI TÀI KHOẢN';
      case 'feature_suggestion': return 'GÓP Ý';
      case 'other': return 'LỖI KHÁC';
      default: return type?.toUpperCase() || 'BÁO CÁO';
    }
  };

  useEffect(() => {
    if (selectedReport) {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [reportMessages, selectedReport]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);



  useEffect(() => {
    const checkSession = async () => {
      try {
        const { getInitialProfileDataAction } = await import('@/lib/actions');
        const res = await getInitialProfileDataAction();

        if (res.success) {
          const d = res.data;
          const data = d.user;
          
          setUser(data);
          setDisplayName(data.display_name || '');
          setBio(data.bio || '');
          setAvatarUrl(data.avatar_url || '');
          localStorage.setItem('shiroi_user', JSON.stringify(data));
          
          // 🚀 KHÔI PHỤC: Lấy stats độc lập để đảm bảo ổn định 100% như trước khi gộp 💮
          const { getPublicUserStatsAction } = await import('@/lib/actions');
          getPublicUserStatsAction(data.id || data.username).then(sRes => {
              if (sRes.success) setStats({ total_mangas: sRes.total_mangas, total_chapters: sRes.total_chapters });
          });

          setXpLogs(d.xpLogs || []);
          setHasMoreXp(d.hasMoreXp);
          setCheckInDates(d.checkInDates || []);
          setTotalCheckIns(d.totalCheckIns || 0);
          setNotifications(d.notifications || []);
          setDynamicTitles(d.dynamicTitles || TITLES);
          setMissionProgress(d.missionProgress || []);
          setTitleSuggestions(d.titleSuggestions || []);
          setPersonnel(d.personnel || []);

          cleanupXpLogsAction();

           // 🔄 ĐỒNG BỘ LỊCH SỬ TỪ LOCAL LÊN DATABASE (CHỈ CHẠY 1 LẦN KHI MOUNT) 🍀
           const runSync = async () => {
              if (hasSynced) return;
              
              const localHistory = JSON.parse(localStorage.getItem('shiroi_history') || '{}');
              const localRead = JSON.parse(localStorage.getItem('shiroi_read_chapters') || '[]');
              
              if (Object.keys(localHistory).length > 0 || localRead.length > 0) {
                  setHasSynced(true); // Khóa ngay lập tức
                  const { syncBulkReadHistoryAction } = await import('@/lib/actions');
                  const syncRes = await syncBulkReadHistoryAction(localHistory, localRead);
                  if (syncRes.success && (syncRes.syncedCount > 0 || syncRes.xpGranted > 0)) {
                      console.log(`🚀 [Sync] Đã đồng bộ ${syncRes.syncedCount} chương và bù ${syncRes.xpGranted} XP!`);
                      // 🧹 DỌN DẸP LOCALSTORAGE SAU KHI ĐỒNG BỘ THÀNH CÔNG 🍀
                      localStorage.removeItem('shiroi_history');
                      localStorage.removeItem('shiroi_read_chapters');
                      
                      // Tải lại dữ liệu sau khi đồng bộ để cập nhật Stats mới nhất ⚡
                      const refreshRes = await getInitialProfileDataAction();
                      if (refreshRes.success) {
                          const rd = refreshRes.data;
                          const { getPublicUserStatsAction } = await import('@/lib/actions');
                          getPublicUserStatsAction(rd.user.id || rd.user.username).then(sRes => {
                              if (sRes.success) setStats({ total_mangas: sRes.total_mangas, total_chapters: sRes.total_chapters });
                          });
                          setXpLogs(rd.xpLogs);
                      }
                  }
              }
           };
           runSync();
          
          cleanupNotificationsAction();

          // 🔔 Kiểm tra trạng thái thông báo đẩy (Push) 🍀
          if (typeof window !== 'undefined' && 'Notification' in window) {
            const isPushActive = localStorage.getItem('shiroi_push_enabled') === 'true';
            setFcmEnabled(Notification.permission === 'granted' && (isPushActive || !!data.fcm_token));
          }
        } else {
            const storedUser = localStorage.getItem('shiroi_user');
            if (storedUser) {
                const data = JSON.parse(storedUser);
                setUser(data);
                setDisplayName(data.display_name || '');
                setBio(data.bio || '');
                setAvatarUrl(data.avatar_url || '');
                
                // Cố gắng tải lại data ngầm nếu có session
                getInitialProfileDataAction().then(res => {
                   if (res.success) {
                       const d = res.data;
                       setXpLogs(d.xpLogs || []);
                       setCheckInDates(d.checkInDates || []);
                       setDynamicTitles(d.dynamicTitles || TITLES);
                       
                       // Lấy stats riêng lẻ
                       getPublicUserStatsAction(data.id || data.username).then(sRes => {
                           if (sRes.success) setStats({ total_mangas: sRes.total_mangas, total_chapters: sRes.total_chapters });
                       });
                   }
                });
                cleanupNotificationsAction();
                cleanupXpLogsAction();
            } else {
                router.push('/login');
            }
        }
      } catch (err) {
        console.error("❌ Lỗi đồng bộ hồ sơ:", err.message);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [router]);

  const refreshData = async () => {
    try {
      const { getInitialProfileDataAction } = await import('@/lib/actions');
      const res = await getInitialProfileDataAction();
      if (res.success) {
        const d = res.data;
        if (d.user) {
            setUser(d.user);
            getPublicUserStatsAction(d.user.id || d.user.username).then(sRes => {
                if (sRes.success) setStats({ total_mangas: sRes.total_mangas, total_chapters: sRes.total_chapters });
            });
        }
        setXpLogs(d.xpLogs || []);
        setHasMoreXp(d.hasMoreXp);
        setCheckInDates(d.checkInDates);
        setTotalCheckIns(d.totalCheckIns);
        setNotifications(d.notifications);
        setDynamicTitles(d.dynamicTitles || TITLES);
        setMissionProgress(d.missionProgress || []);
        setTitleSuggestions(d.titleSuggestions || []);
        setPersonnel(d.personnel || []);
        if (d.user) setUser(d.user);
      }
    } catch (err) {
      console.error("❌ Lỗi refreshData:", err);
    }
  };

  const handleLoadMoreXp = async () => {
    if (loadingMoreXp || !hasMoreXp || !user) return;
    setLoadingMoreXp(true);
    const nextPage = xpPage + 1;
    const { getUserXpLogsAction } = await import('@/lib/actions');
    const res = await getUserXpLogsAction(20, nextPage);
    if (res.success && res.logs) {
        setXpLogs(prev => [...prev, ...res.logs]);
        setHasMoreXp(res.logs.length === 20);
    }
    setXpPage(nextPage);
    setLoadingMoreXp(false);
  };

  const fetchNotifications = async () => {
    console.log("📡 [Profile] Đang triệu hồi thông báo từ Thánh địa...");
    const res = await getNotificationsAction(20, 0);
    if (res.success) {
        console.log(`✅ [Profile] Đã nhận ${res.notifications?.length} thông báo.`);
        setNotifications(res.notifications);
    } else {
        console.error("❌ [Profile] Lỗi fetch thông báo:", res.error);
    }
  };

  // 🔥 ĐỒNG BỘ KHI CHUYỂN TAB 🔄
  useEffect(() => {
    if (activeTab === 'notifications' && user) {
        fetchNotifications();
    }
    if (activeTab === 'reports' && user && userReports.length === 0) {
        fetchUserReports();
    }
  }, [activeTab, user]);

  const fetchUserReports = async () => {
      setIsLoadingReports(true);
      const res = await getReportsAction();
      if (res.success) setUserReports(res.reports);
      setIsLoadingReports(false);
  };

  const fetchReportMessages = async (reportId) => {
      setIsLoadingMessages(true);
      const res = await getReportMessagesAction(reportId);
      if (res.success) setReportMessages(res.messages);
      setIsLoadingMessages(false);
  };

  const handleSendMessage = async (e) => {
      e.preventDefault();
      if (!newReportMessage.trim() || !selectedReport) return;
      setIsSendingMessage(true);
      const res = await sendReportMessageAction(selectedReport.id, newReportMessage);
      if (res.success) {
          setNewReportMessage('');
          fetchReportMessages(selectedReport.id);
      }
      setIsSendingMessage(false);
  };

  const handleCreateReport = async (e) => {
      e.preventDefault();
      if (!newReportDescription.trim()) return;
      setIsSubmittingReport(true);
      const res = await submitReportAction({
          type: newReportType,
          description: newReportDescription,
          manga_id: null,
          chapter_id: null,
          mangaTitle: 'Hệ thống'
      });
      if (res.success) {
          setNewReportDescription('');
          setIsCreatingReport(false);
          fetchUserReports();
          alert('Báo cáo đã được gửi thành công! 🍀');
      } else {
          alert(`Lỗi: ${res.error}`);
      }
      setIsSubmittingReport(false);
  };

  // 🛰️ REAL-TIME SYNC & CLEANUP: Thông báo Thánh địa 🔔
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`profile-notif-${user.id}`)
      .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'shiroi_notifications',
          filter: `user_id=eq.${user.id}`
      }, (payload) => {
          console.log("🔔 [Profile] Có biến động thông báo, đang đồng bộ...");
          fetchNotifications();
      })
      .subscribe();

    return () => {
        console.log("🔌 [Profile] Ngắt kết nối Realtime...");
        supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleMarkAsRead = async (id) => {
    const res = await markNotificationAsReadAction(id);
    if (res.success) setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleCheckIn = async () => {
    setCheckInLoading(true);
    const { performCheckInAction } = await import('@/lib/actions');
    const res = await performCheckInAction();
    if (res.success) {
      setUser(res.user);
      localStorage.setItem('shiroi_user', JSON.stringify(res.user));
      setMessage('Điểm danh thành công! ✨');
      fetchXpLogs(res.user.id);
    }
    setCheckInLoading(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    setAvatarLoading(true);
    const fileName = `${user.id}-${Date.now()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('avatars').upload(fileName, file);
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const res = await updateUserProfileAction({ 
          display_name: displayName, 
          bio: bio, 
          avatar_url: publicUrl,
          selected_badge: user.selected_badge 
      });
      if (res.success) {
        setAvatarUrl(publicUrl);
        setUser(res.user);
        localStorage.setItem('shiroi_user', JSON.stringify(res.user));
      }
    }
    setAvatarLoading(false);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setMessage('');
    const res = await updateUserProfileAction({ 
        display_name: displayName, 
        bio: bio, 
        avatar_url: avatarUrl,
        selected_badge: user.selected_badge 
    });
    if (res.success) {
        setUser(res.user);
        localStorage.setItem('shiroi_user', JSON.stringify(res.user));
        setMessage('Cập nhật thành công! 🍀');
    } else {
        setMessage(`Lỗi: ${res.error}`);
    }
    setUpdating(false);
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setPwdMessage('Mật khẩu không khớp!'); return; }
    setPwdUpdating(true);
    const { changePasswordAction } = await import('@/lib/actions');
    const res = await changePasswordAction(oldPassword, newPassword);
    setPwdMessage(res.success ? 'Đã đổi mật mã! 🔐' : `Lỗi: ${res.error}`);
    setPwdUpdating(false);
  };

  const handleSuggestTitle = async (e) => {
    e.preventDefault();
    if (!suggestTitle.trim()) return;
    setSuggesting(true);
    setSuggestMessage('');
    const { suggestTitleAction } = await import('@/lib/actions');
    const res = await suggestTitleAction(suggestTitle, suggestReason);
    if (res.success) {
        setSuggestMessage('Cảm ơn đóng góp của bạn! Gợi ý đã được gửi tới Admin. ✨');
        setSuggestTitle('');
        setSuggestReason('');
        setTimeout(() => setShowSuggestForm(false), 3000);
    } else {
        setSuggestMessage(`Lỗi: ${res.error}`);
    }
    setSuggesting(false);
  };

  const handleDeleteOfficialTitle = async (id) => {
    if (!confirm("Bạn có chắc chắn muốn xóa danh hiệu này không? 🗑️")) return;
    const res = await deleteOfficialTitleAction(id);
    if (res.success) refreshData();
  };

  const handleCreateOfficialTitle = async (e) => {
    e.preventDefault();
    if (!newTitleName || !newTitleLv) return;
    setAddingTitle(true);
    const res = await createOfficialTitleAction(newTitleName, parseInt(newTitleLv));
    if (res.success) {
        setNewTitleName('');
        setNewTitleLv('');
        refreshData();
    } else {
        alert(`Lỗi: ${res.error}`);
    }
    setAddingTitle(false);
  };

  const handleProcessSuggestion = async (id, status) => {
    const res = await handleTitleSuggestionAction(id, status);
    if (res.success) refreshData();
  };

  const handleEnableNotifications = async () => {
    setFcmLoading(true);
    const { requestNotificationPermission } = await import('@/lib/fcmClient');
    try {
        const token = await requestNotificationPermission();
        if (token) {
            setFcmEnabled(true);
            localStorage.setItem('shiroi_push_enabled', 'true');
            // Cập nhật token vào state user để đồng bộ local
            setUser(prev => ({ ...prev, fcm_token: token }));
            alert("✅ Đã kích hoạt thông báo đẩy thành công! Bạn sẽ nhận được tin nhắn khi có truyện mới hoặc thông báo hệ thống. 🍀");
        } else {
            // Hiển thị thông báo chi tiết hơn để debug 🕵️‍♂️
            alert("❌ Kích hoạt thất bại. Hãy kiểm tra:\n1. Bạn đã 'Cho phép' (Allow) thông báo trên trình duyệt chưa?\n2. Trình duyệt có đang ở chế độ Ẩn danh (Incognito) không? (FCM không chạy ở ẩn danh)\n3. Kết nối mạng có ổn định không?");
        }
    } catch (err) {
        console.error("❌ Lỗi kích hoạt FCM:", err);
        alert("❌ Có lỗi xảy ra trong quá trình kích hoạt: " + err.message);
    }
    setFcmLoading(false);
  };

  const handleDisableNotifications = async () => {
    if (!confirm("Bạn có chắc chắn muốn hủy nhận thông báo đẩy không? 🕵️‍♂️")) return;
    setFcmLoading(true);
    try {
        // 1. Hủy đăng ký Topic trên Server trước (Nếu có token) 🌩️
        if (user?.fcm_token) {
            const { unsubscribeFromTopicAction } = await import('@/lib/actions');
            await unsubscribeFromTopicAction(user.fcm_token);
        }

        // 2. Xóa Token trong DB 🗑️
        const { disableNotifications } = await import('@/lib/fcmClient');
        const res = await disableNotifications();

        if (res.success) {
            setFcmEnabled(false);
            localStorage.setItem('shiroi_push_enabled', 'false');
            // Cập nhật state user
            setUser(prev => ({ ...prev, fcm_token: null }));
            alert("❌ Đã hủy kích hoạt thông báo đẩy. Bạn sẽ không nhận được thông báo khi có truyện mới nữa.");
        } else {
            alert(`Lỗi: ${res.error}`);
        }
    } catch (err) {
        console.error("❌ Lỗi hủy kích hoạt FCM:", err);
        alert("❌ Có lỗi xảy ra trong quá trình hủy kích hoạt.");
    }
    setFcmLoading(false);
  };

  const handleSearchUsers = async (e) => {
    e.preventDefault();
    const { searchUsersAction } = await import('@/lib/actions');
    const res = await searchUsersAction(searchQuery);
    if (res.success) setFoundUsers(res.users);
  };

  const handleUpdateRole = async (targetUserId, newRole) => {
    if (!confirm('Xác nhận đổi chức vụ?')) return;
    const { updateUserRoleAction } = await import('@/lib/actions');
    const res = await updateUserRoleAction(targetUserId, newRole);
    if (res.success) refreshData();
  };

  const handleGiveXp = async (targetUserId) => {
    const amountStr = prompt("Nhập số lượng XP muốn tặng (hoặc trừ dùng dấu -):");
    if (!amountStr) return;
    const amount = parseInt(amountStr);
    if (isNaN(amount)) return alert("Số lượng không hợp lệ!");
    
    const reason = prompt("Lý do tặng XP:", "Admin thưởng 🎁");
    if (!reason) return;

    const { recordXpLogAction } = await import('@/lib/actions');
    const res = await recordXpLogAction(amount, 'mission', reason, targetUserId);
    
    if (res.success) {
        alert(`Đã tặng ${amount} XP cho người dùng thành công! ✨`);
        refreshData(); // Để cập nhật LV nếu có hiện
    } else {
        alert(`Lỗi: ${res.error}`);
    }
  };

  const currentDynamicTitle = user ? (() => {
    const isAdmin = user?.role === 'admin' || user?.username?.toLowerCase() === 'atheist1504';
    const lvl = calculateLevel(user.xp);
    
    // 🛡️ LOGIC MỚI: Nếu đã chọn Badge -> Ưu tiên hiển thị nó trước (Bypass Level check nếu đã sở hữu) 🍀
    if (user.selected_badge) {
        const selected = dynamicTitles.find(t => t.name.toUpperCase() === user.selected_badge.toUpperCase());
        if (selected) return selected;
    }

    // Nếu không chọn hoặc badge không tồn tại -> Lấy theo Level đã mở khóa
    // Lọc lấy danh hiệu có LV <= hiện tại, sau đó sắp xếp LV giảm dần để lấy cái cao nhất
    const unlocked = dynamicTitles
        .filter(t => lvl >= t.lv)
        .sort((a, b) => b.lv - a.lv);
        
    return unlocked[0] || dynamicTitles[dynamicTitles.length - 1];
  })() : null;

  if (!isMounted || loading) return <div className="min-h-screen bg-[#0a0c0a] flex items-center justify-center text-[#4caf50]">Đang tải...</div>;

  return (
    <div className="min-h-screen bg-[#0a0c0a] text-white p-4 sm:p-8 pt-24 relative overflow-x-hidden">
      {/* 🌌 HIỆU ỨNG NỀN THÁNH ĐỊA (PREMIUM BACKDROP) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#4caf50]/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-[#2e7d32]/10 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-5xl mx-auto z-10 relative">
        <div className="flex flex-col gap-12 items-center">
          
          {/* 📝 CỘT CHÍNH: NỘI DUNG CHI TIẾT */}
          <main className="w-full max-w-[900px] space-y-8 min-h-[600px] relative z-10">
            {/* TABS MENU PREMIUM */}
            <nav className="glass-card p-2 rounded-[28px] border-white/5 flex gap-1 sticky top-6 z-[100] mb-6">
              {[
                { id: 'profile', icon: '💎', label: 'Hồ sơ' },
                { id: 'settings', icon: '⚙️', label: 'Cài đặt' },
                { id: 'notifications', icon: '🔔', label: 'Hộp thư' },
                ...(!(user?.role === 'admin' || user?.username?.toLowerCase() === 'atheist1504') ? [{ id: 'reports', icon: '🚩', label: 'Báo cáo' }] : []),
                ...(user?.role === 'admin' ? [{ id: 'admin', icon: '🛡️', label: 'Quản trị' }] : [])
              ].map(t => (
                <Link 
                    key={t.id} 
                    href={`/profile?tab=${t.id}`} 
                    className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[20px] transition-all duration-300 ${
                        activeTab === t.id 
                        ? 'bg-[#4caf50] text-[#0a0c0a] font-black shadow-[0_10px_25px_rgba(76,175,80,0.3)]' 
                        : 'text-gray-500 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <span className="text-base">{t.icon}</span>
                  <span className="text-[10px] uppercase font-black tracking-widest hidden md:block">{t.label}</span>
                </Link>
              ))}
            </nav>
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                
                {/* 👤 THẺ DANH TÍNH (Avatar, Cấp độ, XP) - PREMIUM INTEGRATION 💎 */}
                <div className="glass-card p-10 rounded-[48px] border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#4caf50]/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-[#4caf50]/10 transition-colors duration-700" />
                    
                    <div className="flex flex-col md:flex-row gap-10 items-center relative z-10">
                        {/* Avatar Section */}
                        <div className="relative group/avatar">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#4caf50] to-[#2e7d32] rounded-[40px] blur-2xl opacity-20 group-hover/avatar:opacity-40 transition-opacity" />
                            <div className="relative w-40 h-40 rounded-[36px] overflow-hidden border-2 border-white/10 shadow-2xl">
                                {avatarLoading ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-md z-20">
                                        <div className="w-8 h-8 border-2 border-[#4caf50] border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : null}
                                <img 
                                    src={avatarUrl || user?.avatar_url || 'https://psgivxgycjireinwnelc.supabase.co/storage/v1/object/public/avatars/default-avatar.png'} 
                                    className="w-full h-full object-cover group-hover/avatar:scale-110 transition-transform duration-700" 
                                    alt="Avatar" 
                                    onError={(e) => {
                                        e.target.src = 'https://psgivxgycjireinwnelc.supabase.co/storage/v1/object/public/avatars/default-avatar.png';
                                        console.warn("⚠️ [Profile] Không thể tải ảnh đại diện, đang dùng ảnh mặc định.");
                                    }}
                                />
                                <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-all cursor-pointer backdrop-blur-sm z-10">
                                    <span className="text-2xl mb-1">📸</span>
                                    <span className="text-[8px] font-black uppercase tracking-widest text-white">Đổi ảnh</span>
                                    <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
                                </label>
                            </div>
                        </div>

                        {/* Info Section */}
                        <div className="flex-1 space-y-6 text-center md:text-left w-full">
                            <div className="space-y-1">
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                                    <h2 className="text-3xl font-black italic tracking-tighter text-white">{user?.display_name || user?.username}</h2>
                                    {currentDynamicTitle && (
                                        <motion.span 
                                            key={currentDynamicTitle.name}
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="px-4 py-1.5 bg-[#4caf50]/10 border border-[#4caf50]/20 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-[#4caf50] shadow-[0_0_15px_rgba(76,175,80,0.1)]"
                                        >
                                            {currentDynamicTitle.name}
                                        </motion.span>
                                    )}
                                </div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.4em]">{user?.username}</p>
                            </div>

                            {user?.bio && (
                                <p className="text-xs text-gray-400 italic max-w-xl leading-relaxed mx-auto md:mx-0">"{user.bio}"</p>
                            )}

                            {/* Level & XP Progress */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-end">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Cấp độ</span>
                                        <span className="text-2xl font-black italic text-[#4caf50]">{calculateLevel(user?.xp)}</span>
                                    </div>
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                        {user?.xp || 0} / {calculateProgress(user?.xp).nextXp} XP
                                    </span>
                                </div>
                                <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${calculateProgress(user?.xp).percent}%` }}
                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#4caf50] to-[#81c784] shadow-[0_0_20px_rgba(76,175,80,0.4)]"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* 📊 THỐNG KÊ NHANH (Compact) */}
                <div className="grid grid-cols-2 gap-6">
                    <div className="glass-card p-8 rounded-[40px] border-white/5 flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#4caf50]/5 blur-2xl rounded-full" />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 relative z-10">Manga đã xem</span>
                        <span className="text-4xl font-black italic text-white relative z-10">{stats.total_mangas}</span>
                    </div>
                    <div className="glass-card p-8 rounded-[40px] border-white/5 flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#4caf50]/5 blur-2xl rounded-full" />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 relative z-10">Số chương đã đọc</span>
                        <span className="text-4xl font-black italic text-white relative z-10">{stats.total_chapters}</span>
                    </div>
                </div>
                
                {/* 🧧 TRẠNG THÁI TU LUYỆN HÀNG NGÀY */}
                <div className="glass-card p-8 rounded-[48px] border-white/5 grid grid-cols-1 md:grid-cols-5 gap-8 items-center">
                    <div className="md:col-span-2 flex flex-col items-center gap-4 border-white/5 md:border-r pr-0 md:pr-8">
                        <span className="text-[10px] font-black text-[#4caf50] uppercase tracking-[0.3em]">Duyên phận hôm nay</span>
                        <div className="relative">
                            <div className="absolute inset-0 bg-orange-500/20 blur-3xl animate-pulse" />
                            <span className="text-7xl relative z-10">🔥 {user?.check_in_streak || 0}</span>
                        </div>
                        <button 
                            onClick={handleCheckIn} 
                            disabled={checkInLoading || (user?.last_check_in && new Date(user.last_check_in).toDateString() === new Date().toDateString())} 
                            className="w-full py-5 bg-[#4caf50] text-[#0a0c0a] font-black rounded-2xl text-[11px] uppercase tracking-[0.2em] shadow-[0_8px_0_#2e7d32] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-30 disabled:grayscale"
                        >
                          {checkInLoading ? '...' : (user?.last_check_in && new Date(user.last_check_in).toDateString() === new Date().toDateString()) ? 'ĐÃ ĐIỂM DANH' : 'ĐIỂM DANH NGAY ✨'}
                        </button>
                    </div>
                    
                    <div className="md:col-span-3 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Lịch tháng {new Date().getMonth() + 1}</span>
                            <span className="text-[10px] font-black text-[#4caf50]">{checkInDates.length} ngày tích tụ</span>
                        </div>
                        <div className="grid grid-cols-7 gap-1.5">
                            {(() => {
                                const now = new Date();
                                const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
                                const calendar = [];
                                const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
                                for (let i = 0; i < firstDay; i++) calendar.push(<div key={`e-${i}`} className="aspect-square"></div>);
                                for (let d = 1; d <= daysInMonth; d++) {
                                    const dStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                    const isChecked = checkInDates.includes(dStr);
                                    calendar.push(
                                        <div 
                                            key={`d-${d}`} 
                                            className={`aspect-square rounded-lg flex items-center justify-center text-[9px] font-black transition-all ${
                                                isChecked 
                                                ? 'bg-gradient-to-br from-[#4caf50] to-[#2e7d32] text-[#0a0c0a] shadow-[0_0_15px_rgba(76,175,80,0.3)]' 
                                                : (dStr === todayStr ? 'border-2 border-[#4caf50] text-[#4caf50] animate-pulse' : 'bg-white/5 text-gray-700')
                                            }`}
                                        >
                                            {d}
                                        </div>
                                    );
                                }
                                return calendar;
                            })()}
                        </div>
                    </div>
                </div>

                {/* 🏆 DANH PHẨM ĐÃ MỞ (Tủ trưng bày) */}
                <div className="glass-card p-10 rounded-[48px] border-white/5 space-y-8">
                    <div className="flex items-baseline gap-3">
                        <h3 className="text-lg font-black uppercase tracking-tighter text-white italic">Danh hiệu giang hồ</h3>
                        <div className="h-[2px] flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                        {[...dynamicTitles].reverse().map((title, tIdx) => {
                            const isAdmin = user?.role === 'admin' || user?.username?.toLowerCase() === 'atheist1504';
                            
                            // 🛡️ LOGIC MỚI: 
                            // 1. Nếu là danh hiệu thường (Lv < 900): Admin thấy hết, User thấy theo Level.
                            // 2. Nếu là danh hiệu đặc biệt (Lv >= 900): Chỉ hiện nếu User/Admin ĐANG SỞ HỮU nó.
                            const isLegendary = title.lv >= 900;
                            const isCurrentlyHeld = user?.selected_badge === title.name;
                            const isPermanentlyUnlocked = user?.unlocked_badges?.includes(title.name);
                            
                            const isUnlocked = isLegendary 
                                ? (isCurrentlyHeld || isPermanentlyUnlocked || isAdmin)
                                : (isAdmin || (calculateLevel(user?.xp) >= title.lv));
                            
                            // Nếu là danh hiệu huyền thoại mà không sở hữu (và không phải admin đang xem) thì ẩn 🕵️‍♂️
                            if (isLegendary && !isCurrentlyHeld && !isPermanentlyUnlocked && !isAdmin) return null;

                            const isSelected = user?.selected_badge === title.name || (currentDynamicTitle?.name === title.name && !user?.selected_badge);
                            
                            return (
                                <motion.button
                                    key={title.name}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: (tIdx % 10) * 0.05 }}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="button"
                                    disabled={!isUnlocked || updating}
                                    onClick={async () => {
                                        if (isSelected) return;
                                        setUpdating(true);
                                        const res = await updateUserProfileAction({ selected_badge: title.name });
                                        if (res.success) {
                                            setUser(res.user);
                                            localStorage.setItem('shiroi_user', JSON.stringify(res.user));
                                        }
                                        setUpdating(false);
                                    }}
                                    className={`p-5 rounded-3xl border text-left relative overflow-hidden transition-all duration-500 flex flex-col gap-1.5 ${
                                        isSelected 
                                        ? 'bg-gradient-to-br from-[#4caf50] to-[#2e7d32] border-[#4caf50] text-[#0a0c0a] shadow-[0_15px_30px_rgba(76,175,80,0.2)]' 
                                        : isUnlocked 
                                            ? 'bg-white/5 border-white/10 text-white hover:border-[#4caf50]/50'
                                            : 'bg-black/20 border-white/5 text-gray-700 opacity-40'
                                    }`}
                                >
                                    {isSelected && <div className="absolute top-0 right-0 w-12 h-12 bg-white/20 blur-2xl rounded-full" />}
                                    <div className="flex justify-between items-center relative z-10">
                                        <span className="text-xs font-black uppercase tracking-wide">{title.name}</span>
                                        {isSelected && <span className="text-xs">⚔️</span>}
                                        {!isUnlocked && <span className="text-[10px]">🔒</span>}
                                    </div>
                                    <span className={`text-[8px] font-bold uppercase tracking-widest relative z-10 ${isSelected ? 'text-[#0a0c0a]/60' : 'text-gray-500'}`}>
                                        YÊU CẦU CẤP ĐỘ {title.lv}
                                    </span>
                                </motion.button>
                            );
                        })}
                    </div>
                </div>

                {/* 💡 GỢI Ý DANH PHẨM (MỚI) */}
                <div className="glass-card p-10 rounded-[48px] border-white/5 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-4 bg-[#4caf50] rounded-full"></div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-white">Gợi ý danh hiệu mới</h3>
                    </div>
                    
                    {!showSuggestForm ? (
                        <button 
                            onClick={() => setShowSuggestForm(true)}
                            className="w-full py-6 border border-dashed border-[#4caf50]/30 rounded-[32px] text-[#4caf50] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-[#4caf50]/5 transition-all flex items-center justify-center gap-3"
                        >
                            <span className="text-xl">💡</span> Hiến kế danh xưng cho Thánh địa
                        </button>
                    ) : (
                        <motion.form 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onSubmit={handleSuggestTitle}
                            className="space-y-4 bg-white/5 p-8 rounded-[40px] border border-[#4caf50]/20"
                        >
                            <input 
                                type="text" 
                                value={suggestTitle}
                                onChange={e => setSuggestTitle(e.target.value)}
                                placeholder="Tên danh hiệu (VD: Độc Bộ Thiên Hạ...)"
                                className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-sm outline-none focus:border-[#4caf50]"
                                required
                            />
                            <textarea 
                                value={suggestReason}
                                onChange={e => setSuggestReason(e.target.value)}
                                placeholder="Ý nghĩa hoặc lý do đề xuất..."
                                className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-[11px] outline-none focus:border-[#4caf50] resize-none"
                                rows="2"
                            />
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setShowSuggestForm(false)} className="px-6 py-4 bg-white/5 text-gray-500 rounded-2xl font-black text-[10px] uppercase">Hủy</button>
                                <button 
                                    type="submit" 
                                    disabled={suggesting}
                                    className="flex-1 py-4 bg-[#4caf50] text-[#0a0c0a] rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-[#4caf50]/20"
                                >
                                    {suggesting ? 'ĐANG GỬI...' : 'GỬI ĐỀ XUẤT ✨'}
                                </button>
                            </div>
                            {suggestMessage && <p className="text-center text-[10px] font-black text-[#4caf50] animate-pulse">{suggestMessage}</p>}
                        </motion.form>
                    )}
                </div>

                {/* 🕰️ NHẬT KÝ TU LUYỆN (TIMELINE STYLE) */}
                <div className="glass-card p-10 rounded-[48px] border-white/5 space-y-8">
                   <div className="flex items-baseline gap-3">
                        <h3 className="text-lg font-black uppercase tracking-tighter text-white italic">Nhật ký tu hành</h3>
                        <div className="h-[2px] flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                    </div>

                    <div className="relative space-y-4 pl-4 border-l-2 border-white/5 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                     {xpLogs.map((l, lIdx) => {
                       const typeMap = {
                         'read': { label: 'Đọc truyện', icon: '📖', color: '#4caf50' },
                         'check_in': { label: 'Điểm danh', icon: '🔥', color: '#ff9800' },
                         'comment': { label: 'Bình luận', icon: '💬', color: '#2196f3' },
                         'first_comment': { label: 'Khai bút', icon: '✍️', color: '#9c27b0' },
                         'lucky_draw': { label: 'Vận khí', icon: '🎁', color: '#4caf50' },
                         'mission': { label: 'Nhiệm vụ', icon: '🎯', color: '#00bcd4' }
                       };
                       const info = typeMap[l.type] || { label: 'Khác', icon: '✨', color: '#999' };
                       
                       return (
                         <motion.div 
                             key={`${l.id}-${lIdx}`} 
                             initial={{ opacity: 0, x: -10 }}
                             animate={{ opacity: 1, x: 0 }}
                             transition={{ delay: (lIdx % 20) * 0.05 }}
                             className="relative"
                         >
                           <div className={`absolute -left-[23px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-[#0a0c0a]`} style={{ backgroundColor: info.color }} />
                           <div className="flex justify-between items-center p-4 bg-white/5 rounded-[24px] border border-white/5 hover:border-white/10 transition-all group overflow-hidden relative">
                             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                             <div className="flex items-center gap-3 relative z-10">
                                 <span className="text-xl opacity-80 group-hover:scale-125 transition-transform duration-500">{info.icon}</span>
                                 <div>
                                     <div className="text-[10px] font-black uppercase tracking-widest text-white/90">{info.label}</div>
                                     <div className="text-[8px] text-gray-500 mt-1 font-bold">{new Date(l.created_at).toLocaleString('vi-VN')}</div>
                                 </div>
                             </div>
                             <div className="text-base font-black text-[#4caf50] italic drop-shadow-glow relative z-10">+{l.amount} <span className="text-[9px] not-italic text-gray-500 uppercase">XP</span></div>
                           </div>
                         </motion.div>
                       );
                     })}

                     {hasMoreXp && (
                        <button 
                            onClick={handleLoadMoreXp}
                            disabled={loadingMoreXp}
                            className="w-full py-6 mt-4 border border-dashed border-white/10 rounded-[24px] text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 hover:text-[#4caf50] hover:border-[#4caf50]/30 transition-all bg-white/2"
                        >
                            {loadingMoreXp ? 'Đang triệu hồi...' : 'Xem thêm nhật ký tu hành 📜'}
                        </button>
                     )}

                     {xpLogs.length === 0 && <p className="text-center text-gray-700 py-20 italic">Bản đồ ký ức còn trống... ✨</p>}
                    </div>
                </div>

                {/* 📜 BÍ KÍP THĂNG CẤP (XP GUIDE) */}
                <div className="glass-card p-10 rounded-[48px] border-white/5 space-y-8 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-[#4caf50]/5 blur-3xl rounded-full" />
                    
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-4 bg-[#4caf50] rounded-full"></div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-white">Bí kíp thăng cấp (Cách nhận XP)</h3>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                            { label: 'Điểm danh', xp: '+100', icon: '🔥', detail: 'Reset 0h sáng' },
                            { label: 'Đọc chương', xp: '+20', icon: '📖', detail: 'Mỗi chương truyện' },
                            { label: 'Bình luận', xp: '+5~10', icon: '💬', detail: 'Tăng tương tác' },
                            { label: 'Nhiệm vụ', xp: 'Vô vàn', icon: '🎯', detail: 'Kho thành tích' },
                            { label: 'Gợi ý danh phẩm', xp: '+200', icon: '💡', detail: 'Khi Admin duyệt' },
                            { label: 'Báo cáo lỗi', xp: '+100', icon: '🛡️', detail: 'Khi được xác nhận' },
                            { label: 'Bốc quà', xp: 'May rủi', icon: '🎁', detail: 'Vận khí mỗi ngày' }
                        ].map((item, idx) => (
                            <div key={idx} className="p-6 bg-black/20 border border-white/5 rounded-[32px] flex flex-col items-center text-center gap-1 group hover:border-[#4caf50]/30 transition-all">
                                <span className="text-2xl mb-1 group-hover:scale-125 transition-transform duration-500">{item.icon}</span>
                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-tighter">{item.label}</span>
                                <span className="text-sm font-black text-[#4caf50] italic">{item.xp} XP</span>
                                <span className="text-[7px] text-gray-700 font-bold uppercase tracking-tight">{item.detail}</span>
                            </div>
                        ))}
                    </div>

                    <div className="p-8 bg-white/5 rounded-[40px] border border-white/5 space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-orange-500 text-xs">⚡</span>
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Phần thưởng chuỗi ngày (Streak)</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                            {[
                                { day: '3 ngày', bonus: '+200' },
                                { day: '7 ngày', bonus: '+300' },
                                { day: '14 ngày', bonus: '+500' },
                                { day: '21 ngày', bonus: '+500' },
                                { day: '30 ngày', bonus: '+1000' }
                            ].map((s, i) => (
                                <div key={i} className="px-4 py-3 bg-black/30 rounded-2xl border border-white/5 text-center">
                                    <div className="text-[8px] font-bold text-gray-500 uppercase">{s.day}</div>
                                    <div className="text-[11px] font-black text-[#4caf50]">{s.bonus} XP</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="p-8 bg-[#4caf50]/5 rounded-[40px] border border-[#4caf50]/10 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-[#4caf50] uppercase tracking-widest">Lưu ý tu luyện 🛡️</p>
                            <ul className="text-[9px] text-gray-500 space-y-1 ml-4 list-disc italic">
                                <li><strong>Hạn mức:</strong> XP bình luận giới hạn tối đa 100 XP mỗi ngày.</li>
                                <li><strong>Nghiệp lực:</strong> Bình luận rác, spam bị xóa sẽ bị trừ gấp đôi số XP đã nhận.</li>
                                <li><strong>Thời mốc:</strong> Điểm danh và làm mới nhiệm vụ vào 00:00 hàng ngày (Giờ VN).</li>
                            </ul>
                        </div>
                        <div className="flex items-center justify-center border-l border-white/5 pl-6 italic">
                             <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                                "Cần cù bù thông minh, tu luyện mỗi ngày để sớm ngày đắc đạo tại Shiroi Arika." 🍀
                            </p>
                        </div>
                    </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                <form onSubmit={handleUpdate} className="glass-card p-10 rounded-[48px] border-white/5 space-y-8">
                  <div className="flex items-baseline gap-3">
                      <h3 className="text-lg font-black uppercase tracking-tighter text-white italic">Thông tin hồ sơ</h3>
                      <div className="h-[2px] flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase ml-4 tracking-widest">Tên hiển thị công khai</label>
                      <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full bg-black/60 border border-white/5 rounded-[24px] px-6 py-4 outline-none focus:border-[#4caf50] transition-all" placeholder="Nhập tên hiển thị..." />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-500 uppercase ml-4 tracking-widest">Lời tự thuật (Bio)</label>
                      <textarea value={bio} onChange={e => setBio(e.target.value)} className="w-full bg-black/60 border border-white/5 rounded-[24px] px-6 py-4 outline-none focus:border-[#4caf50] resize-none transition-all" rows="3" placeholder="Viết vài dòng giới thiệu về mình..." />
                    </div>
                    <button type="submit" disabled={updating} className="w-full py-5 bg-[#4caf50] text-[#0a0c0a] font-black rounded-[24px] text-[11px] uppercase tracking-widest shadow-xl shadow-[#4caf50]/20 disabled:opacity-20 transition-all hover:scale-[1.02]">Lưu thay đổi hồ sơ ✨</button>
                    {message && <p className="text-center text-[10px] font-black text-[#4caf50] animate-pulse">{message}</p>}
                  </div>
                </form>

                <form onSubmit={handlePasswordUpdate} className="glass-card p-10 rounded-[48px] border-white/5 space-y-8">
                  <div className="flex items-baseline gap-3">
                      <h3 className="text-lg font-black uppercase tracking-tighter text-white italic">Mật mã bảo mật</h3>
                      <div className="h-[2px] flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                  </div>
                  <div className="space-y-4">
                    <input type="password" placeholder="Mật khẩu hiện tại" value={oldPassword} onChange={e => setOldPassword(e.target.value)} className="w-full bg-black/60 border border-white/5 rounded-[24px] px-6 py-4 outline-none focus:border-[#4caf50]" />
                    <input type="password" placeholder="Mật khẩu mới" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-black/60 border border-white/5 rounded-[24px] px-6 py-4 outline-none focus:border-[#4caf50]" />
                    <input type="password" placeholder="Xác nhận mật khẩu mới" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-black/60 border border-white/5 rounded-[24px] px-6 py-4 outline-none focus:border-[#4caf50]" />
                    <button type="submit" disabled={pwdUpdating} className="w-full py-5 bg-white/5 text-white font-black rounded-[24px] text-[11px] uppercase border border-white/10 hover:bg-white/10 transition-all disabled:opacity-20">Cập nhật mật mã 🔐</button>
                    {pwdMessage && <p className="text-center text-[10px] font-black text-[#4caf50]">{pwdMessage}</p>}
                  </div>
                </form>
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div key="notifications" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                  <div className="glass-card p-10 rounded-[48px] border-white/5 space-y-8">
                     <div className="flex items-baseline gap-3">
                        <h3 className="text-lg font-black uppercase tracking-tighter text-white italic">Hộp thư Thánh địa</h3>
                        <div className="h-[2px] flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                     </div>
                     <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                        {notifications.map((n, nIdx) => (
                          <motion.div 
                            key={n.id} 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: nIdx * 0.05 }}
                            onClick={() => !n.is_read && handleMarkAsRead(n.id)} 
                            className={`p-6 rounded-[32px] border transition-all cursor-pointer relative overflow-hidden group ${
                                !n.is_read 
                                ? 'bg-gradient-to-br from-[#4caf50]/10 to-transparent border-[#4caf50]/20' 
                                : 'bg-white/5 border-white/5 opacity-80'
                            }`}
                          >
                            {!n.is_read && <div className="absolute top-4 right-4 w-2 h-2 bg-[#4caf50] rounded-full animate-pulse" />}
                            <p className={`text-xs font-black uppercase mb-1 tracking-tight ${!n.is_read ? 'text-[#4caf50]' : 'text-white/80'}`}>{n.title}</p>
                            <p className="text-[10px] text-gray-500 leading-relaxed group-hover:text-gray-300 transition-colors">{n.body}</p>
                            <div className="flex justify-between items-center mt-4">
                                <span className="text-[8px] text-gray-700 font-bold uppercase tracking-widest">{formatSafeDistance(n.created_at)}</span>
                                <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">✨</span>
                            </div>
                          </motion.div>
                        ))}
                        {notifications.length === 0 && <p className="text-center text-gray-700 py-20 italic">Hộp thư đang vắng lặng... 🍃</p>}
                    </div>
                  </div>

                  {/* 🔔 CÀI ĐẶT THÔNG BÁO ĐẨY */}
                  <div className="glass-card p-10 rounded-[48px] border-[#4caf50]/10 space-y-8 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-48 h-48 bg-[#4caf50]/5 blur-3xl rounded-full" />
                      <div className="flex items-baseline gap-3 relative z-10">
                        <h3 className="text-lg font-black uppercase tracking-tighter text-[#4caf50] italic">Thông báo đẩy (Push)</h3>
                        <div className="h-[2px] flex-1 bg-gradient-to-r from-[#4caf50]/10 to-transparent" />
                      </div>
                      
                      <div className="space-y-6 relative z-10">
                          <p className="text-[10px] text-gray-400 leading-relaxed">
                              Kết nối trực tiếp với Thánh địa. Nhận tin tức **Cập nhật chương mới**, **Nhiệm vụ** hoặc **Tin nhắn khẩn** ngay cả khi bạn đang bế quan (đóng trình duyệt). 🚀
                          </p>
                          
                          <div className="p-8 bg-black/40 rounded-[32px] border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
                              <div className="text-center sm:text-left">
                                  <p className="text-xs font-black text-[#4caf50] uppercase tracking-wider mb-1">Trạng thái kết nối</p>
                                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                                    <div className={`w-2 h-2 rounded-full ${fcmEnabled ? 'bg-green-500 shadow-[0_0_10px_#4caf50]' : 'bg-gray-700'}`} />
                                    <p className={`text-[10px] font-bold uppercase tracking-widest ${fcmEnabled ? 'text-green-500' : 'text-gray-600 italic'}`}>
                                        {fcmEnabled ? 'Đã kích hoạt' : 'Chưa kích hoạt'}
                                    </p>
                                  </div>
                              </div>
                              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                <button 
                                    onClick={() => setShowFcmGuide(!showFcmGuide)}
                                    className="px-6 py-5 rounded-2xl font-black text-[9px] uppercase tracking-widest bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all"
                                >
                                    HƯỚNG DẪN 💡
                                </button>
                                <button 
                                    onClick={fcmEnabled ? handleDisableNotifications : handleEnableNotifications}
                                    disabled={fcmLoading}
                                    className={`flex-1 sm:flex-none px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 ${
                                        fcmEnabled 
                                        ? 'bg-red-500/10 text-red-500 border border-red-500/20 shadow-xl shadow-red-500/10' 
                                        : 'bg-[#4caf50] text-[#0a0c0a] shadow-2xl shadow-[#4caf50]/30'
                                    }`}
                                >
                                    {fcmLoading ? '...' : fcmEnabled ? 'HỦY KÍCH HOẠT ✕' : 'KÍCH HOẠT NGAY ⚡'}
                                </button>
                              </div>
                          </div>

                          {/* 💡 HƯỚNG DẪN CẤP QUYỀN CHI TIẾT */}
                          <AnimatePresence>
                            {showFcmGuide && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="p-8 bg-[#4caf50]/5 border border-[#4caf50]/20 rounded-[32px] space-y-6 mt-4">
                                  <div className="flex items-center gap-3">
                                      <div className="w-1.5 h-4 bg-[#4caf50] rounded-full"></div>
                                      <h4 className="text-[10px] font-black uppercase tracking-widest text-white">Cách bật quyền thông báo</h4>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                      <div className="space-y-3">
                                          <div className="flex items-center gap-3">
                                              <span className="w-6 h-6 rounded-lg bg-[#4caf50]/20 text-[#4caf50] flex items-center justify-center text-[10px] font-black">01</span>
                                              <p className="text-[10px] font-black text-white uppercase tracking-tighter">Mở cài đặt</p>
                                          </div>
                                          <p className="text-[9px] text-gray-500 leading-relaxed ml-9">
                                              Nhấn vào biểu tượng **Cài đặt** (hình 🔒 hoặc biểu tượng **Tùy chỉnh** ⚙️/⊶) ở bên trái thanh địa chỉ.
                                          </p>
                                      </div>
                                      
                                      <div className="space-y-3">
                                          <div className="flex items-center gap-3">
                                              <span className="w-6 h-6 rounded-lg bg-[#4caf50]/20 text-[#4caf50] flex items-center justify-center text-[10px] font-black">02</span>
                                              <p className="text-[10px] font-black text-white uppercase tracking-tighter">Cho phép</p>
                                          </div>
                                          <p className="text-[9px] text-gray-500 leading-relaxed ml-9">
                                              Tìm mục **Thông báo** (Notifications) và gạt sang trạng thái **Cho phép** (Allow).
                                          </p>
                                      </div>
                                      
                                      <div className="space-y-3">
                                          <div className="flex items-center gap-3">
                                              <span className="w-6 h-6 rounded-lg bg-[#4caf50]/20 text-[#4caf50] flex items-center justify-center text-[10px] font-black">03</span>
                                              <p className="text-[10px] font-black text-white uppercase tracking-tighter">Hoàn tất</p>
                                          </div>
                                          <p className="text-[9px] text-gray-500 leading-relaxed ml-9">
                                              Tải lại (F5) trang web và nhấn **Kích hoạt ngay** để bắt đầu nhận tin từ Thánh địa.
                                          </p>
                                      </div>
                                  </div>

                                  <div className="pt-4 border-t border-white/5 flex items-center gap-3">
                                      <span className="text-orange-500 text-xs">⚠️</span>
                                      <p className="text-[8px] text-gray-600 italic font-medium">
                                          Lưu ý: Thông báo đẩy không hoạt động ở chế độ Ẩn danh (Incognito).
                                      </p>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                      </div>
                  </div>
              </motion.div>
            )}

            {activeTab === 'reports' && (
              <motion.div key="reports" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                  <div className="glass-card p-10 rounded-[48px] border-white/5 space-y-8">
                      <div className="flex items-center justify-between">
                        <div className="flex items-baseline gap-3">
                           <h3 className="text-lg font-black uppercase tracking-tighter text-white italic">Báo cáo & Hỗ trợ</h3>
                           <div className="h-[2px] w-20 bg-gradient-to-r from-white/10 to-transparent" />
                        </div>
                        {!selectedReport && !isCreatingReport && (
                           <button 
                             onClick={() => setIsCreatingReport(true)}
                             className="px-6 py-2.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-lg active:scale-95"
                           >
                             Tạo báo cáo mới 🚩
                           </button>
                        )}
                      </div>

                      {!selectedReport && !isCreatingReport ? (
                        <div className="space-y-4 max-h-[450px] overflow-y-auto pr-4 custom-scrollbar">
                           {userReports.map((r, rIdx) => (
                             <motion.div 
                               key={r.id}
                               initial={{ opacity: 0, y: 10 }}
                               animate={{ opacity: 1, y: 0 }}
                               transition={{ delay: rIdx * 0.05 }}
                               onClick={() => {
                                   setSelectedReport(r);
                                   fetchReportMessages(r.id);
                               }}
                               className="p-6 rounded-[32px] border border-white/5 bg-white/5 hover:bg-white/10 transition-all cursor-pointer relative overflow-hidden group"
                             >
                               <div className="flex justify-between items-start mb-1">
                                  <p className="text-xs font-black text-white uppercase tracking-tight">{r.mangas?.title || 'Báo cáo hệ thống'}</p>
                                  <span className="text-[8px] font-black text-amber-500/80 uppercase px-2 py-0.5 bg-amber-500/5 rounded-md border border-amber-500/10">{getTypeLabel(r.type)}</span>
                               </div>
                               <p className="text-[10px] text-gray-500 line-clamp-1 italic">"{r.description}"</p>
                               <div className="flex justify-between items-center mt-4">
                                  <span className="text-[8px] text-gray-700 font-bold uppercase tracking-widest">{formatSafeDistance(r.created_at)}</span>
                                  <span className="text-[9px] font-black text-[#4caf50] opacity-0 group-hover:opacity-100 transition-opacity uppercase">Mở hội thoại →</span>
                                </div>
                             </motion.div>
                           ))}

                           {userReports.length === 0 && (
                             <div className="py-20 text-center opacity-30">
                               <p className="text-4xl mb-4">🚩</p>
                               <p className="text-[10px] font-black uppercase tracking-widest">Bạn chưa có báo cáo nào</p>
                             </div>
                           )}
                        </div>
                      ) : isCreatingReport ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                             <div className="flex items-center gap-4 pb-6 border-b border-white/5">
                                <button onClick={() => setIsCreatingReport(false)} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all text-gray-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg>
                                </button>
                                <div>
                                    <p className="text-xs font-black text-white uppercase tracking-tight">Gửi báo cáo lỗi hệ thống</p>
                                    <p className="text-[9px] text-gray-500 font-bold uppercase italic">Phản hồi của bạn giúp Shiroi hoàn thiện hơn 🍀</p>
                                </div>
                            </div>

                            <form onSubmit={handleCreateReport} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase ml-4 tracking-widest">Loại vấn đề</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {[
                                            { id: 'platform_bug', label: 'Lỗi hệ thống' },
                                            { id: 'account_issue', label: 'Lỗi tài khoản' },
                                            { id: 'feature_suggestion', label: 'Góp ý tính năng' },
                                            { id: 'content_error', label: 'Lỗi nội dung' },
                                            { id: 'other', label: 'Vấn đề khác' }
                                        ].map(t => (
                                            <button 
                                                key={t.id}
                                                type="button"
                                                onClick={() => setNewReportType(t.id)}
                                                className={`py-4 rounded-2xl border text-[9px] font-black uppercase tracking-widest transition-all ${
                                                    newReportType === t.id 
                                                    ? 'bg-[#4caf50] text-[#0a0c0a] border-[#4caf50] shadow-lg shadow-[#4caf50]/20' 
                                                    : 'bg-white/5 border-white/5 text-gray-500 hover:border-white/20'
                                                }`}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase ml-4 tracking-widest">Mô tả chi tiết</label>
                                    <textarea 
                                        value={newReportDescription}
                                        onChange={e => setNewReportDescription(e.target.value)}
                                        placeholder="Hãy mô tả lỗi hoặc góp ý của bạn tại đây..."
                                        className="w-full bg-black/60 border border-white/10 rounded-[24px] px-6 py-5 text-sm outline-none focus:border-[#4caf50] transition-all min-h-[150px] resize-none"
                                        required
                                    />
                                </div>

                                <div className="flex gap-4">
                                    <button 
                                        type="button"
                                        onClick={() => setIsCreatingReport(false)}
                                        className="flex-1 py-5 bg-white/5 border border-white/5 text-gray-500 font-black rounded-[24px] text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
                                    >
                                        Hủy bỏ
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={isSubmittingReport || !newReportDescription.trim()}
                                        className="flex-[2] py-5 bg-[#4caf50] text-[#0a0c0a] font-black rounded-[24px] text-[11px] uppercase tracking-widest shadow-xl shadow-[#4caf50]/20 disabled:opacity-30 active:scale-95 transition-all"
                                    >
                                        {isSubmittingReport ? 'ĐANG GỬI...' : 'GỬI BÁO CÁO NGAY 🚀'}
                                    </button>
                                </div>
                            </form>
                        </div>
                      ) : (
                        <div className="space-y-6">
                            {/* Header Chat */}
                            <div className="flex items-center gap-4 pb-6 border-b border-white/5">
                                <button onClick={() => setSelectedReport(null)} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all text-gray-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/></svg>
                                </button>
                                <div>
                                    <p className="text-xs font-black text-white uppercase tracking-tight">{selectedReport.mangas?.title || 'Hỗ trợ hệ thống'}</p>
                                    <p className="text-[9px] text-gray-500 font-bold uppercase">Mã vụ việc: #{selectedReport.id.substring(0, 8)}</p>
                                </div>
                            </div>

                            {/* Khung chat */}
                            <div className="h-[400px] overflow-y-auto pr-4 custom-scrollbar space-y-4 flex flex-col">
                                {/* Tin nhắn gốc (Báo cáo) */}
                                <div className="self-start max-w-[85%] bg-white/5 p-5 rounded-[28px] rounded-tl-none border border-white/5">
                                    <p className="text-[9px] font-black text-gray-500 uppercase mb-2">Báo cáo ban đầu:</p>
                                    <p className="text-[11px] text-white leading-relaxed">{selectedReport.description}</p>
                                    <p className="text-[8px] text-gray-700 font-bold mt-2 text-right uppercase">{formatSafeDistance(selectedReport.created_at)}</p>
                                </div>

                                {reportMessages.map((msg) => (
                                    <div key={msg.id} className={`max-w-[85%] p-5 rounded-[28px] border ${
                                        msg.is_admin_reply 
                                        ? 'self-start bg-[#4caf50]/10 border-[#4caf50]/20 rounded-tl-none' 
                                        : 'self-end bg-blue-500/10 border-blue-500/20 rounded-tr-none'
                                    }`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <p className={`text-[9px] font-black uppercase ${msg.is_admin_reply ? 'text-[#4caf50]' : 'text-blue-400'}`}>
                                                {msg.is_admin_reply ? 'Ban quản trị 🛡️' : 'Bạn'}
                                            </p>
                                        </div>
                                        <p className="text-[11px] text-white leading-relaxed">{msg.message}</p>
                                        <p className="text-[8px] text-gray-700 font-bold mt-2 text-right uppercase">{formatSafeDistance(msg.created_at)}</p>
                                    </div>
                                ))}
                                {isLoadingMessages && <p className="text-center text-[10px] text-gray-700 animate-pulse uppercase font-black">Đang đồng bộ dữ liệu...</p>}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Ô nhập liệu */}
                            <form onSubmit={handleSendMessage} className="pt-6 border-t border-white/5 flex gap-3">
                                <input 
                                    type="text" 
                                    value={newReportMessage}
                                    onChange={(e) => setNewReportMessage(e.target.value)}
                                    placeholder="Viết phản hồi cho admin..."
                                    className="flex-1 bg-black/60 border border-white/10 rounded-2xl px-6 py-4 text-sm outline-none focus:border-[#4caf50] transition-all"
                                />
                                <button 
                                    type="submit" 
                                    disabled={isSendingMessage || !newReportMessage.trim()}
                                    className="px-8 bg-[#4caf50] text-[#0a0c0a] rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-[#4caf50]/20 disabled:opacity-30 active:scale-95 transition-all"
                                >
                                    {isSendingMessage ? '...' : 'GỬI'}
                                </button>
                            </form>
                        </div>
                      )}
                  </div>
              </motion.div>
            )}

            {activeTab === 'admin' && (user?.role === 'admin' || user?.username?.toLowerCase() === 'atheist1504') && (
              <motion.div key="admin" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                 
                 {/* 🚩 QUẢN LÝ BÁO CÁO (ADMIN ONLY) */}
                 <div className="glass-card p-10 rounded-[48px] border-amber-500/10 space-y-8 bg-gradient-to-br from-amber-500/5 to-transparent">
                    <div className="flex items-baseline gap-3">
                        <h3 className="text-lg font-black uppercase tracking-tighter text-amber-500 italic">Hệ thống Báo cáo</h3>
                        <div className="h-[2px] flex-1 bg-gradient-to-r from-amber-500/10 to-transparent" />
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="space-y-1 text-center sm:text-left">
                            <p className="text-sm font-black text-white uppercase tracking-tight">Trung tâm xử lý vi phạm & lỗi</p>
                            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Xem toàn bộ báo cáo từ người dùng và phản hồi trực tiếp</p>
                        </div>
                        <Link 
                            href="/admin/reports"
                            className="px-10 py-5 bg-amber-500 text-[#0a0c0a] rounded-[24px] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-amber-500/20 active:scale-95 transition-all hover:scale-105"
                        >
                            ĐẾN BẢNG ĐIỀU KHIỂN 🚩
                        </Link>
                    </div>
                 </div>

                 <div className="glass-card p-10 rounded-[48px] border-white/5 space-y-8">
                    <div className="flex items-baseline gap-3">
                        <h3 className="text-lg font-black uppercase tracking-tighter text-red-500 italic">Quản lý nhân sự</h3>
                        <div className="h-[2px] flex-1 bg-gradient-to-r from-red-500/10 to-transparent" />
                    </div>
                    <form onSubmit={handleSearchUsers} className="flex gap-3">
                       <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Tìm tên người dùng..." className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm outline-none focus:border-red-500/50 transition-all" />
                       <button className="bg-red-500 text-white px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-red-500/20 active:scale-95 transition-all">TÌM</button>
                    </form>
                    <div className="grid grid-cols-1 gap-3">
                       {foundUsers.map(u => (
                         <div key={u.id} className="p-6 bg-white/5 rounded-[32px] border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                               <img src={u.avatar_url || 'https://psgivxgycjireinwnelc.supabase.co/storage/v1/object/public/avatars/default-avatar.png'} className="w-12 h-12 rounded-2xl object-cover border-2 border-white/10 shadow-lg" alt=""/>
                               <div>
                                  <p className="text-sm font-black text-white">{u.username}</p>
                                  <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">{u.role === 'admin' ? 'Quản trị viên' : u.role === 'staff' ? 'Nhân sự' : 'Thành viên'}</p>
                               </div>
                            </div>
                            <div className="flex gap-2">
                               <button 
                                 onClick={() => handleGiveXp(u.id)} 
                                 className="px-4 py-2 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-500 font-black text-[8px] uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all"
                               >
                                 THƯỞNG XP
                               </button>
                               <button 
                                 onClick={() => handleUpdateRole(u.id, 'staff')} 
                                 className={`px-4 py-2 rounded-xl border font-black text-[8px] uppercase tracking-widest transition-all ${
                                     u.role === 'staff' 
                                     ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20' 
                                     : 'bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500 hover:text-white'
                                 }`}
                               >
                                 STAFF
                               </button>
                               <button 
                                 onClick={() => handleUpdateRole(u.id, 'admin')} 
                                 className={`px-4 py-2 rounded-xl border font-black text-[8px] uppercase tracking-widest transition-all ${
                                     u.role === 'admin' 
                                     ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20' 
                                     : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white'
                                 }`}
                               >
                                 ADMIN
                               </button>
                               <button 
                                 onClick={() => handleUpdateRole(u.id, 'user')} 
                                 className={`px-4 py-2 rounded-xl border font-black text-[8px] uppercase tracking-widest transition-all ${
                                     u.role === 'user' || (!u.role)
                                     ? 'bg-gray-500 text-white border-gray-500 shadow-lg shadow-gray-500/20' 
                                     : 'bg-gray-500/10 text-gray-500 border-gray-500/20 hover:bg-gray-500 hover:text-white'
                                 }`}
                               >
                                 USER
                               </button>
                            </div>
                         </div>
                       ))}
                       {foundUsers.length === 0 && searchQuery && <p className="text-center text-[10px] text-gray-600 italic py-10">Không tìm thấy ai phù hợp... 🕵️‍♂️</p>}
                    </div>
                 </div>

                 {/* 💡 QUẢN LÝ GỢI Ý DANH HIỆU */}
                 <div className="glass-card p-10 rounded-[48px] border-[#4caf50]/10 space-y-8">
                    <div className="flex items-baseline gap-3">
                        <h3 className="text-lg font-black uppercase tracking-tighter text-[#4caf50] italic">Đề xuất danh xưng</h3>
                        <div className="h-[2px] flex-1 bg-gradient-to-r from-[#4caf50]/10 to-transparent" />
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                       {titleSuggestions.filter(s => s.status === 'pending').map(s => (
                         <div key={s.id} className="p-8 bg-black/40 rounded-[40px] border border-white/5 space-y-4">
                            <div className="flex justify-between items-start">
                               <div>
                                  <p className="text-lg font-black text-[#4caf50] uppercase italic tracking-tight">"{s.title_name}"</p>
                                  <p className="text-[10px] text-gray-500 mt-1 uppercase font-black">Bởi: <span className="text-white">{s.shiroi_users?.display_name || s.shiroi_users?.username}</span></p>
                                </div>
                                <span className="text-[9px] text-gray-700 font-bold">{formatSafeDistance(s.created_at)}</span>
                            </div>
                            {s.reason && <p className="text-[11px] text-gray-400 bg-white/5 p-5 rounded-2xl leading-relaxed italic border border-white/5">"{s.reason}"</p>}
                            <div className="flex gap-3 pt-2">
                               <button onClick={() => handleProcessSuggestion(s.id, 'approved')} className="flex-1 py-4 bg-[#4caf50]/10 text-[#4caf50] border border-[#4caf50]/20 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-[#4caf50] hover:text-[#0a0c0a] transition-all">CHẤP THUẬN ✅</button>
                               <button onClick={() => handleProcessSuggestion(s.id, 'rejected')} className="flex-1 py-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">TỪ CHỐI ✕</button>
                            </div>
                         </div>
                       ))}
                       {titleSuggestions.filter(s => s.status === 'pending').length === 0 && (
                         <p className="text-center text-[10px] text-gray-700 py-10 italic">Hiện chưa có gợi ý nào đang chờ... ✨</p>
                       )}
                    </div>
                 </div>

                 {/* 🏆 DANH SÁCH DANH HIỆU CHÍNH THỨC */}
                 <div className="glass-card p-10 rounded-[48px] border-[#4caf50]/10 space-y-8">
                    <div className="flex justify-between items-baseline gap-3">
                         <h3 className="text-lg font-black uppercase tracking-tighter text-[#4caf50] italic">Danh sách chính thức</h3>
                         <div className="h-[2px] flex-1 bg-gradient-to-r from-[#4caf50]/10 to-transparent" />
                         <span className="text-[10px] font-black text-gray-600">{dynamicTitles.length} DANH PHẨM</span>
                    </div>

                    <form onSubmit={handleCreateOfficialTitle} className="p-6 bg-[#4caf50]/5 border border-dashed border-[#4caf50]/30 rounded-[32px] flex flex-wrap gap-4 items-end">
                        <div className="flex-1 min-w-[200px] space-y-2">
                            <label className="text-[9px] font-black text-gray-500 uppercase ml-2">Tên danh phẩm mới</label>
                            <input 
                                type="text" 
                                value={newTitleName}
                                onChange={e => setNewTitleName(e.target.value)}
                                placeholder="VD: Thần Giới Chí Tôn..."
                                className="w-full bg-black/60 border border-white/5 rounded-2xl px-5 py-3 text-sm outline-none focus:border-[#4caf50]"
                                required
                            />
                        </div>
                        <div className="w-24 space-y-2">
                            <label className="text-[9px] font-black text-gray-500 uppercase ml-2">Cấp độ</label>
                            <input 
                                type="number" 
                                value={newTitleLv}
                                onChange={e => setNewTitleLv(e.target.value)}
                                placeholder="LVL"
                                className="w-full bg-black/60 border border-white/5 rounded-2xl px-5 py-3 text-sm outline-none focus:border-[#4caf50]"
                                required
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={addingTitle}
                            className="px-8 py-3 bg-[#4caf50] text-[#0a0c0a] rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#4caf50]/20 hover:scale-105 active:scale-95 transition-all"
                        >
                            {addingTitle ? '...' : 'THÊM ➕'}
                        </button>
                    </form>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                        {dynamicTitles.map((t) => (
                            <div key={t.id} className="p-6 bg-white/5 rounded-[32px] border border-white/5 flex justify-between items-center group hover:border-[#4caf50]/20 transition-all">
                                <div>
                                    <p className="text-xs font-black text-[#4caf50] uppercase tracking-tight italic leading-none mb-1">{t.name}</p>
                                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Yêu cầu: LVL {t.lv}</p>
                                </div>
                                <button 
                                    onClick={() => handleDeleteOfficialTitle(t.id)}
                                    className="p-3 text-gray-700 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  </div>
);
}
