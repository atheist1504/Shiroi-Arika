'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminButton, AdminInput, AdminCard } from '@/components/admin/AdminCommon';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { uploadToR2 } from '@/lib/r2';

// 🍀 TIỆN ÍCH NÉN ẢNH SANG WEBP ĐỂ QUÁ TẢI CŨNG KHÔNG SAO
const compressImageToWebP = async (base64Str: string): Promise<Blob> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        resolve(blob!);
      }, 'image/webp', 0.8); // Nén 80% chất lượng để tiết kiệm dung lượng
    };
  });
};

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

  useEffect(() => {
    fetchMangas();
    if (preSelectedChapterId) {
      loadChapterData(preSelectedChapterId);
      setIsEditing(true);
    }
  }, [preSelectedChapterId]);

  const fetchMangas = async () => {
    const { data } = await supabase.from('mangas').select('id, title').order('title');
    setMangas(data || []);
  };

  const loadChapterData = async (id: string) => {
    const { data: chap } = await supabase.from('chapters').select('*').eq('id', id).single();
    if (chap) {
      setChapterNumber(chap.chapter_number.toString());
      setChapterTitle(chap.title || '');
      setSelectedMangaId(chap.manga_id);
    }
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

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);
    setItems(newItems);
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  // 🚀 SIÊU CẤP ĐĂNG TRUYỆN SONG SONG
  const handleUpload = async () => {
    if (!selectedMangaId || !chapterNumber) {
      setMessage({ type: "error", text: "VUI LÒNG NHẬP ĐỦ THÔNG TIN MANGA VÀ CHƯƠNG! 🍀" });
      return;
    }
    
    setUploading(true);
    setMessage({ type: "info", text: "ĐANG CÔNG PHÁ DỮ LIỆU LÊN CLOUD... ⚡" });

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

      // Xóa dữ liệu cũ để đồng bộ mới hoàn toàn 🚀
      await supabase.from("pages").delete().eq("chapter_id", chapId);
      
      const total = items.length;
      let completedCount = 0;

      // ⚡ XỬ LÝ SONG SONG (Giới hạn tối đa 5 ảnh một lúc để tránh nghẽn mạng)
      const uploadWorker = async (item: any, index: number) => {
        let finalUrl = item.data;
        if (item.type === 'new') {
          const compressed = await compressImageToWebP(item.data);
          const name = `chapters/${chapId}/${Date.now()}-${index}.webp`;
          
          // 🌩️ BAY THẲNG LÊN CLOUDFLARE R2
          finalUrl = await uploadToR2(compressed, name);
        }

        completedCount++;
        setProgress(Math.round((completedCount / total) * 100));
        
        return { 
          chapter_id: chapId, 
          image_url: finalUrl, 
          page_number: index + 1 
        };
      };

      // Chia nhỏ ra để upload mượt mà 🛡️
      const pagesToInsert = await Promise.all(items.map((item, idx) => uploadWorker(item, idx)));
      
      await supabase.from("pages").insert(pagesToInsert);
      
      setMessage({ type: "success", text: "🚀 ĐÃ ĐĂNG CHƯƠNG THÀNH CÔNG RỰC RỠ!" });
      setTimeout(() => router.push(`/manga/${selectedMangaId}`), 1500);
    } catch (err: any) {
      alert("Lỗi rồi bác ơi: " + err.message);
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
        setMessage({ type: "info", text: "💥 ĐANG XÓA... Đừng thoát trang!" });
        await supabase.from('pages').delete().eq('chapter_id', idToDel);
        await supabase.from('chapters').delete().eq('id', idToDel);
        setMessage({ type: "success", text: "✅ ĐÃ XÓA THÀNH CÔNG!" });
        setTimeout(() => router.push(`/manga/${selectedMangaId}`), 1000);
     } catch (err: any) {
        alert("Lỗi: " + err.message);
     } finally {
        setUploading(false);
     }
  };

  return (
    <div className="min-h-screen bg-[#0a0c0a] text-white p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto pb-40">
        
        <div className="flex items-center justify-between mb-10">
           <h1 className="text-2xl font-black uppercase tracking-[0.3em] flex items-center gap-3">
              {isEditing ? "CHỈNH SỬA" : "ĐĂNG CHƯƠNG"} <span className="text-[#4caf50] animate-pulse">🍀</span>
           </h1>
           <AdminButton variant="ghost" onClick={() => router.back()}>QUAY LẠI</AdminButton>
        </div>

        {message && <div className={`mb-10 p-5 rounded-2xl border font-black uppercase text-[10px] tracking-widest ${message.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-[#4caf50]/10 border-[#4caf50]/20 text-[#4caf50]'}`}>{message.text}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           <div className="md:col-span-1 space-y-6">
              <AdminCard className="p-6 space-y-6 border-[#4caf50]/10">
                 <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Chọn bộ Manga</label>
                    <select value={selectedMangaId} onChange={(e) => setSelectedMangaId(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-xs font-black focus:border-[#4caf50] outline-none transition-all">
                       <option value="">-- CHỌN TRUYỆN --</option>
                       {mangas.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                    </select>
                 </div>
                 <AdminInput label="Số chương" type="number" step="0.1" value={chapterNumber} onChange={(e) => setChapterNumber(e.target.value)} placeholder="VD: 1, 1.5, 2..." />
                 <AdminInput label="Tên chương (Không bắt buộc)" value={chapterTitle} onChange={(e) => setChapterTitle(e.target.value)} placeholder="VD: Khởi đầu mới..." />
              </AdminCard>

              {isEditing && deleteStep === 0 && (
                <button onClick={() => setDeleteStep(1)} className="w-full py-4 text-[10px] font-black text-red-500/50 hover:text-red-500 hover:bg-red-500/5 rounded-2xl border border-red-500/10 transition-all uppercase tracking-widest">Xóa chương này 🗑️</button>
              )}
              {deleteStep === 1 && (
                <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-2xl space-y-4 animate-shake">
                   <p className="text-[10px] font-black text-red-500 text-center uppercase">XÁC NHẬN XÓA VĨNH VIỄN?</p>
                   <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setDeleteStep(0)} className="py-3 bg-white/5 rounded-xl text-[9px] font-black uppercase">KHÔNG</button>
                      <button onClick={handleFinalDelete} className="py-3 bg-red-500 text-white rounded-xl text-[9px] font-black uppercase shadow-lg shadow-red-500/20">XÓA NGAY</button>
                   </div>
                </div>
              )}
           </div>

           <div className="md:col-span-2 space-y-6">
              <div className="relative group overflow-hidden rounded-[32px] border-2 border-dashed border-white/5 hover:border-[#4caf50]/30 transition-all">
                 <input type="file" multiple accept="image/*" onChange={onFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                 <div className="py-12 flex flex-col items-center justify-center gap-4 bg-[#141814]/40">
                    <div className="w-16 h-16 rounded-full bg-[#4caf50]/10 flex items-center justify-center text-[#4caf50] group-hover:scale-110 transition-transform">
                       <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
                    </div>
                    <div className="text-center">
                       <p className="text-xs font-black uppercase tracking-widest mb-1">Thả ảnh vào đây 🍀</p>
                       <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Hoặc nhấn để chọn hàng loạt ảnh từ máy</p>
                    </div>
                 </div>
              </div>

              {items.length > 0 && (
                <div className="space-y-4 animate-fade-in-up">
                   <div className="flex items-center justify-between px-2">
                      <span className="text-[10px] font-black text-[#4caf50] uppercase tracking-widest">Thứ tự trang ({items.length})</span>
                      <button onClick={() => setItems([])} className="text-[9px] font-black text-red-500/50 hover:text-red-500 uppercase tracking-tighter">[XÓA TẤT CẢ]</button>
                   </div>
                   
                   <DragDropContext onDragEnd={onDragEnd}>
                      <Droppable droppableId="pages">
                        {(provided) => (
                          <div {...provided.droppableProps} ref={provided.innerRef} className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {items.map((item, index) => (
                              <Draggable key={item.id} draggableId={item.id} index={index}>
                                {(provided) => (
                                  <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/5 bg-black shadow-xl group">
                                     <img src={item.data} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="" />
                                     <div className="absolute top-2 left-2 w-6 h-6 bg-black/60 backdrop-blur-md rounded-lg flex items-center justify-center text-[10px] font-black border border-white/10">{index + 1}</div>
                                     <button onClick={() => removeItem(item.id)} className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-lg flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all hover:scale-110">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                                     </button>
                                     {item.type === 'new' && <div className="absolute bottom-2 left-2 right-2 py-1 bg-[#4caf50] text-[#0a0c0a] text-[8px] font-black text-center rounded-md uppercase tracking-tighter">Ảnh mới ✨</div>}
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                   </DragDropContext>
                </div>
              )}
           </div>
        </div>

        {/* FLOATING ACTION BAR 🚀 */}
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[4000] w-full max-w-lg px-6">
           <div className={`p-4 backdrop-blur-3xl border rounded-[40px] shadow-2xl flex flex-col gap-4 transition-all ${uploading ? 'bg-[#141814]/90 border-[#4caf50]/20' : 'bg-black/80 border-white/5'}`}>
              {uploading && (
                <div className="space-y-3">
                   <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-[#4caf50] px-4">
                      <span>Đang nén & Đẩy ảnh...</span>
                      <span>{progress}%</span>
                   </div>
                   <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden mx-auto max-w-[90%]">
                      <div className="h-full bg-gradient-to-r from-[#4caf50] to-[#5fd364] transition-all duration-300" style={{ width: `${progress}%` }}></div>
                   </div>
                </div>
              )}
              <AdminButton onClick={handleUpload} disabled={uploading || items.length === 0} className="w-full h-16 text-xs tracking-[0.3em]">
                 {uploading ? 'ĐANG CÔNG PHÁ...' : isEditing ? 'CẬP NHẬT CHƯƠNG 🚀' : 'ĐĂNG CHƯƠNG NGAY 🚀'}
              </AdminButton>
           </div>
        </div>

      </div>
    </div>
  );
}
