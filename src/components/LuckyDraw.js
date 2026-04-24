"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { performLuckyDrawAction } from "@/lib/actions";
import { createPortal } from "react-dom";

export default function LuckyDraw() {
  const [user, setUser] = useState(null);
  const [canDraw, setCanDraw] = useState(false);
  const [buttonText, setButtonText] = useState("Bốc quà");
  const [isDrawing, setIsDrawing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalResult, setModalResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true); // 🚀 Trạng thái đồng bộ ban đầu

  useEffect(() => {
    // 🚀 CHỈ KIỂM TRA LOCAL ĐỂ LẤY THÔNG TIN USER, KHÔNG SET canDraw TẠI ĐÂY ĐỂ TRÁNH FLICKER
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
            .channel(`luckydraw_sync_${u.id}_${Math.random().toString(36).substring(7)}`)
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
    } finally {
      setIsSyncing(false);
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
        className={`relative transition-all group/luckydraw active:scale-90 ${
          canDraw 
          ? "cursor-pointer"
          : "cursor-default opacity-60"
        }`}
      >
        <div className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border transition-all duration-500 ${
            canDraw && !isSyncing
            ? "bg-[#4caf50]/5 border-[#4caf50]/20 hover:border-[#4caf50] hover:bg-[#4caf50]/10 shadow-[0_0_20px_rgba(76,175,80,0.05)] hover:shadow-[0_0_25px_rgba(76,175,80,0.15)]" 
            : "bg-white/5 border-white/5"
        }`}>
            <span className={`text-base transition-transform duration-500 ${canDraw && !isSyncing ? 'group-hover/luckydraw:scale-125 group-hover/luckydraw:rotate-12' : ''}`}>
                {isSyncing ? "🌀" : (canDraw ? (isDrawing ? "🌀" : "🎁") : "💮")}
            </span>
            <div className="flex flex-col items-start leading-none">
                <span className={`text-[8px] font-black uppercase tracking-[0.2em] mb-0.5 ${canDraw && !isSyncing ? 'text-[#4caf50]' : 'text-gray-600'}`}>
                    {isSyncing ? "Đang check" : (canDraw ? "Vận khí" : "Hết lượt")}
                </span>
                <span className={`text-[9px] font-black uppercase tracking-widest ${canDraw && !isSyncing ? 'text-white' : 'text-gray-500'}`}>
                    {isSyncing ? "XIN ĐỢI..." : (canDraw ? (isDrawing ? "Đang chiêu..." : "BỐC QUÀ") : "HẸN MAI NHÉ")}
                </span>
            </div>
        </div>
        {canDraw && !isSyncing && !isDrawing && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#4caf50] rounded-full animate-ping"></div>
        )}
      </button>

      {isMounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
            {showModal && (
            <div className="fixed inset-0 z-[10000000] flex items-center justify-center p-4 overflow-x-hidden overflow-y-auto">
                <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => { if (!isDrawing) { setShowModal(false); setModalResult(null); setErrorMessage(""); } }}
                className="fixed inset-0 bg-black/95 backdrop-blur-2xl"
                />

                <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 40 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: -40 }}
                className="relative w-full max-w-[420px] bg-[#0f120f] border-2 border-[#4caf50]/30 p-8 sm:p-12 rounded-[56px] shadow-[0_50px_150px_rgba(0,0,0,0.9)] text-center overflow-hidden flex flex-col items-center"
                >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] h-full bg-[radial-gradient(circle_at_50%_0%,rgba(76,175,80,0.2)_0%,transparent_70%)] pointer-events-none" />
                
                <motion.div 
                    animate={{ 
                        y: [0, -10, 0],
                        rotate: [0, 5, -5, 0]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="relative mb-10"
                >
                    <div className="w-28 h-28 bg-gradient-to-br from-[#4caf50]/20 to-transparent rounded-[36px] flex items-center justify-center mx-auto border-2 border-[#4caf50]/30 shadow-[0_0_50px_rgba(76,175,80,0.2)] relative z-10 overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        <span className="text-6xl">{modalResult ? "🧧" : "⚠️"}</span>
                    </div>
                    {modalResult && (
                        <div className="absolute inset-0 bg-[#4caf50]/30 blur-[60px] rounded-full -z-10 animate-pulse"></div>
                    )}
                </motion.div>

                {modalResult ? (
                    <>
                    <h3 className="text-[#4caf50] font-black text-3xl uppercase tracking-[0.3em] mb-4 drop-shadow-[0_0_15px_rgba(76,175,80,0.5)]">PHÚ QUÝ!</h3>
                    <div className="flex flex-col items-center gap-2 mb-8">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.5em]">TÀI SẢN NHẬN ĐƯỢC</span>
                        <div className="text-white text-5xl font-black italic tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-[#4caf50] drop-shadow-2xl">
                            +{modalResult} XP
                        </div>
                    </div>
                    
                    <p className="text-gray-400 font-bold text-[11px] uppercase tracking-[0.2em] leading-loose mb-10 max-w-[280px] mx-auto">
                        Thánh tích của bạn đã được bồi đắp. <br/>
                        <span className="text-[#4caf50]">Tiếp tục tu luyện nhé!</span> 🍀
                    </p>
                    </>
                ) : (
                    <>
                    <h3 className="text-red-500 font-black text-xl uppercase tracking-[0.2em] mb-4">THÔNG BÁO</h3>
                    <p className="text-gray-300 font-bold text-xs leading-relaxed mb-10 px-4">{errorMessage}</p>
                    </>
                )}

                <button
                    onClick={() => { setShowModal(false); setModalResult(null); setErrorMessage(""); }}
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
}
