'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminButton } from '@/components/admin/AdminCommon';
import { uploadToR2 } from '@/lib/r2';

// 🚀 DND-KIT IMPORTS
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// 🍀 TIỆN ÍCH NÉN ẢNH
const compressImageToWebP = async (base64Str: string): Promise<Blob> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      canvas.toBlob((blob) => resolve(blob!), 'image/webp', 0.8);
    };
  });
};

// 🖼️ COMPONENT TRANG TRUYỆN SORTABLE
function SortableItem({ id, item, index, onRemove }: any) {
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

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className="relative w-[120px] sm:w-[155px] aspect-[3/4] rounded-2xl overflow-hidden border border-white/5 bg-[#1a1a1a] group cursor-grab active:cursor-grabbing hover:border-[#4caf50]/30 transition-colors"
    >
      <img src={item.data} className="w-full h-full object-cover pointer-events-none" draggable="false" alt="" />
      <div className="absolute top-2 left-2 w-6 h-6 bg-black/90 rounded-lg flex items-center justify-center text-[10px] font-black text-[#4caf50] border border-white/10 shadow-lg">{index + 1}</div>
      <button 
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(id); }} 
        className="absolute top-2 right-2 w-7 h-7 bg-red-500 rounded-lg flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-xl z-20"
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

  // DND SENSORS
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
       setItems(pgs.map(p => ({ id: p.id, data: p.image_url, type: 'existing' })));
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setItems(prev => [...prev, { id: `new-${Date.now()}-${Math.random()}`, data: ev.target?.result, type: 'new' }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setItems((prev) => {
        const oldIndex = prev.findIndex((item) => item.id === active.id);
        const newIndex = prev.findIndex((item) => item.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

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
    if (!selectedMangaId || !chapterNumber) { setMessage({ type: "error", text: "CHƯA NHẬP ĐỦ THÔNG TIN! 🍀" }); return; }
    setUploading(true); setProgress(0);
    try {
      let chapId = existingChapterId;
      const chapterPayload = { manga_id: selectedMangaId, chapter_number: parseFloat(chapterNumber), title: chapterTitle };
      if (!isEditing) {
        const { data, error } = await supabase.from("chapters").insert(chapterPayload).select().single();
        if (error) throw error; chapId = data.id;
      } else { await supabase.from("chapters").update(chapterPayload).eq("id", chapId); }
      await supabase.from("pages").delete().eq("chapter_id", chapId);
      const total = items.length;
      let completedCount = 0;
      const pagesToInsert = await Promise.all(items.map(async (item, idx) => {
        let finalUrl = item.data;
        if (item.type === 'new') {
          const compressed = await compressImageToWebP(item.data);
          finalUrl = await uploadToR2(compressed, `chapters/${chapId}/${Date.now()}-${idx}.webp`);
        }
        completedCount++; setProgress(Math.round((completedCount / total) * 100));
        return { chapter_id: chapId, image_url: finalUrl, page_number: idx + 1 };
      }));
      await supabase.from("pages").insert(pagesToInsert);
      setMessage({ type: "success", text: "🚀 XUẤT BẢN THÀNH CÔNG!" });
      setTimeout(() => router.push(`/manga/${selectedMangaId}`), 1000);
    } catch (err: any) { alert(err.message); } finally { setUploading(false); }
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
           {/* THÔNG TIN */}
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

           {/* 🖼️ DANH SÁCH ẢNH - DND-KIT EDITION */}
           <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                 <h2 className="text-[11px] font-black text-gray-600 uppercase tracking-widest leading-none">CÁC TRANG TRUYỆN ({items.length})</h2>
                 {items.length > 0 && <button onClick={() => setItems([])} className="text-[9px] font-black text-red-500/30 hover:text-red-500 transition-colors uppercase">Dọn sạch</button>}
              </div>

              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                 <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
                    <div className="flex flex-wrap gap-5">
                       {items.map((item, index) => (
                          <SortableItem key={item.id} id={item.id} item={item} index={index} onRemove={removeItem} />
                       ))}
                       
                       {/* NÚT THÊM */}
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

        {/* NÚT ĐĂNG - FLOATING */}
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

      </div>
    </div>
  );
}
