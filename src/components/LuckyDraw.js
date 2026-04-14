"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { performLuckyDrawAction } from "@/lib/actions";

export default function LuckyDraw() {
  const [user, setUser] = useState(null);
  const [canDraw, setCanDraw] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalResult, setModalResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    checkStatus();
    window.addEventListener("storage", checkStatus);
    return () => window.removeEventListener("storage", checkStatus);
  }, []);

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
        const updatedUser = { 
          ...user, 
          xp: (user.xp || 0) + res.xpGain,
          last_lucky_draw: new Date().toISOString() 
        };
        localStorage.setItem("shiroi_user", JSON.stringify(updatedUser));
        setUser(updatedUser);
        window.dispatchEvent(new Event("storage"));
      } else {
        setErrorMessage(res.error || "Hệ thống bận, hãy thử lại sau! 🙏");
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
        className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-[20px] font-black text-[9px] sm:text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-2 border-2 relative active:scale-95 ${
          canDraw 
          ? "bg-gradient-to-br from-[#141814] to-black border-[#4caf50]/50 text-[#4caf50] hover:border-[#4caf50] hover:shadow-[0_0_30px_rgba(76,175,80,0.4)] shadow-xl"
          : "bg-[#141814] border-white/5 text-gray-500 cursor-default opacity-80"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">{canDraw ? "🎁" : "💮"}</span>
          {canDraw ? (
            <>{isDrawing ? "ĐANG MỞ..." : "BỐC QUÀ"}</>
          ) : (
            <>HẸN MAI NHÉ</>
          )}
        </div>
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
