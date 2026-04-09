'use client';

import React, { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { compressImageToWebP } from "../../../lib/imageOptimizer";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, Reorder, AnimatePresence } from "framer-motion";
import { AdminCard, AdminInput, AdminSelect, AdminButton } from "../../../components/admin/AdminCommon";

// TYPES 🕊️
interface Manga {
  id: string;
  title: string;
}

interface PageItem {
  id: string;
  type: 'existing' | 'new';
  data: any; // URL string or File object
}

interface ChapterData {
  id: string;
  title: string;
  chapter_number: number;
  pages: { image_url: string; page_number: number; id?: string }[];
}

export default function AdminUploadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedMangaId = searchParams.get("mangaId");
  const preSelectedChapterId = searchParams.get("chapterId");

  const [mangas, setMangas] = useState<Manga[]>([]);
  const [selectedMangaId, setSelectedMangaId] = useState<string>("");
  const [chapterNumber, setChapterNumber] = useState<string>("");
  const [chapterTitle, setChapterTitle] = useState<string>("");
  const [items, setItems] = useState<PageItem[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [existingChapterId, setExistingChapterId] = useState<string | null>(null);
  const [hasInitialLoaded, setHasInitialLoaded] = useState<boolean>(false);
  const [deleteStep, setDeleteStep] = useState<number>(1);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // CẢNH BÁO KHI RỜI TRANG ĐANG UPLOAD ⚠️
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (uploading) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [uploading]);

  useEffect(() => {
    const checkAuth = () => {
      const storedUser = localStorage.getItem('shiroi_user');
      if (!storedUser) {
        router.push('/login');
        return;
      }
      const user = JSON.parse(storedUser);
      const isAdmin = user.username.toUpperCase() === 'ADMIN' || user.username.toUpperCase() === 'SHIROIARIKA';
      
      if (!isAdmin) {
        router.push('/');
        return;
      }

      fetchMangas();
      if (preSelectedMangaId) setSelectedMangaId(preSelectedMangaId);
    };

    checkAuth();
  }, [preSelectedMangaId, router]);

  const fetchMangas = async () => {
    const { data } = await supabase.from("mangas").select("id, title").order("title");
    setMangas(data || []);
    if (data && data.length > 0 && !selectedMangaId && !preSelectedMangaId) {
       setSelectedMangaId(data[0].id);
    }
  };

  useEffect(() => {
    const checkExistingChapter = async () => {
      if (preSelectedChapterId && !hasInitialLoaded) {
          const { data } = await supabase.from("chapters").select("id, title, chapter_number, pages(id, image_url, page_number)").eq("id", preSelectedChapterId).single();
          if (data) {
            const typedData = data as unknown as ChapterData;
            setIsEditing(true);
            setExistingChapterId(typedData.id);
            setChapterNumber(typedData.chapter_number.toString());
            setChapterTitle(typedData.title || "");
            
            // Xử lý nạp ảnh ổn định 🛠️
            const existingPages: PageItem[] = typedData.pages
              .sort((a, b) => a.page_number - b.page_number)
              .map(p => ({ 
                type: 'existing', 
                data: p.image_url, 
                id: p.id || Math.random().toString(36).substr(2, 9) 
              }));

            setItems(existingPages);
            setHasInitialLoaded(true);
          }
      }
    };
    checkExistingChapter();
  }, [preSelectedChapterId, hasInitialLoaded]);

  useEffect(() => {
    const autoDetectChapter = async () => {
      if (!selectedMangaId || !chapterNumber || preSelectedChapterId) return;

      const { data } = await supabase
        .from("chapters")
        .select("id, title, pages(id, image_url, page_number)")
        .eq("manga_id", selectedMangaId)
        .eq("chapter_number", parseFloat(chapterNumber))
        .maybeSingle();

      if (data) {
        const typedData = data as unknown as ChapterData;
        setIsEditing(true);
        setExistingChapterId(typedData.id);
        const existingPages: PageItem[] = typedData.pages
          .sort((a, b) => a.page_number - b.page_number)
          .map(p => ({
            type: 'existing',
            data: p.image_url,
            id: p.id || Math.random().toString(36).substr(2, 9)
          }));
        setItems(existingPages);
        setMessage({ type: 'info', text: 'PHÁT HIỆN CHAPTER CŨ, ĐÃ NẠP DỮ LIỆU ĐỂ BẠN CHỈNH SỬA 🍀' });
      }
    };
    autoDetectChapter();
  }, [selectedMangaId, chapterNumber, preSelectedChapterId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMangaId || !chapterNumber) {
      setMessage({ type: "error", text: "VUI LÒNG NHẬP ĐỦ THÔNG TIN MANGA VÀ CHƯƠNG! 🍀" });
      return;
    }
    
    setUploading(true);
    setMessage({ type: "info", text: "ĐANG LƯU DỮ LIỆU XUỐNG CLOUD... ☁️" });

    try {
      let chapId = existingChapterId;
      const chapterPayload = { 
        manga_id: selectedMangaId, 
        chapter_number: parseFloat(chapterNumber), 
        title: chapterTitle
      };

      if (!isEditing) {
        const { data, error } = await supabase.from("chapters").insert(chapterPayload).select().single();
        if (error) throw error;
        chapId = data.id;
      } else {
        await supabase.from("chapters").update(chapterPayload).eq("id", chapId);
      }

      // Xử lý Pages (Atomic Sync 🚀)
      await supabase.from("pages").delete().eq("chapter_id", chapId);
      
      const total = items.length;
      const pagesToInsert: any[] = [];
      
      for (let i = 0; i < total; i++) {
        const item = items[i];
        let url = item.data;
        
        setProgress(Math.round(((i + 1) / total) * 100));

        if (item.type === 'new') {
          const compressed = await compressImageToWebP(item.data);
          const name = `${chapId}/${Date.now()}-${i}.webp`;
          
          const { error: uploadError } = await supabase.storage
            .from("manga_images")
            .upload(name, compressed, {
               contentType: 'image/webp',
               upsert: true
            });

          if (uploadError) {
             console.error("Lỗi Upload Storage:", uploadError);
             throw new Error(`Không thể tải ảnh ${i+1} lên kho lưu trữ: ${uploadError.message}`);
          }

          const { data: urlData } = supabase.storage.from("manga_images").getPublicUrl(name);
          url = urlData.publicUrl;
        }
        
        pagesToInsert.push({ 
           chapter_id: chapId, 
           image_url: url, 
           page_number: i + 1 
        });
      }
      
      await supabase.from("pages").insert(pagesToInsert);
      
      setMessage({ type: "success", text: "CẬP NHẬT THÀNH CÔNG! ĐANG CHUYỂN TRANG... 👋" });
      setTimeout(() => router.push(`/manga/${selectedMangaId}`), 1500);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleFinalDelete = async () => {
     const idToDel = preSelectedChapterId || existingChapterId;
     if (!idToDel) return;

     try {
        setUploading(true);
        setMessage({ type: "info", text: "💥 ĐANG XÓA DỮ LIỆU... Đừng thoát trang!" });
        await supabase.from('pages').delete().eq('chapter_id', idToDel);
        const { error } = await supabase.from('chapters').delete().eq('id', idToDel);
        if (error) throw error;
        setMessage({ type: "success", text: "✅ ĐÃ XÓA THÀNH CÔNG!" });
        setTimeout(() => router.push(`/manga/${selectedMangaId}`), 1000);
     } catch (err: any) {
        alert("Lỗi xóa: " + err.message);
        setDeleteStep(1);
     } finally {
        setUploading(false);
     }
  };

  return (
    <div className="min-h-screen bg-[#0a0c0a] text-white p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-10">
           <h1 className="text-2xl font-black uppercase tracking-[0.3em] flex items-center gap-3">
              {isEditing ? "CHỈNH SỬA CHƯƠNG" : "ĐĂNG CHƯƠNG MỚI"} <span className="text-[#4caf50] animate-pulse">🍀</span>
           </h1>
           <AdminButton variant="ghost" onClick={() => router.back()}>QUAY LẠI</AdminButton>
        </div>

        {message && (
          <div className={`mb-10 p-4 rounded-2xl border ${
            message.type === 'error' ? 'bg-red-500/5 border-red-500/20 text-red-500' : 
            'bg-[#4caf50]/5 border-[#4caf50]/20 text-[#4caf50]'
          } text-[10px] text-center font-black uppercase tracking-[0.2em] shadow-xl`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
            <AdminCard title="Thông tin cơ bản" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                  {preSelectedMangaId ? (
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-[#4caf50]/70 uppercase tracking-widest block pl-1">Tác phẩm đang chọn</label>
                        <div className="bg-[#1a1f1a] border border-[#4caf50]/20 p-3.5 rounded-xl text-sm font-black text-white shadow-inner truncate">
                           {mangas.find(m => m.id === selectedMangaId)?.title || "Đang tải tên truyện..."}
                        </div>
                     </div>
                  ) : (
                     <AdminSelect 
                        label="Chọn Tác phẩm" 
                        value={selectedMangaId} 
                        onChange={(e) => setSelectedMangaId(e.target.value)}
                        disabled={isEditing}
                        options={mangas.map(m => ({ value: m.id, label: m.title }))}
                     />
                  )}
                  <AdminInput 
                     label="Số Chương" 
                     type="number" 
                     step="any" 
                     value={chapterNumber} 
                     onChange={(e) => setChapterNumber(e.target.value)} 
                     placeholder="VD: 1, 1.5, 2..."
                     required
                  />
               </div>
               <div className="mt-6">
                  <AdminInput 
                     label="Tiêu đề chương (Tùy chọn)" 
                     value={chapterTitle} 
                     onChange={(e) => setChapterTitle(e.target.value)} 
                     placeholder="Nhập tên chương nếu có..."
                  />
               </div>
            </AdminCard>

           <AdminCard title={`Danh sách trang (${items.length}) - KÉO THẢ ĐỂ SẮP XẾP 👋`} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>}>
              <div 
                 className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6"
                 onDragOver={(e) => e.preventDefault()}
              >
                 <AnimatePresence>
                   {items.map((item, i) => (
                     <motion.div
                       key={item.id}
                       layout
                       drag
                       dragSnapToOrigin
                       dragElastic={0.1}
                       onDragEnd={(e, info) => {
                          const { x, y } = info.offset;
                          
                          // TÍNH TOÁN THEO GRID MẶC ĐỊNH 🛠️
                          const isMobile = window.innerWidth < 768;
                          const gridW = 180; // Chiều rộng cơ sở của 1 ô (tính cả gap)
                          const gridH = 260; // Chiều cao cơ sở của 1 ô
                          
                          const cols = isMobile ? 2 : 5;
                          const moveX = Math.round(x / gridW);
                          const moveY = Math.round(y / gridH);
                          
                          if (moveX !== 0 || moveY !== 0) {
                             const targetIndex = Math.max(0, Math.min(items.length - 1, i + moveX + (moveY * cols)));
                             if (targetIndex !== i) {
                                const newItems = [...items];
                                const dragged = newItems[i];
                                newItems.splice(i, 1);
                                newItems.splice(targetIndex, 0, dragged);
                                setItems(newItems);
                             }
                          }
                       }}
                       whileDrag={{ 
                          scale: 1.05, 
                          zIndex: 100,
                          rotate: 1,
                          boxShadow: "0 40px 80px rgba(0,0,0,0.8)",
                       }}
                       transition={{
                         layout: { type: "spring", stiffness: 450, damping: 40 }
                       }}
                       className="relative aspect-[2/3] bg-[#1a1f1a] border-2 border-white/5 rounded-3xl overflow-hidden group cursor-grab active:cursor-grabbing shadow-2xl"
                     >
                        <img 
                          src={item.type === 'new' ? URL.createObjectURL(item.data) : item.data} 
                          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all select-none pointer-events-none" 
                          alt=""
                          draggable={false}
                        />

                        {/* NÚT XEM THỬ CHUYÊN NGHIỆP 🔍 */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                           <button 
                             type="button"
                             onClick={(e) => {
                                e.stopPropagation();
                                const url = item.type === 'new' ? URL.createObjectURL(item.data) : item.data;
                                setPreviewUrl(url);
                             }}
                             className="p-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full text-white pointer-events-auto transform hover:scale-110 active:scale-95 transition-all shadow-2xl"
                           >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"/></svg>
                           </button>
                        </div>
                        
                        <div className="absolute top-4 left-4 bg-[#4caf50] text-[#0a0c0a] text-xs px-2.5 py-1 rounded-xl font-black shadow-lg z-10">
                          {i + 1}
                        </div>

                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all z-20">
                           <button 
                             type="button" 
                             onClick={(e) => {
                                e.stopPropagation();
                                setItems(prev => prev.filter(x => x.id !== item.id));
                             }} 
                             className="bg-red-500/90 hover:bg-red-500 p-2.5 rounded-2xl text-white shadow-xl backdrop-blur-md"
                           >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12"/></svg>
                           </button>
                        </div>

                        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/95 to-transparent pointer-events-none" />
                        <div className="absolute bottom-4 left-0 w-full text-center z-10">
                           <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">TRANG {i + 1}</span>
                        </div>
                     </motion.div>
                   ))}
                 </AnimatePresence>

                 {/* THÊM TRANG CARD */}
                 <label className="border-2 border-dashed border-[#2a332a] hover:border-[#4caf50]/50 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer aspect-[2/3] transition-all bg-black/20 hover:bg-black/40 group relative overflow-hidden">
                    <input type="file" multiple className="hidden" onChange={(e) => {
                       if (e.target.files) {
                          const files = Array.from(e.target.files).map(f => ({ type: 'new' as const, data: f, id: Math.random().toString(36).substr(2, 9) }));
                          setItems(prev => [...prev, ...files]);
                       }
                    }} />
                    <div className="p-5 bg-white/5 rounded-full group-hover:scale-110 transition-transform mb-4 shadow-inner border border-white/5">
                       <svg className="w-10 h-10 text-[#4caf50]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                    </div>
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-4 text-center">THÊM TRANG</span>
                 </label>
              </div>
           </AdminCard>

           <div className="pt-6 relative">
              {uploading && (
                 <div className="absolute -top-4 left-0 w-full h-1 bg-[#2a332a] rounded-full overflow-hidden">
                    <motion.div 
                       initial={{ width: 0 }}
                       animate={{ width: `${progress}%` }}
                       className="h-full bg-[#4caf50] shadow-[0_0_10px_rgba(76,175,80,0.5)]"
                    />
                 </div>
              )}
              <AdminButton type="submit" disabled={uploading}>
                 {uploading ? `ĐANG TẢI LÊN (${progress}%)` : (isEditing ? "CẬP NHẬT CHƯƠNG 👋" : "LƯU & ĐĂNG CHƯƠNG 👋")}
              </AdminButton>
           </div>
        </form>

        {isEditing && (
           <div className="mt-12 pt-12 border-t border-[#2a332a]">
              {deleteStep === 1 ? (
                <AdminButton variant="danger" onClick={() => setDeleteStep(2)}>GỠ BỎ CHƯƠNG TRUYỆN NÀY</AdminButton>
              ) : (
                <div className="bg-red-500/5 p-6 rounded-3xl border border-red-500/10 space-y-6 text-center shadow-2xl">
                   <p className="text-red-500 text-xs font-black uppercase tracking-[0.2em] animate-pulse">⚠️ CẢNH BÁO: HÀNH ĐỘNG NÀY KHÔNG THỂ KHÔI PHỤC ⚠️</p>
                   <div className="flex gap-4">
                      <AdminButton variant="ghost" className="flex-1" onClick={() => setDeleteStep(1)}>HUỶ BỎ</AdminButton>
                      <AdminButton variant="danger" className="flex-[2]" onClick={handleFinalDelete} disabled={uploading}>XÁC NHẬN XÓA VĨNH VIỄN</AdminButton>
                   </div>
                </div>
              )}
           </div>
        )}

        {/* PREVIEW MODAL (LIGHTBOX) 🔍 */}
        <AnimatePresence>
           {previewUrl && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setPreviewUrl(null)}
                className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
              >
                 <motion.img 
                   initial={{ scale: 0.9, opacity: 0 }}
                   animate={{ scale: 1, opacity: 1 }}
                   exit={{ scale: 0.9, opacity: 0 }}
                   src={previewUrl} 
                   className="max-w-full max-h-[95vh] object-contain rounded-xl shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/10" 
                   alt="Preview"
                 />
                 
                 <button className="absolute top-6 right-6 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-xl border border-white/20 transition-all">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                 </button>
              </motion.div>
           )}
        </AnimatePresence>
      </div>
    </div>
  );
}
