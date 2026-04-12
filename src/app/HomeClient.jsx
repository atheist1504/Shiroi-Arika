"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { optimizeImage } from "@/lib/cloudinary";

export default function HomeClient({ initialFeatured, initialLatest, totalCount, currentPage, pageSize }) {
  const [featured, setFeatured] = useState(initialFeatured && initialFeatured.length > 0 ? initialFeatured : initialLatest.slice(0, 5));
  const [activeSlide, setActiveSlide] = useState(0);
  const totalPages = Math.ceil(totalCount / pageSize);

  // Tự động chuyển slide sau mỗi 5 giây
  useEffect(() => {
    if (featured.length === 0) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % featured.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [featured.length]);

  return (
    <main className="relative overflow-x-hidden min-h-screen">
      {/* 🌑 SHIROI AMBIENCE - GREY & WHITE GLOWS 🍀 */}
      <div className="absolute top-[-5%] left-[10%] w-[80%] h-[40%] bg-white/[0.03] rounded-full blur-[180px] pointer-events-none" />
      <div className="absolute top-[30%] right-[-5%] w-[40%] h-[50%] bg-[#ffffff]/[0.02] rounded-full blur-[150px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[10%] left-[-10%] w-[50%] h-[50%] bg-[#4caf50]/[0.02] rounded-full blur-[150px] pointer-events-none" />
      
      {/* LỚP PHỦ HẠT SIÊU MỊN */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none z-0" />

      <div className="pt-24 relative z-10" />

      {/* FEATURED BANNER - SIÊU PHẨM SHIROI (Chỉ hiện ở trang 1) 🍀 */}
      {currentPage === 1 && featured.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 mb-16 relative group/banner">
            <div className="relative md:aspect-[21/9] min-h-[400px] md:min-h-0 w-full rounded-3xl overflow-hidden glass shadow-2xl border border-white/5">
                <AnimatePresence mode="wait">
                    {featured[activeSlide] && (
                    <motion.div
                        key={featured[activeSlide].id}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30 }}
                        transition={{ duration: 0.6, ease: "circOut" }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(e, { offset, velocity }) => {
                            const swipe = offset.x;
                            if (swipe < -50) {
                                setActiveSlide((prev) => (prev + 1) % featured.length);
                            } else if (swipe > 50) {
                                setActiveSlide((prev) => (prev - 1 + featured.length) % featured.length);
                            }
                        }}
                        className="absolute inset-0 cursor-grab active:cursor-grabbing select-none z-10"
                    >
                        {/* BACKGROUND LAYER */}
                        <div className="absolute inset-0">
                            <img 
                                src={optimizeImage(featured[activeSlide].cover_image, 1000)} 
                                className="w-full h-full object-cover scale-110 blur-xl opacity-20"
                                alt=""
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0c0a] via-[#0a0c0a]/60 to-transparent" />
                        </div>

                        {/* CONTENT LAYER */}
                        <div className="relative h-full flex items-center p-8 md:p-14">
                            <div className="flex flex-col md:flex-row gap-8 items-center w-full">
                                <div className="hidden md:block w-48 lg:w-56 shrink-0 aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 group-hover/banner:scale-105 transition-transform duration-500">
                                   <img src={optimizeImage(featured[activeSlide].cover_image, 600)} className="w-full h-full object-cover" alt="" />
                                </div>
                                <div className="flex-1 space-y-4 text-center md:text-left">
                                    <div className="flex flex-wrap justify-center md:justify-start gap-2">
                                        {(featured[activeSlide].genres || []).slice(0, 3).map(g => (
                                            <span key={g} className="px-3 py-1 bg-[#4caf50]/10 border border-[#4caf50]/20 rounded-full text-[9px] font-black text-[#4caf50] uppercase tracking-widest">{g}</span>
                                        ))}
                                        <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[9px] font-black text-amber-500 uppercase tracking-widest animate-pulse">SIÊU PHẨM</span>
                                    </div>
                                    <h2 className="text-2xl md:text-5xl font-black text-white leading-tight md:leading-none tracking-tighter drop-shadow-2xl">{featured[activeSlide].title}</h2>
                                    <p className="text-gray-400 text-xs md:text-sm font-medium line-clamp-3 md:line-clamp-2 max-w-xl">
                                        {featured[activeSlide].description || "Đang cập nhật nội dung cho bộ truyện này. Shiroi Arika hứa hẹn mang lại trải nghiệm đọc tốt nhất cho bạn."}
                                    </p>
                                    <div className="flex justify-center md:justify-start pt-4">
                                        <Link href={`/manga/${featured[activeSlide].id}`} className="px-10 py-3.5 bg-[#4caf50] text-[#0a0c0a] rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_10px_30px_rgba(76,175,80,0.3)] hover:scale-105 active:scale-95 transition-all">ĐỌC NGAY 🍀</Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                    )}
                </AnimatePresence>

                {/* DOTS NAVIGATION - Moved inside the relative container to prevent leaking 🍀 */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center justify-center gap-3 z-30">
                    {featured.map((_, idx) => (
                        <button 
                            key={idx}
                            onClick={(e) => {
                                e.stopPropagation();
                                setActiveSlide(idx);
                            }}
                            className={`group relative flex items-center justify-center p-2 transition-all`}
                            aria-label={`Go to slide ${idx + 1}`}
                        >
                            <div className={`h-1.5 rounded-full transition-all duration-300 ${idx === activeSlide ? 'w-8 bg-[#4caf50]' : 'w-2 bg-white/20 group-hover:bg-white/40'}`} />
                        </button>
                    ))}
                </div>
            </div>
        </section>
      )}

      <div className="max-w-6xl mx-auto px-4 pb-8 mt-4">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-1.5 h-7 bg-gradient-to-b from-[#4caf50] to-[#2e7d32] rounded-full shadow-[0_0_15px_rgba(76,175,80,0.5)]"></div>
          <h2 className="text-2xl font-black text-gray-100 uppercase tracking-tighter">Truyện mới cập nhật</h2>
        </div>

        {initialLatest.length === 0 ? (
          <div className="text-center py-20 text-gray-500 glass rounded-2xl border-dashed border-2 border-[#2a332a]">
            Kho truyện hiện đang trống. Đang chờ những siêu phẩm đầu tiên!
          </div>
        ) : (
          <>
            <motion.div 
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1, transition: { staggerChildren: 0.03 } }
              }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6"
            >
              <AnimatePresence>
                {initialLatest.map((manga) => (
                  <motion.div
                    key={manga.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <Link href={`/manga/${manga.id}`} className="group relative block rounded-xl overflow-hidden glass-card transition-all duration-500">
                      <div className="aspect-[2/3] w-full relative bg-[#141814]">
                        {manga.cover_image ? (
                          <img
                            src={optimizeImage(manga.cover_image, 400)}
                            alt={manga.title}
                            className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center w-full h-full text-gray-600 bg-black/40">
                            <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            <span className="text-xs">Không có ảnh bìa</span>
                          </div>
                        )}
                        
                        {(manga.chapters || []).length > 0 && (
                          <div className="absolute top-2 right-2 z-20">
                            <div className="bg-[#4caf50] text-[#0a0c0a] px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-xl border border-[#4caf50]/20">
                              Ch. {Math.max(...manga.chapters.map(c => c.chapter_number))}
                            </div>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
                        
                        <div className="absolute bottom-0 left-0 w-full p-4 z-30">
                          <h3 className="font-bold text-white text-sm md:text-base line-clamp-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-tight">
                            <span>{manga.title}</span>
                          </h3>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {/* PHÂN TRANG 1, 2, 3... 🍀 */}
            {totalPages > 1 && (
              <div className="mt-16 flex flex-wrap justify-center items-center gap-2">
                <Link
                  href={`/?page=${Math.max(1, currentPage - 1)}`}
                  className={`px-4 py-2 rounded-xl font-bold text-[10px] uppercase transition-all border ${
                    currentPage === 1 
                    ? 'opacity-30 pointer-events-none border-white/5' 
                    : 'bg-[#141814] border-white/5 text-gray-400 hover:border-[#4caf50] hover:text-[#4caf50]'
                  }`}
                >
                  TRƯỚC
                </Link>

                {[...Array(totalPages)].map((_, i) => {
                  const p = i + 1;
                  // Hiển thị tối đa 5 trang xung quanh trang hiện tại
                  if (p === 1 || p === totalPages || (p >= currentPage - 2 && p <= currentPage + 2)) {
                    return (
                      <Link
                        key={p}
                        href={`/?page=${p}`}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl font-black text-xs transition-all border ${
                          currentPage === p
                          ? 'bg-[#4caf50] border-[#4caf50] text-[#0a0c0a] shadow-lg shadow-[#4caf50]/20 scale-110'
                          : 'bg-[#141814] border-white/5 text-gray-500 hover:border-[#4caf50] hover:text-[#4caf50]'
                        }`}
                      >
                        {p}
                      </Link>
                    );
                  }
                  if (p === currentPage - 3 || p === currentPage + 3) {
                    return <span key={p} className="text-gray-700">...</span>;
                  }
                  return null;
                })}

                <Link
                  href={`/?page=${Math.min(totalPages, currentPage + 1)}`}
                  className={`px-4 py-2 rounded-xl font-bold text-[10px] uppercase transition-all border ${
                    currentPage === totalPages 
                    ? 'opacity-30 pointer-events-none border-white/5' 
                    : 'bg-[#141814] border-white/5 text-gray-400 hover:border-[#4caf50] hover:text-[#4caf50]'
                  }`}
                >
                  SAU
                </Link>
              </div>
            )}
            
            <div className="text-center mt-6">
               <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">TRANG {currentPage} / {totalPages} (TỔNG {totalCount} TRUYỆN)</span>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
