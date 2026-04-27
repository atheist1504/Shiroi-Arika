'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminButton } from '@/components/admin/AdminCommon';
import { getUploadUrlAction, getStorageUsageAction, notifyNewChapterAction, uploadChapterPageAction, saveChapterDataAction, deleteChapterAction, leechChapterAction, uploadFromUrlAction } from '@/lib/actions';
import { optimizeImage, fixR2Url } from '@/lib/cloudinary';
import { StorageMeter } from '@/components/admin/AdminCommon';
import { parseMHTMLImages } from '@/lib/mhtml-parser';

// 🚀 DND-KIT IMPORTS
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  MouseSensor,
  TouchSensor,
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

// 🖼️ HÀM NÉN ẢNH CHUẨN WEB (TỐI ƯU CHO R2 & MOBILE RAM) 🍀
// 🖼️ HÀM NÉN ẢNH CHUẨN WEB (TỐI ƯU CHO R2 & MOBILE RAM) 🍀
const compressImageToWebP = async (file: File, isTikTok: boolean = false): Promise<File> => {
  return new Promise((resolve) => {
    const imageUrl = URL.createObjectURL(file);
    const img = new Image();
    
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const maxWidth = 1600;
        const scale = Math.min(1, maxWidth / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) {
          URL.revokeObjectURL(imageUrl);
          resolve(file); // Fallback: Dùng ảnh gốc 🛡️
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const quality = isTikTok ? 0.92 : 0.82;

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(imageUrl);
            if (!blob) {
              resolve(file); // Fallback: Dùng ảnh gốc 🛡️
              return;
            }
            const fileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
            resolve(new File([blob], fileName, { type: "image/webp" }));
          },
          "image/webp",
          quality
        );
      } catch (e) {
        console.warn("⚠️ Lỗi nén ảnh, dùng ảnh gốc:", e);
        URL.revokeObjectURL(imageUrl);
        resolve(file); // Fallback khi canvas lỗi 🛡️
      }
    };

    img.onerror = () => {
      console.warn("⚠️ Trình duyệt không thể giải mã ảnh (Decode Failed), dùng ảnh gốc thay thế.");
      URL.revokeObjectURL(imageUrl);
      resolve(file); // TRẢ VỀ FILE GỐC NẾU KHÔNG THỂ GIẢI MÃ ĐỂ NÉN 🍀
    };
    img.src = imageUrl;
  });
};


