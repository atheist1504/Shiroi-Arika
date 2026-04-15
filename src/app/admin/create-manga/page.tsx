'use client';

import React, { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { deleteMangaAction } from "../../../lib/actions";
import { compressImageToWebP } from "../../../lib/imageOptimizer";
import { AdminCard, AdminInput, AdminTextarea, AdminTag, AdminButton } from "../../../components/admin/AdminCommon";

import { GENRES } from "../../../lib/constants";

export default function CreateMangaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [defaultReadingMode, setDefaultReadingMode] = useState("scroll");
  const [isFeatured, setIsFeatured] = useState(false);
  const [status, setStatus] = useState("ongoing");
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (id) {
       fetchMangaData(id);
    }
  }, [id]);

  const fetchMangaData = async (mangaId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("mangas")
        .select("*")
        .eq("id", mangaId)
        .single();
      
      if (error) throw error;
      if (data) {
        setTitle(data.title);
        setDescription(data.description || "");
        setGenres(data.genres || []);
        setCoverPreview(data.cover_image);
        setDefaultReadingMode(data.default_reading_mode || "scroll");
        setIsFeatured(data.is_featured || false);
        setStatus(data.status || "ongoing");
        setIsEditing(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenreToggle = (genre: string) => {
    setGenres(prev => 
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    
    setLoading(true);
    setMessage({ type: 'info', text: 'ĐANG XỬ LÝ DỮ LIỆU VÀ NÉN ẢNH... 🍀' });

    try {
      let coverImageUrl = coverPreview;

      if (coverFile) {
        const compressed = await compressImageToWebP(coverFile);
        const fileName = `covers/${Date.now()}.webp`;
        const { error: uploadError } = await supabase.storage
          .from('manga_images')
          .upload(fileName, compressed);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('manga_images')
          .getPublicUrl(fileName);
        coverImageUrl = publicUrl;
      }

      const mangaData = {
        title,
        description: description || null,
        genres: genres.length > 0 ? genres : null,
        cover_image: coverImageUrl,
        default_reading_mode: defaultReadingMode,
        is_featured: isFeatured,
        status: status
      };

      const { saveMangaAction } = await import("../../../lib/actions");
      const res = await saveMangaAction(mangaData, id);

      if (res.success) {
        setMessage({ type: 'success', text: 'THÀNH CÔNG! ĐANG CHUYỂN TRANG... 👋' });
        router.push(`/manga/${res.data.id}`);
      } else {
        throw new Error(res.error);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: `THẤT BẠI: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteManga = async () => {
    if (deleteConfirm !== title) return;
    setLoading(true);
    setMessage({ type: 'info', text: '🔥 ĐANG TIẾN HÀNH XÓA TRIỆT ĐỂ (DB + R2)...' });
    
    try {
      const res = await deleteMangaAction(id);
      if (res.success) {
        setMessage({ type: 'success', text: '✅ ĐÃ XÓA TRUYỆN THÀNH CÔNG!' });
        setTimeout(() => router.push('/'), 1500);
      } else {
        throw new Error(res.error);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: `LỖI KHI XÓA: ${err.message}` });
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0c0a] text-white p-4 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        
        <div className="flex items-center justify-between mb-10">
           <h1 className="text-2xl font-black uppercase tracking-[0.3em] flex items-center gap-3">
              {isEditing ? "CHỈNH SỬA TRUYỆN" : "THÊM TRUYỆN MỚI"} <span className="text-[#4caf50] animate-pulse">🍀</span>
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

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-8">
            <AdminCard title="Nội dung cơ bản" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>}>
              <div className="space-y-6">
                 <AdminInput 
                    label="Tên Truyện Khởi Nguyên (*)" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    placeholder="VD: One Piece, Naruto..."
                    required 
                 />
                 <AdminTextarea 
                    label="Tóm tắt nội dung / Bio" 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    rows={8}
                    placeholder="Viết một đoạn tóm tắt ngầu đét cho bộ truyện này..."
                 />
              </div>
            </AdminCard>

            <AdminCard title="Thể loại (Genres)" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>}>
              <div className="flex flex-wrap gap-2">
                {GENRES.map(genre => (
                  <AdminTag 
                    key={genre} 
                    label={genre} 
                    isActive={genres.includes(genre)} 
                    onClick={() => handleGenreToggle(genre)} 
                  />
                ))}
              </div>
            </AdminCard>
          </div>

          <div className="space-y-8">
            <AdminCard title="Ảnh bìa & Cấu hình" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>}>
              <div className="space-y-8">
                 <div className="relative group w-full aspect-[2/3] max-w-[280px] mx-auto cursor-pointer">
                    <div className="absolute inset-0 bg-black/40 border-2 border-dashed border-[#2a332a] group-hover:border-[#4caf50] rounded-[32px] overflow-hidden transition-all duration-500 shadow-2xl">
                      {coverPreview ? (
                        <img src={coverPreview} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2 p-8 text-center animate-pulse">
                           <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 4v16m8-8H4"/></svg>
                           <span className="text-[9px] font-black uppercase tracking-widest">Chọn ảnh bìa</span>
                        </div>
                      )}
                    </div>
                    <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" accept="image/*" onChange={handleCoverChange} />
                 </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-[#4caf50]/70 uppercase tracking-widest block pl-1">Vị trí hiển thị</label>
                    <button 
                       type="button"
                       onClick={() => setIsFeatured(!isFeatured)}
                       className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between group ${isFeatured ? 'bg-[#4caf50]/10 border-[#4caf50] shadow-[0_0_20px_rgba(76,175,80,0.1)]' : 'bg-black/40 border-[#2a332a] hover:border-[#4caf50]/30'}`}
                    >
                       <div className="flex flex-col items-start gap-1">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${isFeatured ? 'text-[#4caf50]' : 'text-gray-500'}`}>Ghim lên Banner</span>
                          <span className="text-[8px] text-gray-600 font-medium uppercase">Xuất hiện tại khu vực siêu phẩm đầu trang</span>
                       </div>
                       <div className={`w-10 h-6 rounded-full relative transition-colors ${isFeatured ? 'bg-[#4caf50]' : 'bg-gray-800'}`}>
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isFeatured ? 'right-1' : 'left-1'}`}></div>
                       </div>
                    </button>
                 </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-[#4caf50]/70 uppercase tracking-widest block pl-1">Trạng thái phát hành</label>
                    <div className="flex bg-black/50 p-1 rounded-xl border border-[#2a332a] shadow-inner">
                       <button 
                         type="button" 
                         onClick={() => setStatus("ongoing")}
                         className={`flex-1 py-3 text-[10px] font-black rounded-lg transition-all ${status === "ongoing" ? "bg-[#4caf50] text-[#0a0c0a] shadow-lg" : "text-gray-500 hover:text-gray-300"}`}
                       >
                         ĐANG TIẾN HÀNH
                       </button>
                       <button 
                         type="button" 
                         onClick={() => setStatus("completed")}
                         className={`flex-1 py-3 text-[10px] font-black rounded-lg transition-all ${status === "completed" ? "bg-[#4caf50] text-[#0a0c0a] shadow-lg" : "text-gray-500 hover:text-gray-300"}`}
                       >
                         HOÀN THÀNH
                       </button>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-[#4caf50]/70 uppercase tracking-widest block pl-1">Kiểu đọc mặc định</label>
                    <div className="flex bg-black/50 p-1 rounded-xl border border-[#2a332a] shadow-inner">
                       <button 
                         type="button" 
                         onClick={() => setDefaultReadingMode("scroll")}
                         className={`flex-1 py-3 text-[10px] font-black rounded-lg transition-all ${defaultReadingMode === "scroll" ? "bg-[#4caf50] text-[#0a0c0a] shadow-lg" : "text-gray-500 hover:text-gray-300"}`}
                       >
                         DỌC (WEBTOON)
                       </button>
                       <button 
                         type="button" 
                         onClick={() => setDefaultReadingMode("page")}
                         className={`flex-1 py-3 text-[10px] font-black rounded-lg transition-all ${defaultReadingMode === "page" ? "bg-[#4caf50] text-[#0a0c0a] shadow-lg" : "text-gray-500 hover:text-gray-300"}`}
                       >
                         NGANG (MANGA)
                       </button>
                    </div>
                 </div>
              </div>
            </AdminCard>

            <div className="pt-2">
              <AdminButton type="submit" disabled={loading} className="w-full">
                {loading ? "ĐANG LƯU DỮ LIỆU..." : (isEditing ? "CẬP NHẬT THIẾT LẬP 👋" : "KHỞI TẠO TRUYỆN MỚI 👋")}
              </AdminButton>
            </div>
          </div>
        </form>

        {isEditing && (
           <div className="mt-20 pt-10 border-t border-red-500/10 flex flex-col items-center gap-6 pb-20">
              <div className="text-center space-y-2">
                 <h3 className="text-red-500 font-black uppercase text-[10px] tracking-widest">Khu vực nguy hiểm</h3>
                 <p className="text-gray-600 text-[9px] font-medium uppercase">Xóa toàn bộ dữ liệu truyện và các tệp ảnh trên Cloudflare R2</p>
              </div>
              
              {!showDeleteModal ? (
                <button 
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="px-8 py-3 rounded-xl bg-red-500/5 border border-red-500/10 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 transition-all font-black text-[10px] uppercase tracking-widest"
                >
                  Xóa truyện vĩnh viễn
                </button>
              ) : (
                <div className="w-full max-w-md bg-red-500/5 border border-red-500/20 p-8 rounded-[32px] space-y-6">
                   <div className="space-y-2 text-center">
                      <p className="text-xs font-bold text-red-500 uppercase">Xác nhận xóa?</p>
                      <p className="text-[9px] text-gray-500 uppercase leading-relaxed">Nhập đúng tên truyện <span className="text-white font-black">"{title}"</span> để xác nhận hành động không thể hoàn tác này.</p>
                   </div>
                   <input 
                      type="text" 
                      value={deleteConfirm} 
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                      className="w-full bg-black/40 border border-red-500/30 rounded-xl p-3 text-center text-xs font-bold text-white outline-none focus:border-red-500 transition-all"
                      placeholder="Nhập tên truyện..."
                   />
                   <div className="flex gap-3">
                      <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 rounded-xl bg-white/5 text-[9px] font-black uppercase hover:bg-white/10 transition-all">Hủy</button>
                      <button 
                        onClick={handleDeleteManga}
                        disabled={deleteConfirm !== title || loading}
                        className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${deleteConfirm === title ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-red-500/20 text-white/20 cursor-not-allowed'}`}
                      >
                        Xác nhận xóa
                      </button>
                   </div>
                </div>
              )}
           </div>
        )}
      </div>
    </div>
  );
}
