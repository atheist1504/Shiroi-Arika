'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminButton } from '@/components/admin/AdminCommon';
import { uploadImageAction } from '@/lib/actions';
import { optimizeImage } from '@/lib/cloudinary';

// 🚀 DND-KIT IMPORTS
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// 🍀 TIỆN ÍCH NÉN ẢNH (Bản siêu tối ưu 🚀)
const compressImageToWebP = async (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxWidth = 1600; // Giới hạn chiều rộng để tối ưu dung lượng
      const scale = Math.min(1, maxWidth / img.width);

      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        return reject("Lỗi khởi tạo Canvas");
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url); // Giải phóng bộ nhớ 🍀
        if (!blob) return reject("Nén ảnh thất bại");
        resolve(blob);
      }, 'image/webp', 0.85);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject("Không thể tải ảnh");
    };
  });
};

// 🖼️ COMPONENT TRANG TRUYỆN SORTABLE
function SortableItem({ id, item, index, onRemove, onPreview }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  // 💡 Logic hiển thị ảnh: Nếu là ảnh mới thì dùng preview (blob), nếu ảnh cũ thì dùng data (url)
  const displaySrc = item.type === 'new' ? item.preview : item.data;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="relative w-[120px] sm:w-[155px] aspect-[3/4] rounded-2xl overflow-hidden border border-white/5 bg-[#1a1a1a] group shadow-xl transition-colors hover:border-[#4caf50]/40"
    >
      <img src={optimizeImage(displaySrc, 200)} className="w-full h-full object-cover pointer-events-none" draggable="false" alt="" />
      
      <div 
        {...attributes} 
        {...listeners} 
        className="absolute inset-0 cursor-grab active:cursor-grabbing z-10"
      ></div>

      <button 
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPreview(displaySrc); }}
        className="absolute bottom-2 right-2 w-8 h-8 bg-black/60 backdrop-blur-md rounded-xl flex items-center justify-center text-[#4caf50] opacity-0 group-hover:opacity-100 transition-all hover:bg-[#4caf50] hover:text-black z-20 shadow-lg border border-white/10"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
      </button>

      <div className="absolute top-2 left-2 w-6 h-6 bg-black/90 rounded-lg flex items-center justify-center text-[10px] font-black text-[#4caf50] border border-white/10 shadow-lg z-20">{index + 1}</div>
      <button 
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(id); }} 
        className="absolute top-2 right-2 w-7 h-7 bg-red-500/80 backdrop-blur-md rounded-lg flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:scale-110 shadow-xl z-20 border border-white/10"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
    </div>
  );
}

