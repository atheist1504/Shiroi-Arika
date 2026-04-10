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

  useEffect(() => {
    checkUserAndStatus();
    // Listen for storage changes (login/logout/profile update)
    window.addEventListener("storage", checkUserAndStatus);
    return () => window.removeEventListener("storage", checkUserAndStatus);
  }, []);

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
        const raw = localStorage.getItem("shiroi_user");
        if (!raw) return;
        
        let currentUser;
        try {
           currentUser = JSON.parse(raw);
        } catch (e) { return; }

        if (!canCheckIn || checking) {
           // NÊU QUÀ ĐÃ NHẬN -> HIỆN BẢNG THẾ GIỚI! 💎
           setModalMessage("BẠN ĐÃ NHẬN QUÀ HÔM NAY RỒI! HẸN GẶP LẠI VÀO NGÀY MAI NHÉ! 🍀");
           setShowModal(true);
           setCanCheckIn(false);
           setChecking(false);
           return;
        }
        
        setChecking(true);
        const { data: latestUser, error: fetchError } = await supabase
          .from("shiroi_users")
          .select("*")
          .eq("id", currentUser.id)
          .single();

        if (fetchError) throw fetchError;

        // 🕵️‍♂️ THIẾT LẬP KỶ LUẬT THỜI GIAN THỰC ⏳
        const now = new Date();
        const lastCheck = latestUser?.last_check_in ? new Date(latestUser.last_check_in) : null;
        
        const isSameDay = lastCheck && 
          lastCheck.getDate() === now.getDate() &&
          lastCheck.getMonth() === now.getMonth() &&
          lastCheck.getFullYear() === now.getFullYear();

        if (isSameDay) {
           setModalMessage("BẠN ĐÃ NHẬN QUÀ HÔM NAY RỒI! HẸN GẶP LẠI VÀO NGÀY MAI NHÉ! 🍀");
           setShowModal(true);
           setCanCheckIn(false); // KHÓA CỨNG GIAO DIỆN 🔒
           return;
        }

        const xpGain = XP_REWARDS.DAILY_CHECKIN;
        const newXP = (latestUser?.xp || 0) + xpGain;
        const nowIso = now.toISOString();

        const updatePayload = { 
          xp: newXP,
          last_check_in: nowIso,
          check_in_streak: (latestUser?.check_in_streak || 0) + 1
        };

        const { data, error } = await supabase
          .from("shiroi_users")
          .update(updatePayload)
          .eq("id", currentUser.id)
          .select()
          .single();

       if (error) throw error;

      if (data) {
        localStorage.setItem("shiroi_user", JSON.stringify(data));
        setUser(data);
        setCanCheckIn(false);
        setModalMessage(`CHÚC MỪNG! BẠN ĐÃ NHẬN ĐƯỢC +${xpGain} XP VÀNG VÀO TÀI KHOẢN! ✨💎`);
        setShowModal(true);
        // Kích hoạt đồng bộ Navbar
        window.dispatchEvent(new Event("storage"));
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
        className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-[20px] font-black text-[9px] sm:text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-2 border-2 relative active:scale-95 ${
          canCheckIn 
          ? "bg-[#141814] border-[#4caf50] text-[#4caf50] hover:bg-[#4caf50] hover:text-[#0a0c0a] hover:shadow-[0_0_30px_rgba(76,175,80,0.5)] shadow-[0_10px_40px_rgba(0,0,0,0.3)] animate-pulse"
          : "bg-[#141814] border-white/10 text-gray-400 hover:border-white/20 active:bg-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.3)]"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">🔥</span>
          <span className="text-[12px] font-black mr-1">{user?.check_in_streak || 0}</span>
          {canCheckIn ? (
            <>
              {checking ? "ĐANG GỬI..." : "NHẬN QUÀ"}
            </>
          ) : (
            <>
              HẸN MAI NHÉ
            </>
          )}
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

            {/* Hộp thư quà tặng rực rỡ 🚀 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              style={{ 
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
              className="w-[92%] max-w-[420px] bg-gradient-to-br from-[#1c221c] to-[#0a0c0a] border border-[#4caf50]/40 p-12 rounded-[48px] shadow-[0_40px_120px_rgba(0,0,0,1)] text-center overflow-hidden"
            >
              {/* Hiệu ứng hào quang rực rỡ 🍀 */}
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-[#4caf50]/5 to-transparent pointer-events-none" />
              
              <div className="w-28 h-28 bg-[#4caf50]/20 rounded-full flex items-center justify-center mx-auto mb-10 border-2 border-[#4caf50]/30 shadow-[0_0_40px_rgba(76,175,80,0.2)] animate-spin-slow">
                <span className="text-6xl">🎁</span>
              </div>

              <h3 className="text-[#4caf50] font-black text-3xl uppercase tracking-[0.2em] mb-6 drop-shadow-lg">VINH DANH</h3>
              <p className="text-gray-200 font-bold leading-relaxed mb-12 text-xl px-4 drop-shadow-sm">{modalMessage}</p>

              <button
                onClick={() => setShowModal(false)}
                className="w-full py-6 bg-[#4caf50] text-[#0a0c0a] rounded-3xl font-black uppercase tracking-[0.4em] text-sm hover:scale-[1.05] active:scale-95 transition-all shadow-[0_0_60px_rgba(76,175,80,0.6)]"
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
