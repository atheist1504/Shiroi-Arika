"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { XP_REWARDS } from "@/lib/xp";

export default function CheckIn() {
  const [user, setUser] = useState(null);
  const [canCheckIn, setCanCheckIn] = useState(false);
  const [checking, setChecking] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [message, setMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    checkUserAndStatus();
    // 🚀 ĐỒNG BỘ THỰC TẾ: Tránh lỗi Refresh vẫn hiện nút điểm danh
    fetchStatusFromDb();
    setIsMounted(true);

    window.addEventListener("storage", checkUserAndStatus);
    return () => window.removeEventListener("storage", checkUserAndStatus);
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
      const lastCheck = new Date(userData.last_check_in);
      const today = new Date();
      const isSameDay = 
        lastCheck.getDate() === today.getDate() &&
        lastCheck.getMonth() === today.getMonth() &&
        lastCheck.getFullYear() === today.getFullYear();
      
      setCanCheckIn(!isSameDay);
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
        className={`transition-all flex items-center gap-2 group/btn active:scale-95 ${
          canCheckIn 
          ? "text-[#4caf50] hover:brightness-125"
          : "text-gray-500 cursor-default"
        }`}
      >
        <div className="flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em]">
          <span className="text-sm opacity-80 group-hover/btn:scale-110 transition-transform">🔥</span>
          <span className="opacity-80">{user?.check_in_streak || 0}</span>
          <span>
             {canCheckIn ? (checking ? "Đang gửi..." : "Nhận quà") : "Hẹn mai nhé"}
          </span>
        </div>
      </button>

      {/* HIỆU ỨNG THÔNG BÁO MODAL TRUNG TÂM TUYỆT ĐỐI 💎 */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[9999999]">
            {/* Lớp phủ mở 🕸️ */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />

            {/* Hộp thư quà tặng nhỏ gọn 🚀 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              style={{ 
                position: 'fixed',
                top: '50%',
                left: '50%',
                x: '-50%',
                y: '-50%',
              }}
              className="w-[320px] bg-[#141814] border border-[#4caf50]/30 p-8 rounded-[32px] shadow-[0_30px_100px_rgba(0,0,0,0.8)] text-center overflow-hidden"
            >
              {/* Hiệu ứng hào quang nhẹ 🍀 */}
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#4caf50]/5 to-transparent pointer-events-none" />
              
              <div className="w-16 h-16 bg-[#4caf50]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#4caf50]/20 shadow-inner">
                <span className="text-3xl">🎁</span>
              </div>

              <h3 className="text-[#4caf50] font-black text-xl uppercase tracking-[0.2em] mb-4">VINH DANH</h3>
              <p className="text-gray-300 font-bold leading-relaxed mb-8 text-sm px-2 uppercase tracking-wide">{modalMessage}</p>

              <button
                onClick={() => setShowModal(false)}
                className="w-full py-4 bg-[#4caf50] text-[#0a0c0a] rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#4caf50]/20"
              >
                XÁC NHẬN ✨
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