export default function AdminUploadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedMangaId = searchParams.get('mangaId');
  const preSelectedChapterId = searchParams.get('chapterId');

  const [mangas, setMangas] = useState<any[]>([]);
  const [selectedMangaId, setSelectedMangaId] = useState(preSelectedMangaId || '');
  const [chapterNumber, setChapterNumber] = useState('');
  const [chapterTitle, setChapterTitle] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<{type: 'error' | 'success' | 'info', text: string} | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [existingChapterId, setExistingChapterId] = useState<string | null>(preSelectedChapterId);
  const [deleteStep, setDeleteStep] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetchMangas();
    if (preSelectedChapterId) { loadChapterData(preSelectedChapterId); setIsEditing(true); }
  }, [preSelectedChapterId]);

  useEffect(() => { if (preSelectedMangaId) setSelectedMangaId(preSelectedMangaId); }, [preSelectedMangaId]);

  const fetchMangas = async () => {
    const { data } = await supabase.from('mangas').select('id, title').order('title');
    setMangas(data || []);
  };

  const loadChapterData = async (id: string) => {
    const { data: chap } = await supabase.from('chapters').select('*').eq('id', id).single();
    if (chap) { setChapterNumber(chap.chapter_number.toString()); setChapterTitle(chap.title || ''); setSelectedMangaId(chap.manga_id); }
    const { data: pgs } = await supabase.from('pages').select('id, image_url, page_number').eq('chapter_id', id).order('page_number');
    if (pgs) {
        const r2Url = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '';
        const cleanR2Url = r2Url.endsWith('/') ? r2Url.slice(0, -1) : r2Url;

        setItems(pgs.map(p => {
            let finalData = p.image_url;
            if (finalData && finalData.includes('undefined/')) {
                finalData = finalData.replace(/.*undefined\//, `${cleanR2Url}/`);
            }
            return { id: p.id, data: finalData, type: 'existing' };
        }));
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setMessage({ type: 'info', text: `ĐANG XỬ LÝ ${files.length} ẢNH... ⏳` });
    
    // Tối ưu: Dùng ObjectURL thay vì Base64 để tiết kiệm RAM 🍀
    const newItems = files.map((file, idx) => ({
      id: `new-${Date.now()}-${idx}-${Math.random()}`,
      file, 
      preview: URL.createObjectURL(file),
      type: 'new'
    }));

    setItems(prev => [...prev, ...newItems]);
    setMessage(null);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.findIndex((item) => item.id === active.id);
        const newIndex = prev.findIndex((item) => item.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const removeItem = (id: string) => {
    setItems(prev => {
      const itemToDrop = prev.find(i => i.id === id);
      if (itemToDrop?.preview) URL.revokeObjectURL(itemToDrop.preview); // Dọn dẹp bộ nhớ 🍀
      return prev.filter(i => i.id !== id);
    });
  };

  const handleFinalDelete = async () => {
     const idToDel = preSelectedChapterId || existingChapterId;
     if (!idToDel) return;
     try {
        setUploading(true);
        setMessage({ type: "info", text: "💥 ĐANG XÓA..." });
        await supabase.from('pages').delete().eq('chapter_id', idToDel);
        await supabase.from('chapters').delete().eq('id', idToDel);
        setMessage({ type: "success", text: "✅ XÓA THÀNH CÔNG!" });
        setTimeout(() => router.push(`/manga/${selectedMangaId}`), 1000);
     } catch (err: any) { alert(err.message); } finally { setUploading(false); }
  };

  const handleUpload = async () => {
    if (!selectedMangaId || !chapterNumber) { 
      setMessage({ type: "error", text: "CHƯA NHẬP ĐỦ THÔNG TIN! 🍀" }); 
      return; 
    }
    
    setUploading(true); 
    setProgress(0);
    
    try {
      let chapId = existingChapterId;
      const chapterPayload = { 
        manga_id: selectedMangaId, 
        chapter_number: parseFloat(chapterNumber), 
        title: chapterTitle 
      };

      if (!isEditing) {
        const { data: existingChap } = await supabase
          .from("chapters")
          .select("id")
          .eq("manga_id", selectedMangaId)
          .eq("chapter_number", parseFloat(chapterNumber))
          .single();

        if (existingChap) {
          chapId = existingChap.id;
          await supabase.from("chapters").update(chapterPayload).eq("id", chapId);
        } else {
          const { data, error } = await supabase.from("chapters").insert(chapterPayload).select().single();
          if (error) throw error; 
          chapId = data.id;
        }
      } else { 
        await supabase.from("chapters").update(chapterPayload).eq("id", chapId); 
      }

      await supabase.from("pages").delete().eq("chapter_id", chapId);
      
      const pagesToInsert = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        let finalUrl = "";

        if (item.type === 'new') {
          try {
            // Sử dụng bộ nén siêu tối ưu (maxWidth 1600) 🍀
            const compressed = await compressImageToWebP(item.file);
            const formData = new FormData();
            formData.append('file', compressed);
            formData.append('fileName', `chapters/${chapId}/${Date.now()}-${i}.webp`);
            
            const result = await uploadImageAction(formData);
            
            if (!result || !result.success || !result.url) {
              throw new Error(result?.error || `Upload thất bại tại trang ${i + 1}`);
            }

            // 🚨 CHỐT CHẶN CUỐI: Kiểm tra URL hợp lệ
            if (result.url.includes("undefined")) {
              throw new Error("Hệ thống trả về URL không hợp lệ (undefined)! Vui lòng kiểm tra cấu hình R2.");
            }

            finalUrl = result.url;
          } catch (uploadErr: any) {
            console.error(`Lỗi tại ảnh index ${i}:`, uploadErr);
            throw new Error(`Sự cố tại trang ${i + 1}: ${uploadErr.message}`);
          }
        } else {
          finalUrl = item.data;
        }

        pagesToInsert.push({ 
          chapter_id: chapId, 
          image_url: finalUrl, 
          page_number: i + 1 
        });

        setProgress(Math.round(((i + 1) / items.length) * 100));
      }

      if (pagesToInsert.length === 0) {
        throw new Error("Không có dữ liệu trang để lưu! Vui lòng chọn ít nhất 1 ảnh.");
      }

      const { error: insertError } = await supabase.from("pages").insert(pagesToInsert);
      if (insertError) throw insertError;

      setMessage({ type: "success", text: "🚀 XUẤT BẢN THÀNH CÔNG!" });
      setTimeout(() => router.push(`/manga/${selectedMangaId}`), 1000);
    } catch (err: any) { 
      setMessage({ type: "error", text: err.message });
      alert(`QUÁ TRÌNH THẤT BẠI: ${err.message}`); 
    } finally { 
      setUploading(false); 
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0c0a] text-white p-4 sm:p-8 font-sans">
      <div className="max-w-6xl mx-auto pb-40">
        
        <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
           <h1 className="text-[12px] font-black uppercase tracking-[0.5em] flex items-center gap-3">
              <span className="bg-[#4caf50] text-black px-2 py-0.5 rounded-sm">ADMIN</span>
              {isEditing ? "CHỈNH SỬA" : "ĐĂNG CHƯƠNG"} <span className="text-[#4caf50]">🍀</span>
           </h1>
           <AdminButton variant="ghost" onClick={() => router.back()} className="text-[9px] opacity-50">QUAY LẠI</AdminButton>
        </div>

        {message && <div className="mb-8 p-4 rounded-xl border font-black uppercase text-[10px] tracking-widest animate-fade-in bg-white/5 border-white/10 text-[#4caf50]">{message.text}</div>}

        <div className="space-y-12">
           <div className="bg-white/[0.02] p-6 rounded-3xl border border-white/5 shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                 <div className="md:col-span-12 lg:col-span-6 space-y-2">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Bộ manga</label>
                    <div className="p-4 rounded-2xl bg-black border border-white/5 shadow-inner">
                       <p className="text-sm font-black text-[#4caf50] uppercase truncate">{mangas.find(m => m.id === selectedMangaId)?.title || "..."}</p>
                    </div>
                 </div>
                 <div className="md:col-span-4 lg:col-span-2 space-y-2">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Số chương</label>
                    <input type="number" step="0.1" value={chapterNumber} onChange={(e) => setChapterNumber(e.target.value)} className="w-full bg-black border border-white/10 rounded-2xl p-4 text-sm font-black text-[#4caf50] outline-none focus:border-[#4caf50]" placeholder="1" />
                 </div>
                 <div className="md:col-span-8 lg:col-span-4 space-y-2">
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest pl-1">Tên chương</label>
                    <input type="text" value={chapterTitle} onChange={(e) => setChapterTitle(e.target.value)} className="w-full bg-black border border-white/10 rounded-2xl p-4 text-sm font-black outline-none focus:border-[#4caf50]" placeholder="Nội dung tùy chọn..." />
                 </div>
              </div>
           </div>

           <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                 <h2 className="text-[11px] font-black text-gray-600 uppercase tracking-widest leading-none">CÁC TRANG TRUYỆN ({items.length})</h2>
                 <div className="flex gap-4">
                    {items.length > 0 && (
                      <>
                        <button onClick={() => setItems(prev => [...prev].reverse())} className="text-[9px] font-black text-[#4caf50]/50 hover:text-[#4caf50] transition-colors uppercase flex items-center gap-1.5">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          Đảo ngược
                        </button>
                        <button onClick={() => setItems([])} className="text-[9px] font-black text-red-500/30 hover:text-red-500 transition-colors uppercase">Dọn sạch</button>
                      </>
                    )}
                 </div>
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                 <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
                    <div className="flex flex-wrap gap-5">
                       {items.map((item, index) => (
                          <SortableItem key={item.id} id={item.id} item={item} index={index} onRemove={removeItem} onPreview={setPreviewImage} />
                       ))}
                       <div className="relative w-[120px] sm:w-[155px] aspect-[3/4] rounded-2xl border-2 border-dashed border-white/5 hover:border-[#4caf50]/30 transition-all flex flex-col items-center justify-center gap-3 bg-white/[0.01] hover:bg-[#4caf50]/5 cursor-pointer">
                          <input type="file" multiple accept="image/*" onChange={onFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                          <div className="w-10 h-10 rounded-full bg-[#4caf50]/10 flex items-center justify-center text-[#4caf50]"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                          <span className="text-[9px] font-black text-gray-600 uppercase">Thêm trang</span>
                       </div>
                    </div>
                 </SortableContext>
              </DndContext>
           </div>
        </div>

        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-6">
           <div className="p-4 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl flex flex-col gap-4">
              {uploading && (
                <div className="space-y-2 px-1">
                   <div className="flex justify-between text-[10px] font-black text-[#4caf50] uppercase tracking-widest"><span>Đang tải...</span><span>{progress}%</span></div>
                   <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-[#4caf50] transition-all duration-300" style={{ width: `${progress}%` }}></div></div>
                </div>
              )}
              <button 
                onClick={handleUpload} 
                disabled={uploading || items.length === 0} 
                className={`w-full h-14 rounded-2xl font-black text-[11px] tracking-[0.4em] uppercase transition-all active:scale-95 ${uploading || items.length === 0 ? 'bg-white/5 text-white/20' : 'bg-[#4caf50] text-black hover:bg-[#5fd364] shadow-xl shadow-[#4caf50]/20'}`}
              >
                 {uploading ? 'ĐANG XỬ LÝ...' : 'XUẤT BẢN NGAY 🚀'}
              </button>
           </div>
        </div>

        {isEditing && (
           <div className="mt-20 flex justify-center">
              {deleteStep === 0 ? (
                 <button onClick={() => setDeleteStep(1)} className="text-[10px] font-black text-red-500/20 hover:text-red-500 uppercase tracking-widest transition-colors py-4 px-8 border border-white/5 rounded-xl">Xóa chương khỏi hệ thống</button>
              ) : (
                 <div className="flex items-center gap-4 bg-red-500/10 p-4 rounded-3xl border border-red-500/20 animate-shake">
                    <span className="text-[10px] font-black text-red-500 uppercase">Chắc chắn xóa?</span>
                    <button onClick={() => setDeleteStep(0)} className="px-6 py-2 bg-white/5 rounded-xl text-[9px] font-black uppercase">Không</button>
                    <button onClick={handleFinalDelete} className="px-6 py-2 bg-red-500 text-white rounded-xl text-[9px] font-black uppercase">Xóa vĩnh viễn</button>
                 </div>
              )}
           </div>
        )}

        {previewImage && (
          <div className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 sm:p-20 animate-fade-in" onClick={() => setPreviewImage(null)}>
             <button className="absolute top-6 right-6 w-12 h-12 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-white transition-all z-10">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
             </button>
             <img src={optimizeImage(previewImage, 1200)} className="max-w-[85vw] max-h-[85vh] object-contain rounded-lg shadow-[0_40px_100px_rgba(0,0,0,0.8)] animate-zoom-in" alt="Preview" onClick={(e) => e.stopPropagation()} />
             <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-black/40 border border-white/5 backdrop-blur-md rounded-2xl text-[10px] font-black text-gray-400 uppercase tracking-widest">Click ra ngoài để đóng</div>
          </div>
        )}
      </div>
    </div>
  );
}
