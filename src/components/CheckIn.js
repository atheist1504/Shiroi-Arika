"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { XP_REWARDS } from "@/lib/xp";
import { createPortal } from "react-dom";

export default function CheckIn() {
  const [user, setUser] = useState(null);
  const [canCheckIn, setCanCheckIn] = useState(false);
  const [checking, setChecking] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [message, setMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true); // 🚀 Trạng thái đồng bộ ban đầu

  useEffect(() => {
    // 🚀 CHỈ LẤY USER TỪ LOCAL, KHÔNG SET canCheckIn TẠI ĐÂY ĐỂ TRÁNH FLICKER
    const storedUser = localStorage.getItem("shiroi_user");
    if (storedUser) setUser(JSON.parse(storedUser));

    // 🕵️‍♂️ ƯU TIÊN KIỂM TRA TỪ DB ĐỂ ĐẢM BẢO CHÍNH XÁC TUYỆT ĐỐI
    fetchStatusFromDb();
    setIsMounted(true);

    // 🕵️‍♂️ REAL-TIME SYNC: Đồng bộ đa thiết bị 🌍
    let channel;
    if (storedUser) {
        const u = JSON.parse(storedUser);
        channel = supabase
            .channel(`checkin_sync_${u.id}_${Math.random().toString(36).substring(7)}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'shiroi_xp_logs', 
                filter: `user_id=eq.${u.id}` 
            }, (payload) => {
                if (payload.new.type === 'check_in') {
                    console.log("♻️ [CheckIn] Phát hiện điểm danh mới, đang đồng bộ...");
                    fetchStatusFromDb();
                }
            })
            .subscribe();
    }

    window.addEventListener("storage", checkUserAndStatus);
    return () => {
        window.removeEventListener("storage", checkUserAndStatus);
        if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const fetchStatusFromDb = async () => {
    const storedUser = localStorage.getItem("shiroi_user");
    if (!storedUser) return;
    
    try {
      const userData = JSON.parse(storedUser);
      // 🕵️‍♂️ LẤY NGÀY HIỆN TẠI (VIỆT NAM) 🇻🇳
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
      
      // Lấy nhật ký điểm danh MỚI NHẤT của User 🍀
      const { data: logs, error: logError } = await supabase
        .from('shiroi_xp_logs')
        .select('created_at')
        .eq('user_id', userData.id)
        .eq('type', 'check_in')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (!logError && logs && logs.length > 0) {
         // So sánh ngày của log mới nhất với ngày hôm nay (VN) 🛡️
         const lastLogDate = new Date(logs[0].created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
         setCanCheckIn(lastLogDate !== today);
      } else {
         setCanCheckIn(true);
      }
    } catch (err) {
      console.warn("Lỗi đồng bộ CheckIn từ Nhật ký:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const checkUserAndStatus = async () => {
    const storedUser = localStorage.getItem("shiroi_user");
    if (!storedUser) {
      setUser(null);
      return;
    }
    const userData = JSON.parse(storedUser);
    setUser(userData);
    
    // LOGIC KIỂM TRA ĐIỂM DANH 🕵️‍♂️

    // Kiểm tra xem đã điểm danh hôm nay chưa
    if (userData.last_check_in) {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
      const lastCheckDate = new Date(userData.last_check_in).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
      
      setCanCheckIn(lastCheckDate !== today);
    } else {
      setCanCheckIn(true);
    }
  };

    const handleCheckIn = async () => {
      try {
        if (!canCheckIn || checking) {
           setModalMessage("BẠN ĐÃ NHẬN QUÀ HÔM NAY RỒI! HẸN GẶP LẠI VÀO NGÀY MAI NHÉ! 🍀");
           setShowModal(true);
           setCanCheckIn(false);
           return;
        }
        
        setChecking(true);
        const { performCheckInAction } = await import('@/lib/actions');
        const res = await performCheckInAction();

        if (res.success) {
           localStorage.setItem("shiroi_user", JSON.stringify(res.user));
           setUser(res.user);
           setCanCheckIn(false);
           setModalMessage(`CHÚC MỪNG! BẠN ĐÃ NHẬN ĐƯỢC +${res.xpGain} XP VÀNG VÀO TÀI KHOẢN! ✨💎`);
           setShowModal(true);
           window.dispatchEvent(new Event("storage"));
        } else {
            // 🛡️ XỬ LÝ LỖI THÂN THIỆN: Đảm bảo không hiển thị "USERID IS NOT DEFINED" 🍀
            let errorMsg = res.error || "Hệ thống bận, vui lòng thử lại sau! 🙏";
            
            if (errorMsg.includes("session") || errorMsg.includes("ID") || errorMsg.includes("defined") || errorMsg.includes("Vui lòng đăng nhập")) {
               errorMsg = "PHIÊN LÀM VIỆC ĐÃ HẾT HẠN HOẶC BỊ LỖI. VUI LÒNG TẢI LẠI TRANG HOẶC ĐĂNG XUẤT VÀ ĐĂNG NHẬP LẠI ĐỂ TIẾP TỤC NHÉ! 🛡️🍀";
            }
            
            setModalMessage(errorMsg);
            setShowModal(true);
            if (res.error?.includes('đã điểm danh')) setCanCheckIn(false);
        }
    } catch (error) {
      console.error("Lỗi điểm danh:", error);
      setMessage("Hệ thống bận, hãy thử lại sau! 🙏");
    } finally {
      setChecking(false);
    }
  };

  if (!user) return null;

  return (
    <div className="relative group">
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -20 }}
            className="absolute -top-14 left-1/2 -translate-x-1/2 bg-[#4caf50] text-[#0a0c0a] px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap shadow-[0_20px_50px_rgba(76,175,80,0.4)] z-[20002] border-2 border-white/20"
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={handleCheckIn}
        style={{ zIndex: 100001, pointerEvents: 'auto' }}
        className={`relative transition-all group/checkin active:scale-90 ${
          canCheckIn 
          ? "cursor-pointer"
          : "cursor-default opacity-60"
        }`}
      >
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-500 ${
            canCheckIn && !isSyncing
            ? "bg-[#4caf50]/5 border-[#4caf50]/20 hover:border-[#4caf50] hover:bg-[#4caf50]/10 shadow-[0_0_20px_rgba(76,175,80,0.05)] hover:shadow-[0_0_25px_rgba(76,175,80,0.15)]" 
            : "bg-white/5 border-white/5"
        }`}>
            <span className={`text-sm transition-transform duration-500 ${canCheckIn && !isSyncing ? 'group-hover/checkin:scale-125 group-hover/checkin:rotate-12' : ''}`}>
                {isSyncing ? "🌀" : (canCheckIn ? (checking ? "🌀" : "🔥") : "📅")}
            </span>
            <div className="flex flex-col items-start leading-tight">
                <span className={`text-[7px] font-black uppercase tracking-[0.2em] ${canCheckIn && !isSyncing ? 'text-[#4caf50]' : 'text-gray-600'}`}>
                    {isSyncing ? "Đang check" : `CHUỖI: ${user?.check_in_streak || 0}`}
                </span>
                <span className={`text-[8px] font-black uppercase tracking-widest ${canCheckIn && !isSyncing ? 'text-white' : 'text-gray-500'}`}>
                    {isSyncing ? "XIN ĐỢI..." : (canCheckIn ? (checking ? "ĐANG GỬI..." : "ĐIỂM DANH") : "HẸN MAI NHÉ")}
                </span>
            </div>
        </div>
      </button>

      {/* HIỆU ỨNG THÔNG BÁO MODAL TRUNG TÂM TUYỆT ĐỐI 💎 */}
      {isMounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
            {showModal && (
            <div className="fixed inset-0 z-[10000000] flex items-center justify-center p-4 overflow-x-hidden overflow-y-auto">
                <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowModal(false)}
                className="fixed inset-0 bg-black/95 backdrop-blur-2xl"
                />

                <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 40 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: -40 }}
                className="relative w-full max-w-[420px] bg-[#0f120f] border-2 border-[#4caf50]/30 p-8 sm:p-12 rounded-[56px] shadow-[0_50px_150px_rgba(0,0,0,0.9)] text-center overflow-hidden flex flex-col items-center"
                >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] h-full bg-[radial-gradient(circle_at_50%_0%,rgba(76,175,80,0.2)_0%,transparent_70%)] pointer-events-none" />
                
                <div className="w-24 h-24 bg-gradient-to-br from-[#4caf50]/20 to-transparent rounded-[32px] flex items-center justify-center mx-auto mb-8 border-2 border-[#4caf50]/30 shadow-[0_0_40px_rgba(76,175,80,0.2)]">
                    <span className="text-5xl">🎁</span>
                </div>

                <h3 className="text-[#4caf50] font-black text-2xl uppercase tracking-[0.4em] mb-4">VINH DANH</h3>
                <p className="text-gray-300 font-bold leading-relaxed mb-10 text-[11px] px-2 uppercase tracking-[0.2em]">{modalMessage}</p>

                <button
                    onClick={() => setShowModal(false)}
                    className="w-full py-5 bg-[#4caf50] text-[#0a0c0a] rounded-[24px] font-black uppercase tracking-[0.3em] text-[11px] hover:brightness-110 active:scale-95 transition-all shadow-2xl shadow-[#4caf50]/20 border-b-4 border-[#388e3c]"
                >
                    XÁC NHẬN ✨
                </button>
                </motion.div>
            </div>
            )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