// 🖼️ COMPONENT TRANG TRUYỆN SORTABLE
function SortableItem({ id, item, index, onRemove, onPreview, onBroken }: any) {
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

  const displaySrc = item.type === 'new' ? item.preview : item.data;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="relative w-[120px] sm:w-[155px] aspect-[3/4] rounded-2xl overflow-hidden border border-white/5 bg-[#1a1a1a] group shadow-xl transition-colors hover:border-[#4caf50]/40"
    >
      <img 
        src={item.type === 'new' ? displaySrc : optimizeImage(displaySrc, '200')} 
        className={`w-full h-full object-cover pointer-events-none transition-opacity duration-300 ${item.error ? 'opacity-20' : 'opacity-100'}`} 
        draggable="false" 
        alt="" 
        referrerPolicy="no-referrer"
        onError={(e: any) => {
          // 🛡️ XỬ LÝ ẢNH LỖI (FIX VỠ ẢNH TIKTOK/MOBILE) 🍀
          if (!item.error) {
            console.error("❌ Preview failed for item:", id);
            onBroken?.(id); // Thông báo cho cha biết ảnh này bị lỗi
          }
        }}
      />
      {item.error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-red-500/10">
          <svg className="w-6 h-6 text-red-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span className="text-[8px] font-black text-red-500 uppercase leading-tight">FILE CHỖ NÀY<br/>BỊ LỖI RỒI 🧱</span>
        </div>
      )}
      
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
  const [message, setMessage] = useState<{type: 'error' | 'success' | 'info', text: string, details?: string, suggestion?: string} | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [existingChapterId, setExistingChapterId] = useState<string | null>(preSelectedChapterId);
  const [deleteStep, setDeleteStep] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [storageInfo, setStorageInfo] = useState<{totalGB: number, limitGB: number} | null>(null);

  // 🚀 AUTO-LEECH STATES (NEW) 🕵️‍♂️
  const [uploadMode, setUploadMode] = useState<'file' | 'leech'>('file');
  const [leechUrl, setLeechUrl] = useState('');
  const [leeching, setLeeching] = useState(false);
  const [preUploadProgress, setPreUploadProgress] = useState({ current: 0, total: 0 });
  // 📁 Tên thư mục cố định cho chương này (Dùng UUID để không bao giờ bị trùng hoặc sót rác)
  const [pendingFolderId] = useState(() => preSelectedChapterId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36)));

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { 
      activationConstraint: { 
        delay: 250, // Giữ 250ms để bắt đầu kéo (tránh xung đột với cuộn trang) 🍀
        tolerance: 5 
      } 
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetchMangas();
    fetchStorageUsage();
    if (preSelectedChapterId) { loadChapterData(preSelectedChapterId); setIsEditing(true); }
  }, [preSelectedChapterId]);

  const fetchStorageUsage = async () => {
    try {
      const response = await fetch('/api/admin/storage');
      const res = await response.json();
      if (res.success) {
        setStorageInfo({ totalGB: res.totalGB || 0, limitGB: res.limitGB || 10 });
      }
    } catch (err) {
      console.warn("⚠️ Lỗi fetchStorageUsage (bỏ qua):", err);
    }
  };

  useEffect(() => { if (preSelectedMangaId) setSelectedMangaId(preSelectedMangaId); }, [preSelectedMangaId]);

  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);

  // 🧹 FIX MEMORY LEAK: Dọn dẹp Blob URLs khi thoát trang Admin 🍀
  useEffect(() => {
    return () => {
      itemsRef.current.forEach(item => {
        if (item.preview?.startsWith('blob:')) URL.revokeObjectURL(item.preview);
      });
    };
  }, []); 

  const fetchMangas = async () => {
    const { data } = await supabase.from('mangas').select('id, title').order('title');
    setMangas(data || []);
  };

  // 🕵️‍♂️ HÀM TRIỆU HỒI TRUYỆN (AUTO-LEECH) 🚀
  const handleLeech = async () => {
    if (!leechUrl) return;
    setLeeching(true);
    setPreUploadProgress({ current: 0, total: 0 });
    setMessage({ type: 'info', text: 'ĐANG TRIỆU HỒI DANH SÁCH ẢNH... 🪄' });
    
    try {
      const res = await leechChapterAction(leechUrl);
      if (!res.success) throw new Error(res.error);

      const totalImages = res.images.length;
      setPreUploadProgress({ current: 0, total: totalImages });
      setMessage({ type: 'info', text: `ĐÃ LẤY ĐƯỢC ${totalImages} LINK. ĐANG "BƯNG" ẢNH VỀ R2 ĐỂ XEM TRƯỚC... 🌩️` });

      // 🚀 QUY TRÌNH "BƯNG" ẢNH (AUTO PRE-UPLOAD)
      // Chia đợt để không làm nghẽn server action
      const BATCH_SIZE = 5;
      const uploadedItems: any[] = [];

      for (let i = 0; i < totalImages; i += BATCH_SIZE) {
        const batch = res.images.slice(i, i + BATCH_SIZE);
        
        const results = await Promise.all(batch.map(async (url: string, localIdx: number) => {
          const globalIdx = i + localIdx;
          // 📁 Lưu vào thư mục chuẩn của chương: chapters/[ID]/[Tên file]
          const fileName = `chapters/${pendingFolderId}/${Date.now()}-${globalIdx}.webp`;
          
          try {
            const uploadRes = await uploadFromUrlAction(url, tempFileName);
            if (uploadRes.success) {
                return {
                    id: `leech-${Date.now()}-${globalIdx}`,
                    data: uploadRes.url, // Bây giờ data chính là link R2 xịn
                    type: 'existing', // Coi như đã tồn tại trên R2 để lúc save không upload lại
                    preview: uploadRes.url,
                    originalUrl: url,
                    size_kb: uploadRes.size_kb || 150
                };
            }
            return null;
          } catch (e) {
            console.error("Lỗi pre-upload:", e);
            return null;
          }
        }));

        const validResults = results.filter(r => r !== null);
        uploadedItems.push(...validResults);
        
        // Cập nhật UI ngay lập tức cho từng đợt
        setItems(prev => [...prev, ...validResults]);
        setPreUploadProgress(prev => ({ ...prev, current: Math.min(prev.current + BATCH_SIZE, totalImages) }));
      }

      if (uploadedItems.length === 0) {
        throw new Error("Không thể tải được ảnh nào về hệ thống. Web gốc có thể đã chặn đứng Server. 🛡️");
      }

      setMessage({ 
        type: 'success', 
        text: `TRIỆU HỒI THÀNH CÔNG ${uploadedItems.length}/${totalImages} ẢNH! 💮`,
        suggestion: uploadedItems.length < totalImages ? "Một số ảnh bị lỗi tải về do web gốc chặn server, bạn có thể bổ sung bằng tay." : undefined
      });
      setLeechUrl('');
      
      // Tự động cuộn xuống danh sách ảnh
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 300);
    } catch (err: any) {
      setMessage({ type: 'error', text: `TRIỆU HỒI THẤT BẠI: ${err.message}` });
    } finally {
      setLeeching(false);
      setPreUploadProgress({ current: 0, total: 0 });
    }
  };

  const loadChapterData = async (id: string) => {
    const { data: chap } = await supabase.from('chapters').select('*').eq('id', id).single();
    if (chap) { setChapterNumber(chap.chapter_number.toString()); setChapterTitle(chap.title || ''); setSelectedMangaId(chap.manga_id); }
    const { data: pgs } = await supabase.from('pages').select('id, image_url, page_number').eq('chapter_id', id).order('page_number');
    if (pgs) {
        setItems(pgs.map(p => {
            const finalData = fixR2Url(p.image_url);
            return { id: p.id, data: finalData, type: 'existing' };
        }));
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = Array.from(e.target.files || []);
    if (rawFiles.length === 0) return;

    setMessage({ type: 'info', text: `ĐANG XỬ LÝ DỮ LIỆU... ⏳` });
    
    let allFiles: File[] = [];

    try {
      for (const file of rawFiles) {
        const isMHTML = file.name.toLowerCase().endsWith('.mhtml') || file.name.toLowerCase().endsWith('.mht');
        
        if (isMHTML) {
          setMessage({ type: 'info', text: `ĐANG TRÍCH XUẤT ẢNH TỪ FILE MHTML: ${file.name}... 📂` });
          const extractedImages = await parseMHTMLImages(file);
          allFiles = [...allFiles, ...extractedImages];
        } else {
          allFiles.push(file);
        }
      }

      // 🕵️‍♂️ SẮP XẾP THEO NGÀY (FILE LAST MODIFIED) cho các file lẻ, hoặc giữ nguyên thứ tự MHTML
      const files = allFiles;
      
      const newItems = files.map((file, idx) => {
        const id = `new-${Date.now()}-${idx}-${Math.random()}`;
        // Kiểm tra sơ bộ định dạng file TikTok / Mobile 🕵️‍♂️
        const isTikTok = file.name.toLowerCase().includes('tiktok') || file.size < 1000;
        
        return {
          id,
          file, 
          preview: URL.createObjectURL(file),
          type: 'new',
          isTikTok
        };
      });

      setItems(prev => [...prev, ...newItems]);
      setMessage(null);
    } catch (err: any) {
      console.error("❌ Lỗi xử lý file:", err);
      setMessage({ type: 'error', text: `LỖI XỬ LÝ FILE: ${err.message}` });
    } finally {
      // 🛡️ Reset input để có thể chọn lại cùng một file nếu cần 🍀
      e.target.value = '';
    }
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
      if (itemToDrop?.preview) URL.revokeObjectURL(itemToDrop.preview); 
      return prev.filter(i => i.id !== id);
    });
  };

  const markAsBroken = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, error: true } : item));
    setMessage({ type: 'error', text: 'PHÁT HIỆN ẢNH LỖI! VUI LÒNG KIỂM TRA LẠI FILE HOẶC CHỤP MÀN HÌNH ĐỂ THAY THẾ. 🛡️' });
  };

  const handleFinalDelete = async () => {
     const idToDel = preSelectedChapterId || existingChapterId;
     if (!idToDel) return;
     try {
        setUploading(true);
        setMessage({ type: "info", text: "💥 ĐANG XÓA..." });
        
        const res = await deleteChapterAction(idToDel);
        if (!res.success) throw new Error(res.error);

        setMessage({ type: "success", text: "✅ XÓA THÀNH CÔNG!" });
        setTimeout(() => router.push(`/manga/${selectedMangaId}`), 1000);
     } catch (err: any) { 
        setMessage({ type: 'error', text: "LỖI XÓA: " + err.message });
     } finally { 
        setUploading(false); 
     }
  };

  const handleUpload = async () => {
    if (!selectedMangaId || !chapterNumber) { 
      setMessage({ type: "error", text: "CHƯA NHẬP ĐỦ THÔNG TIN! 🍀" }); 
      return; 
    }
    
    setUploading(true); 
    setProgress(0);
    setMessage({ type: "info", text: "🚀 ĐANG KÍCH HOẠT QUY TRÌNH UPLOAD TURBO PROXY... 🌪️" });
    
    try {
      const chapterPayload = { 
        id: pendingFolderId, // 🛡️ Ép Database dùng đúng ID này để đồng bộ với Folder R2
        manga_id: selectedMangaId, 
        chapter_number: parseFloat(chapterNumber), 
        title: chapterTitle 
      };

      const pagesData: any[] = [];
      const total = items.length;
      let completedCount = 0;
      const BATCH_SIZE = 5; // Tăng lên 5 để tối ưu tốc độ upload Turbo 🚀

      // Chia danh sách trang thành các đợt (chunks)
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);
        const batchIndex = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(total / BATCH_SIZE);

        setMessage({ 
          type: "info", 
          text: `🚀 ĐANG XỬ LÝ... ĐỜT ${batchIndex}/${totalBatches} SONG SONG ⏳` 
        });

        // Xử lý song song các trang trong đợt hiện tại
        const batchResults = await Promise.all(batch.map(async (item, localIndex) => {
          const globalIndex = i + localIndex;
          
          if (item.error) {
            throw new Error(`Trang số ${globalIndex + 1} đang bị lỗi hiển thị.`);
          }

          // 🛡️ 1. XỬ LÝ ẢNH CÓ SẴN (Trong DB)
          if (item.type === 'existing') {
            completedCount++;
            setProgress(Math.round((completedCount / total) * 100));
            return {
              image_url: item.data,
              page_number: globalIndex + 1,
              size_kb: item.size_kb || 150
            };
          }

          // 📁 Lưu vào thư mục chuẩn của chương: chapters/[ID]/[Tên file]
          const fileName = `chapters/${pendingFolderId}/${Date.now()}-${globalIndex}.webp`;

          // 🚀 2. XỬ LÝ ẢNH TỪ URL (AUTO-LEECH)
          if (item.type === 'url') {
            try {
              const res = await uploadFromUrlAction(item.data, fileName);
              if (!res.success) throw new Error(res.error);
              
              completedCount++;
              setProgress(Math.round((completedCount / total) * 100));
              return {
                image_url: res.url,
                page_number: globalIndex + 1,
                size_kb: res.size_kb || 150
              };
            } catch (err: any) {
              throw new Error(`Trang ${globalIndex + 1} (Link): ${err.message}`);
            }
          }

          // 📁 3. XỬ LÝ FILE TẢI LÊN TỪ MÁY
          try {
            // Nén ảnh
            const compressed = await compressImageToWebP(item.file, item.isTikTok);

            // Chuẩn bị FormData cho Proxy Upload
            const formData = new FormData();
            formData.append('file', compressed);
            formData.append('fileName', fileName);

            // Gửi lên qua Server Action Proxy
            const res = await uploadChapterPageAction(formData);

            if (!res.success) throw new Error(res.error || "Lỗi Proxy Upload");
            
            completedCount++;
            setProgress(Math.round((completedCount / total) * 100));

            return {
              image_url: res.url,
              page_number: globalIndex + 1,
              size_kb: Math.round(compressed.size / 1024)
            };
          } catch (err: any) {
            console.error(`❌ Lỗi tại trang ${globalIndex + 1}:`, err);
            throw new Error(`Trang số ${globalIndex + 1}: ${err.message || String(err)}`);
          }
        }));

        pagesData.push(...batchResults.filter(r => r !== null));
      }

      if (pagesData.length === 0) throw new Error("Không có ảnh để lưu.");

      // 2. GỌI SERVER ACTION ĐỂ LƯU TẤT CẢ DỮ LIỆU DB CÙNG LÚC 🛡️
      const saveRes = await saveChapterDataAction(chapterPayload, pagesData, isEditing, existingChapterId);

      if (!saveRes.success) throw new Error(saveRes.error);

      // 3. 🔔 GỬI THÔNG BÁO CHƯƠNG MỚI 🍀
      const selectedManga = mangas.find(m => m.id === selectedMangaId);
      if (selectedManga && !isEditing) {
         try {
            await notifyNewChapterAction(
              selectedMangaId, 
              selectedManga.title, 
              chapterNumber, 
              selectedManga.cover_image
            );
         } catch (e) { console.warn("Lỗi gửi thông báo:", e); }
      }

      setMessage({ type: "success", text: "🚀 XUẤT BẢN THÀNH CÔNG!" });
      setTimeout(() => router.push(`/manga/${selectedMangaId}`), 1000);
    } catch (err: any) { 
      setMessage({ 
        type: "error", 
        text: err.message || "UPLOAD THẤT BẠI!",
        details: err.stack || String(err),
        suggestion: (err.message?.includes("CORS") || err.message?.includes("fetch"))
          ? "PHÁT HIỆN LỖI CHẶN TRUY CẬP (CORS). Đạo hữu vui lòng kiểm tra lại cấu hình CORS trên Cloudflare R2."
          : (err.message?.includes("Decode") || err.message?.includes("nén"))
          ? "Ảnh có thể bị lỗi định dạng. Tôi đã thử dùng ảnh gốc nhưng vẫn không được, đạo hữu hãy thử chọn lại file khác nhé."
          : "Hãy kiểm tra lại mạng di động hoặc thử tải lên từng đợt ít trang hơn (chọn 5-10 trang mỗi lần)."
      });
      console.error("DEBUG UPLOAD:", err);
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
           <div className="flex flex-col items-end gap-1">
             <AdminButton variant="ghost" onClick={() => router.back()} className="text-[9px] opacity-50">QUAY LẠI</AdminButton>
           </div>
        </div>

        {storageInfo && <StorageMeter totalGB={storageInfo.totalGB} limitGB={storageInfo.limitGB} />}

        {message && (
          <div className={`mb-8 p-6 rounded-3xl border animate-fade-in shadow-2xl ${message.type === 'error' ? 'bg-red-500/5 border-red-500/20' : 'bg-white/5 border-white/10'}`}>
             <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${message.type === 'error' ? 'bg-red-500/20 text-red-500' : 'bg-[#4caf50]/20 text-[#4caf50]'}`}>
                   {message.type === 'error' ? '🆘' : '✨'}
                </div>
                <div className="flex-1 space-y-2">
                   <p className={`font-black uppercase text-[11px] tracking-widest ${message.type === 'error' ? 'text-red-500' : 'text-[#4caf50]'}`}>{message.text}</p>
                   {message.suggestion && <p className="text-[10px] text-gray-400 font-medium">💡 Gợi ý: {message.suggestion}</p>}
                   
                   {message.type === 'error' && (
                     <div className="pt-2">
                        <button 
                          onClick={() => setShowDebug(!showDebug)} 
                          className="text-[9px] font-black uppercase text-gray-500 hover:text-white border-b border-gray-500/30 pb-0.5 transition-all"
                        >
                          {showDebug ? "Ẩn chi tiết kỹ thuật 🔼" : "Xem chi tiết kỹ thuật 🔍"}
                        </button>
                        {showDebug && message.details && (
                          <pre className="mt-4 p-4 bg-black rounded-xl border border-white/5 text-[9px] text-red-400 overflow-x-auto font-mono leading-relaxed max-h-40">
                             {message.details}
                          </pre>
                        )}
                     </div>
                   )}
                </div>
             </div>
          </div>
        )}

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

           {/* CHỌN PHƯƠNG THỨC NẠP ẢNH */}
           <div className="space-y-6">
              <div className="flex gap-2 p-1.5 bg-white/5 rounded-2xl w-fit">
                 <button onClick={() => setUploadMode('file')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${uploadMode === 'file' ? 'bg-[#4caf50] text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}>Tải file (MHTML/Ảnh)</button>
                 <button onClick={() => setUploadMode('leech')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${uploadMode === 'leech' ? 'bg-[#4caf50] text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}>Dán link (Auto-Leech)</button>
              </div>

              {uploadMode === 'leech' ? (
                <div className="bg-[#4caf50]/5 p-6 rounded-3xl border border-[#4caf50]/20 shadow-2xl animate-fade-in">
                   <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1 relative">
                        <input 
                          type="text" 
                          value={leechUrl} 
                          onChange={(e) => setLeechUrl(e.target.value)}
                          placeholder="Dán link chương từ MangaDex hoặc TruyenDex..."
                          className="w-full bg-black border border-white/10 rounded-2xl p-4 pl-12 text-sm font-bold outline-none focus:border-[#4caf50] transition-all"
                        />
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <button 
                        onClick={handleLeech} 
                        disabled={leeching || !leechUrl}
                        className={`px-10 h-14 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${leeching || !leechUrl ? 'bg-white/5 text-gray-400' : 'bg-[#4caf50] text-black hover:bg-[#5fd364] shadow-lg shadow-[#4caf50]/20'}`}
                      >
                         {leeching ? <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div> : '⚡'}
                         {leeching ? 'ĐANG TRIỆU HỒI...' : 'TRIỆU HỒI ẢNH'}
                      </button>
                   </div>
                   <p className="mt-4 text-[9px] text-gray-500 font-bold uppercase tracking-tight pl-1">Hỗ trợ: MangaDex, TruyenDex và các trang truyện phổ biến khác 🍀</p>
                </div>
              ) : (
                <div className="relative group">
                  <div className="bg-white/[0.02] p-12 rounded-3xl border-2 border-dashed border-white/5 hover:border-[#4caf50]/30 transition-all flex flex-col items-center justify-center gap-4 cursor-pointer">
                    <input type="file" multiple accept="image/*,.mhtml,.mht" onChange={onFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <div className="w-16 h-16 rounded-full bg-[#4caf50]/10 flex items-center justify-center text-[#4caf50] group-hover:scale-110 transition-transform"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                    <div className="text-center">
                       <p className="text-xs font-black uppercase tracking-widest">Kéo thả hoặc Nhấn để tải file</p>
                       <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1">Hỗ trợ ảnh lẻ hoặc file MHTML 📂</p>
                    </div>
                  </div>
                </div>
              )}
           </div>

           <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                 <h2 className="text-[11px] font-black text-gray-600 uppercase tracking-widest leading-none">CÁC TRANG TRUYỆN ({items.length})</h2>
                  <div className="flex items-center gap-4">
                    {items.length > 1 && (
                       <button 
                         onClick={() => setItems(prev => [...prev].reverse())} 
                         className="text-[9px] font-black text-[#4caf50]/40 hover:text-[#4caf50] transition-colors uppercase flex items-center gap-1"
                       >
                         <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                         Đảo ngược thứ tự
                       </button>
                    )}
                    {items.length > 0 && (
                       <button onClick={() => setItems([])} className="text-[9px] font-black text-red-500/30 hover:text-red-500 transition-colors uppercase">Dọn sạch danh sách</button>
                    )}
                  </div>
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                 <SortableContext items={items.map(i => i.id)} strategy={rectSortingStrategy}>
                    <div className="flex flex-wrap gap-5">
                       {items.map((item, index) => (
                          <SortableItem key={item.id} id={item.id} item={item} index={index} onRemove={removeItem} onPreview={setPreviewImage} onBroken={markAsBroken} />
                       ))}
                       {items.length > 0 && (
                          <div className="relative w-[120px] sm:w-[155px] aspect-[3/4] rounded-2xl border-2 border-dashed border-white/5 hover:border-[#4caf50]/30 transition-all flex flex-col items-center justify-center gap-3 bg-white/[0.01] hover:bg-[#4caf50]/5 cursor-pointer">
                             <input type="file" multiple accept="image/*,.mhtml,.mht" onChange={onFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                             <div className="w-8 h-8 rounded-full bg-[#4caf50]/10 flex items-center justify-center text-[#4caf50]"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                             <span className="text-[8px] font-black text-gray-600 uppercase">Thêm ảnh</span>
                          </div>
                       )}
                    </div>
                 </SortableContext>
              </DndContext>
           </div>
        </div>

        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-6">
           <div className="p-4 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl flex flex-col gap-4">
              {uploading && (
                <div className="space-y-2 px-1">
                   <div className="flex justify-between text-[10px] font-black text-[#4caf50] uppercase tracking-widest"><span>TIẾN ĐỘ</span><span>{progress}%</span></div>
                   <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-[#4caf50] transition-all duration-300" style={{ width: `${progress}%` }}></div></div>
                </div>
              )}
              <button 
                onClick={handleUpload} 
                disabled={uploading || items.length === 0} 
                className={`w-full h-14 rounded-2xl font-black text-[11px] tracking-[0.4em] uppercase transition-all active:scale-95 ${uploading || items.length === 0 ? 'bg-white/5 text-white/20' : 'bg-[#4caf50] text-black hover:bg-[#5fd364] shadow-xl shadow-[#4caf50]/20'}`}
              >
                 {uploading ? 'ĐANG XUẤT BẢN...' : 'XUẤT BẢN NGAY 🚀'}
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
             <img 
               key={previewImage}
               src={previewImage} 
               className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-[0_40px_100px_rgba(0,0,0,0.8)] animate-zoom-in" 
               alt="Preview" 
               referrerPolicy="no-referrer"
               onClick={(e) => e.stopPropagation()} 
               onError={(e: any) => {
                  // 🛡️ CHẶN VÒNG LẶP: Nếu đã thử rồi mà vẫn lỗi thì dừng 🍀
                  if (e.target.dataset.failed) return;
                  console.warn("🔄 Preview failed, retrying raw source.");
                  e.target.dataset.failed = "true";
                  e.target.removeAttribute('crossOrigin');
                  e.target.src = previewImage;
               }}
             />
             <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-black/40 border border-white/5 backdrop-blur-md rounded-2xl text-[10px] font-black text-gray-400 uppercase tracking-widest">Click ra ngoài để đóng</div>
          </div>
        )}
      </div>
    </div>
  );
}
