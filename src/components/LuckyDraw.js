"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { performLuckyDrawAction } from "@/lib/actions";

export default function LuckyDraw() {
  const [user, setUser] = useState(null);
  const [canDraw, setCanDraw] = useState(false);
  const [buttonText, setButtonText] = useState("Bốc quà");
  const [isDrawing, setIsDrawing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalResult, setModalResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    checkStatus();
    // 🚀 ĐỒNG BỘ THỰC TẾ: Kiểm tra thêm từ DB để tránh dữ liệu LocalStorage bị cũ (Stale)
    fetchStatusFromDb();
    setIsMounted(true);

    // 🕵️‍♂️ REAL-TIME SYNC: Đồng bộ đa thiết bị 🌍
    let channel;
    const userStr = localStorage.getItem("shiroi_user");
    if (userStr) {
        const u = JSON.parse(userStr);
        channel = supabase
            .channel(`luckydraw_sync_${u.id}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'shiroi_xp_logs', 
                filter: `user_id=eq.${u.id}` 
            }, (payload) => {
                if (payload.new.type === 'lucky_draw') {
                    console.log("♻️ [LuckyDraw] Phát hiện bốc quà mới, đang đồng bộ...");
                    fetchStatusFromDb();
                }
            })
            .subscribe();
    }

    window.addEventListener("storage", checkStatus);
    return () => {
        window.removeEventListener("storage", checkStatus);
        if (channel) supabase.removeChannel(channel);
        document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    if (showModal) {
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
  }, [showModal]);

  const fetchStatusFromDb = async () => {
    const storedUser = localStorage.getItem("shiroi_user");
    const userStr = localStorage.getItem("shiroi_user");
    if (!userStr) return;
    
    try {
      const userData = JSON.parse(userStr);
      // 🕵️‍♂️ LẤY NGÀY HIỆN TẠI (VIỆT NAM) 🇻🇳
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
      
      // Lấy nhật ký bốc quà MỚI NHẤT của User 🍀
      const { data: logs, error: logError } = await supabase
        .from('shiroi_xp_logs')
        .select('created_at')
        .eq('user_id', userData.id)
        .eq('type', 'lucky_draw')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (!logError && logs && logs.length > 0) {
        // So sánh ngày của log mới nhất với ngày hôm nay (VN) 🛡️
        const lastLogDate = new Date(logs[0].created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
        
        if (lastLogDate === today) {
           setCanDraw(false);
           setButtonText("HẸN MAI NHÉ");
        } else {
           setCanDraw(true);
           setButtonText("NHẬN QUÀ");
        }
      } else {
        setCanDraw(true);
        setButtonText("NHẬN QUÀ");
      }
    } catch (err) {
      console.warn("Lỗi đồng bộ LuckyDraw từ Nhật ký:", err);
    }
  };

  const checkStatus = () => {
    const storedUser = localStorage.getItem("shiroi_user");
    if (!storedUser) {
      setUser(null);
      return;
    }
    const userData = JSON.parse(storedUser);
    setUser(userData);

    // Kiểm tra xem đã bốc quà hôm nay chưa 🕵️‍♂️
    if (userData.last_lucky_draw) {
      const lastDraw = new Date(userData.last_lucky_draw);
      const today = new Date();
      const isSameDay = 
        lastDraw.getDate() === today.getDate() &&
        lastDraw.getMonth() === today.getMonth() &&
        lastDraw.getFullYear() === today.getFullYear();
      
      setCanDraw(!isSameDay);
    } else {
      setCanDraw(true);
    }
  };

  const handleDraw = async () => {
    if (!canDraw || isDrawing) return;

    try {
      setIsDrawing(true);
      const res = await performLuckyDrawAction();

      if (res.success) {
        setModalResult(res.xpGain);
        setShowModal(true);
        setCanDraw(false);

        // Cập nhật LocalStorage để đồng bộ UI ngay lập tức 🍀
        localStorage.setItem("shiroi_user", JSON.stringify(res.user));
        setUser(res.user);
        window.dispatchEvent(new Event("storage"));
      } else {
        let errorMsg = res.error || "Hệ thống bận, hãy thử lại sau! 🙏";
        
        if (errorMsg.includes("session") || errorMsg.includes("ID") || errorMsg.includes("defined") || errorMsg.includes("Vui lòng đăng nhập")) {
           errorMsg = "PHIÊN LÀM VIỆC ĐÃ HẾT HẠN HOẶC BỊ LỖI. VUI LÒNG TẢI LẠI TRANG HOẶC ĐĂNG XUẤT VÀ ĐĂNG NHẬP LẠI ĐỂ TIẾP TỤC NHÉ! 🛡️🍀";
        }
        
        setErrorMessage(errorMsg);
        setShowModal(true);
        if (res.error?.includes('đã cạn')) setCanDraw(false);
      }
    } catch (error) {
      console.error("Lỗi bốc quà:", error);
      setErrorMessage("Lỗi kết nối Thánh địa Shiroi! 🆘");
      setShowModal(true);
    } finally {
      setIsDrawing(false);
    }
  };

  if (!user) return null;

  return (
    <div className="relative group">
      <button
        onClick={handleDraw}
        className={`transition-all font-black text-[10px] uppercase tracking-[0.2em] active:scale-95 flex items-center gap-2 ${
          canDraw 
          ? "text-[#4caf50] hover:brightness-125"
          : "text-gray-500 cursor-default"
        }`}
      >
        <span className="text-sm opacity-80">{canDraw ? "🎁" : "💮"}</span>
        {canDraw ? (isDrawing ? "Đang mở..." : buttonText) : "Hẹn mai nhé"}
      </button>

      {/* MODAL KẾT QUẢ 🧧 */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[1000000]">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowModal(false); setModalResult(null); setErrorMessage(""); }}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />

            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.1, opacity: 0 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] bg-[#141814] border border-[#4caf50]/30 p-10 rounded-[40px] shadow-[0_50px_150px_rgba(0,0,0,1)] text-center overflow-hidden"
            >
              {/* Hiệu ứng tia sáng 🌟 */}
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#4caf50]/10 to-transparent pointer-events-none" />
              
              <div className="relative mb-8">
                 <div className="w-24 h-24 bg-[#4caf50]/10 rounded-[32px] flex items-center justify-center mx-auto border border-[#4caf50]/20 shadow-inner relative z-10">
                    <span className="text-5xl animate-bounce">{modalResult ? "🧧" : "⚠️"}</span>
                 </div>
                 {modalResult && <div className="absolute inset-0 bg-[#4caf50]/20 blur-3xl rounded-full"></div>}
              </div>

              {modalResult ? (
                <>
                  <h3 className="text-[#4caf50] font-black text-2xl uppercase tracking-[0.3em] mb-4">VẬN KHÍ TỐT!</h3>
                  <div className="text-white text-4xl font-black italic mb-6 animate-pulse">+{modalResult} XP</div>
                  <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest leading-relaxed mb-10">
                    Thánh tích của bạn đã được bồi đắp. <br/>Tiếp tục tu luyện nhé! 🍀
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-red-500 font-black text-xl uppercase tracking-widest mb-4">THÔNG BÁO</h3>
                  <p className="text-gray-300 font-bold text-sm leading-relaxed mb-10">{errorMessage}</p>
                </>
              )}

              <button
                onClick={() => { setShowModal(false); setModalResult(null); setErrorMessage(""); }}
                className="w-full py-5 bg-[#4caf50] text-[#0a0c0a] rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[#4caf50]/20"
              >
                XÁC NHẬN ✨
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
