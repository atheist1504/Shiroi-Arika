'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { calculateLevel } from '@/lib/xp';

export default function Comments({ mangaId, chapterId }) {
  const [comments, setComments] = useState([]);
  const [user, setUser] = useState(null);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [localLikes, setLocalLikes] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const checkSession = () => {
      // 🧹 TỔNG VỆ SINH: Xóa bỏ thùng chứa Like chung cũ nếu còn tồn tại
      localStorage.removeItem('shiroi_comment_likes');

      const storedUser = localStorage.getItem('shiroi_user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        setUser(u);
        
        // Tải trạng thái liked RIÊNG BIỆT theo ID (Chuẩn nhất) 🛡️
        const likesKey = `shiroi_comment_likes_${u.id}`;
        const storedLikes = localStorage.getItem(likesKey);
        setLocalLikes(storedLikes ? JSON.parse(storedLikes) : {});
      } else {
        setUser(null);
        setLocalLikes({});
      }
    };
    checkSession();

    window.addEventListener('storage', checkSession);
    fetchComments();
    return () => window.removeEventListener('storage', checkSession);
  }, [mangaId, chapterId]);

  const fetchComments = async () => {
    // ... (giữ nguyên logic fetch cũ)
    try {
      setLoading(true);
      const { data: cData } = await supabase
        .from('comments')
        .select('*, chapters(chapter_number)')
        .order('created_at', { ascending: false });
      
      const { data: uData } = await supabase.from('shiroi_users').select('*');
      const uMap = {};
      const cK = (s) => (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').trim().toLowerCase();

      uData?.forEach(u => {
         const info = { 
           avatar: u.avatar_url, 
           badge: u.selected_badge || 'Lữ Khách', 
           level: calculateLevel(u.xp)
         };
         // ƯU TIÊN ID LÀM KEY 🛡️
         if (u.id) uMap[u.id] = info;
         
         // Fallback bằng tên (Chỉ dành cho các comment cũ chưa có user_id)
         const nameKey = cK(u.username);
         if (!uMap[nameKey]) uMap[nameKey] = info;
         
         const displayNameKey = cK(u.display_name);
         if (!uMap[displayNameKey]) uMap[displayNameKey] = info;
      });

      const filtered = (chapterId 
        ? (cData?.filter(c => c.chapter_id === chapterId) || [])
        : (mangaId ? (cData?.filter(c => c.manga_id === mangaId) || []) : (cData || []))
      );

      const enriched = filtered.map(c => {
          const key = cK(c.user_name);
          // ƯU TIÊN TÌM THEO ID 🎯
          const info = (c.user_id && uMap[c.user_id]) ? uMap[c.user_id] : uMap[key];
          
          const isAd = key.includes('admin') || key.includes('quan tri') || key.includes('shiroi arika');
          return {
             ...c,
             display_avatar: info?.avatar || (isAd ? "https://psgivxgycjireinwnelc.supabase.co/storage/v1/object/public/avatars/Admin-1775229030334.jpg" : "https://psgivxgycjireinwnelc.supabase.co/storage/v1/object/public/avatars/default-avatar.png"),
             display_badge: info?.badge || (isAd ? 'BAN QUẢN TRỊ' : 'Lữ Khách'),
             display_level: info?.level || 1
          };
      });
      setComments(enriched);
    } catch (err) {
      console.error("Lỗi thảo luận:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (commentId) => {
    if (!user) return alert("Bác cần đăng nhập để thả tim nhé! 🍀");

    const likesKey = `shiroi_comment_likes_${user.id}`;
    const isLiked = localLikes[commentId];
    const newLikes = { ...localLikes, [commentId] : !isLiked };
    
    setLocalLikes(newLikes);
    localStorage.setItem(likesKey, JSON.stringify(newLikes));
    
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    const newCount = Math.max(0, (comment.likes_count || 0) + (isLiked ? -1 : 1));

    setComments(prev => prev.map(c => 
       c.id === commentId ? { ...c, likes_count: newCount } : c
    ));

    try {
       // 🛡️ TRƯỚC KHI LƯU: Kiểm tra quyền (Nếu bác chưa chạy lệnh SQL mở khóa RLS thì cái này sẽ báo lỗi)
       const { error } = await supabase
         .from('comments')
         .update({ likes_count: newCount })
         .eq('id', commentId);
         
       if (error) {
         console.error("Lỗi đồng bộ LIKE:", error);
         alert("LỖI LƯU LIKE: " + error.message + "\n\n-> Bác cần vào Supabase SQL Editor và chạy lệnh 'Cho phép cập nhật Like' tôi gửi nhé! 🍀");
         fetchComments(); // Quay về trạng thái cũ
       } else {
         console.log("Đã lưu Like thành công cho ID:", commentId);
       }
    } catch (err) {
       console.error("Lỗi đồng bộ LIKE:", err);
    }
  };
  const handleDelete = async (id) => {
    if (!window.confirm("BAN QUẢN TRỊ / Bạn có chắc muốn xóa lời nói này? 🍀")) return;
    
    // TẠM THỜI ẨN TRÊN MÀN HÌNH ĐỂ TẠO CẢM GIÁC MƯỢT 🚀
    const originalComments = [...comments];
    setComments(prev => prev.filter(c => c.id !== id && c.parent_id !== id));

    try {
      const { data, error } = await supabase.from('comments').delete().eq('id', id);
      
      if (error) {
        console.error("Lỗi xóa dứt điểm:", error);
        alert("CHƯA XÓA ĐƯỢC: " + error.message + " (Kiểm tra quyền RLS!)");
        setComments(originalComments); // Khôi phục lại ngay lập tức 🛡️
      } else {
        console.log("Đã xóa vĩnh viễn ID:", id);
        fetchComments(); // Đồng bộ hóa chuẩn với máy chủ ✨
      }
    } catch (err) {
      console.error(err);
      setComments(originalComments);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!user || !content.trim()) return;
    try {
      setSubmitting(true);
      const { error } = await supabase.from('comments').insert([{
          manga_id: mangaId || null,
          chapter_id: chapterId || null,
          user_id: user.id,
          user_name: user.display_name || user.username,
          content: content.trim(),
          parent_id: null
      }]);
      if (!error) {
        setContent('');
        fetchComments();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const ReplyForm = ({ parentComment, onCancel, onSuccess }) => {
    const [replyContent, setReplyContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleReplySubmit = async () => {
      if (!replyContent.trim()) return;
      try {
        setIsSubmitting(true);
        const { error } = await supabase.from('comments').insert([{
            manga_id: mangaId || null,
            chapter_id: chapterId || null,
            user_id: user.id,
            user_name: user.display_name || user.username,
            content: replyContent.trim(),
            parent_id: parentComment.id
        }]);
        if (!error) {
          setReplyContent('');
          onSuccess();
          fetchComments();
        }
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="mt-4 animate-fade-in-up space-y-2">
         <textarea autoFocus placeholder={`Đang trả lời @${parentComment.user_name}...`} value={replyContent} onChange={(e) => setReplyContent(e.target.value)} className="w-full bg-black/60 border border-[#4caf50]/20 rounded-xl py-3 px-4 text-xs focus:border-[#4caf50] outline-none transition-all text-gray-300 min-h-[70px] resize-none shadow-inner"></textarea>
         <div className="flex justify-end gap-3 mt-1">
            <button onClick={onCancel} className="text-[8px] font-black text-gray-600 hover:text-white uppercase tracking-widest">Hủy</button>
            <button onClick={handleReplySubmit} disabled={isSubmitting} className="px-5 py-2 bg-[#4caf50] text-[#0a0c0a] font-black rounded-lg text-[9px] shadow-lg shadow-[#4caf50]/20 uppercase tracking-widest">{isSubmitting ? '...' : 'GỬI ✨'}</button>
         </div>
      </div>
    );
  };

  const CommentItem = ({ comment, isReply = false, onDelete }) => {
    const isReplyingThis = replyTo?.id === comment.id;
    const cK = (s) => (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').trim().toLowerCase();
    const key = cK(comment.user_name);
    const isAdmin = key.includes('admin') || key.includes('quan tri') || key.includes('shiroi arika');

    return (
      <div className={`${isReply ? 'ml-10 border-l border-white/5 pl-6' : ''} group animate-fade-in`}>
        <div className="flex gap-4">
          <div className={`${isReply ? 'w-8 h-8 rounded-lg' : 'w-12 h-12 rounded-2xl'} overflow-hidden bg-[#141814] border border-white/10 shrink-0 shadow-xl`}>
             <img src={comment.display_avatar} className="w-full h-full object-cover" alt="" />
          </div>
          <div className="flex-1 space-y-2">
             <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-white uppercase tracking-tight">{comment.user_name}</span>
                {isAdmin ? (
                  <span className="text-[10px] text-[#4caf50] font-black uppercase tracking-widest bg-[#4caf50]/5 px-3 py-1 rounded-lg border border-[#4caf50]/20 shadow-[0_0_10px_rgba(76,175,80,0.1)] shrink-0">BAN QUẢN TRỊ 🍀</span>
                ) : (
                  <>
                    <span className="text-[7px] font-black uppercase text-[#4caf50] bg-[#4caf50]/5 px-2 py-0.5 rounded border border-[#4caf50]/20 tracking-widest">{comment.display_badge}</span>
                    {comment.display_level && <span className="text-[9px] text-gray-500 font-bold border-l border-white/10 pl-3">LV.{comment.display_level}</span>}
                  </>
                )}
                
                {/* NÚT XÓA (Quyền rạch ròi: Chính chủ hoặc Admin) 🛡️ */}
                {(() => {
                   if (!user) return false;
                   
                   // 1. Kiểm tra xem người đang xem có phải Admin không 🤴
                   const currentUserIsAdmin = cK(user.display_name || user.username).includes('admin') || 
                                              cK(user.display_name || user.username).includes('quan tri') || 
                                              cK(user.display_name || user.username).includes('shiroi arika');
                   
                   if (currentUserIsAdmin) return true; // Bạn là Admin, bạn xóa gì cũng được ✨🧚‍♂️🛡️‍♂️
                   
                   // 2. Nếu là người thường: Chỉ xóa được của chính mình 🚶🍀
                   const myNameNormal = cK(user.display_name || user.username);
                   const commentNameNormal = cK(comment.user_name);
                   const myId = user.id?.toString();
                   const commentUserId = comment.user_id?.toString();

                   // Kiểm tra: Khớp ID HOẶC Khớp Tên chính chủ ✅
                   return (myId && myId === commentUserId) || (myNameNormal === commentNameNormal);
                })() && (
                   <button 
                     onClick={() => onDelete(comment.id)} 
                     className="ml-2 text-[8px] font-black text-gray-800 hover:text-red-500 transition-colors uppercase tracking-tighter opacity-0 group-hover:opacity-100"
                   >
                     [Xóa]
                   </button>
                )}
                <span className="text-[8px] text-gray-700 font-bold ml-auto">{new Date(comment.created_at).toLocaleTimeString('vi-VN')}</span>
             </div>
             <div className="bg-[#141814]/50 p-4 rounded-2xl rounded-tl-none border border-white/5 group-hover:bg-[#141814]/80 transition-all shadow-sm">
                <p className="text-gray-400 text-sm leading-relaxed">{comment.content}</p>
             </div>
             <div className="flex items-center gap-6 ml-1">
                <button onClick={() => handleLike(comment.id)} className={`flex items-center gap-1.5 text-[9px] font-black transition-all ${localLikes[comment.id] ? 'text-red-500 scale-110' : 'text-gray-600 hover:text-red-500'}`}>
                   <svg className="w-3 h-3" fill={localLikes[comment.id] ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                   {comment.likes_count || 0}
                </button>
                {!isReply && (
                   <button onClick={() => setReplyTo(isReplyingThis ? null : comment)} className={`flex items-center gap-1 text-[9px] font-black transition-colors ${isReplyingThis ? 'text-[#4caf50]' : 'text-gray-600 hover:text-[#4caf50]'}`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                      TRẢ LỜI
                   </button>
                )}
             </div>
             {isReplyingThis && (
                <ReplyForm parentComment={comment} onCancel={() => setReplyTo(null)} onSuccess={() => setReplyTo(null)} />
             )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-12">
      <div className="flex items-center space-x-3 mb-10">
        <div className="w-1.5 h-6 bg-[#4caf50] rounded-full shadow-[0_0_10px_#4caf50]"></div>
        <h2 className="text-xl font-black text-white tracking-tight uppercase">Thảo luận Shiroi <span className="text-gray-600 font-normal ml-1">({comments.length})</span></h2>
      </div>

      {!replyTo && user && (
        <form onSubmit={handleSubmit} className="bg-[#141814]/60 backdrop-blur-xl border border-white/5 p-6 rounded-[32px] mb-12 shadow-2xl relative group overflow-hidden">
             <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-[#4caf50]/20 to-transparent"></div>
             <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/5 shadow-lg bg-[#0a0c0a]">
                    <img src={user.avatar_url || 'https://psgivxgycjireinwnelc.supabase.co/storage/v1/object/public/avatars/default-avatar.png'} className="w-full h-full object-cover" alt="" />
                 </div>
                 <div className="flex flex-col">
                     <span className="text-[8px] text-gray-600 font-black uppercase tracking-widest mb-0.5 italic">Gửi lời thảo luận 🍀</span>
                 </div>
             </div>
             <textarea placeholder={chapterId ? "Cảm nhận về chương này..." : "Cảm nhận về truyện..."} value={content} onChange={(e) => setContent(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-6 text-sm focus:border-[#4caf50] outline-none transition-all min-h-[100px] resize-none text-gray-300 placeholder:text-gray-800 shadow-inner"></textarea>
             <div className="flex justify-end mt-4">
                 <button disabled={submitting} className="px-10 py-3 bg-[#4caf50] text-[#0a0c0a] font-black rounded-2xl shadow-xl shadow-[#4caf50]/20 hover:scale-105 active:scale-95 transition-all text-[10px] uppercase tracking-widest">{submitting ? '...' : 'XÁC NHẬN GỬI 🚀'}</button>
             </div>
        </form>
      )}

      {!user && (
        <div className="bg-[#141814]/40 border border-dashed border-white/5 p-8 rounded-[32px] mb-12 text-center text-gray-700 font-black text-[9px] uppercase tracking-widest cursor-pointer hover:bg-[#141814]/60 transition-all">ĐĂNG NHẬP ĐỂ THAM GIA THẢO LUẬN SHIROI! 🍀</div>
      )}

      <div className="space-y-12">
        {loading ? (
             <div className="text-center py-10 opacity-30 animate-pulse text-[10px] font-black uppercase tracking-widest text-[#4caf50]">Đang kết nối...</div>
        ) : comments.length === 0 ? (
             <div className="text-center py-20 bg-white/[0.01] rounded-[40px] border border-dashed border-white/5 text-gray-800 font-black text-[9px] uppercase tracking-[0.4em]">KHÔNG CÓ TIẾNG NÓI NÀO...</div>
        ) : (
          comments.filter(c => !c.parent_id).map((comment) => (
            <div key={comment.id} className="space-y-6">
              <CommentItem comment={comment} onDelete={handleDelete} />
              <div className="space-y-6">
                {comments.filter(r => r.parent_id === comment.id).sort((a,b) => new Date(a.created_at) - new Date(b.created_at)).map(reply => (
                  <CommentItem key={reply.id} comment={reply} isReply={true} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
