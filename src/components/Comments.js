'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { calculateLevel, calculateTitle } from '@/lib/xp';
import { fixR2Url } from '@/lib/cloudinary';
import Link from 'next/link';
import { addCommentAction, toggleCommentLikeAction, deleteCommentAction } from '@/lib/actions';

// 🛠️ COMPONENT CON: FORM TRẢ LỜI 🚀
const ReplyForm = ({ parentComment, user, mangaId, chapterId, onCancel, onSuccess, fetchComments, checkCooldown }) => {
    const [replyContent, setReplyContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleReplySubmit = async () => {
      if (!replyContent.trim()) return;
      if (replyContent.length > 500) return alert("Bình luận quá dài (tối đa 500 ký tự).");
      if (checkCooldown && !checkCooldown()) return;
      try {
        setIsSubmitting(true);
        
        // 💬 TỰ ĐỘNG GẮN THẺ @ NẾU TRẢ LỜI MỘT BÌNH LUẬN CON 🍀
        // 🔍 CHỈ GỬI NỘI DUNG SẠCH (Bản tối ưu UI mới) 🍀
        const finalContent = replyContent.trim();

        console.log("💬 Gửi PHẢN HỒI (Server Action):", { manga_id: mangaId, parent_id: parentComment.parent_id || parentComment.id, content: finalContent });
        const res = await addCommentAction({
            manga_id: mangaId || null,
            chapter_id: chapterId || null,
            content: finalContent,
            parent_id: parentComment.id || null
        });

        console.log("💬 Kết quả PHẢN HỒI từ Server:", res);
        if (res.success) {
          setReplyContent('');
          onSuccess(); // Đóng form
          // Đợi 1.5s để đồng bộ hoàn tất trước khi fetch mới ⚡
          setTimeout(() => {
            console.log("🔄 Bắt đầu fetch lại bình luận sau khi reply thành công...");
            fetchComments(true);
          }, 800); 
        } else {
          console.error("❌ Lỗi phản hồi (Server):", res.error);
          alert(`LỖI: ${res.error}\n(Bạn có thể cần đăng xuất và đăng nhập lại để làm mới phiên)`);
        }
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="mt-4 animate-fade-in-up space-y-2">
         <div className="relative">
             <textarea autoFocus maxLength={500} placeholder={parentComment.parent_id ? `Đang trả lời @${parentComment.user_name}...` : "Viết phản hồi của bạn..."} value={replyContent} onChange={(e) => setReplyContent(e.target.value)} className="w-full bg-black/60 border border-[#4caf50]/20 rounded-xl py-3 px-4 text-xs focus:border-[#4caf50] outline-none transition-all text-gray-300 min-h-[70px] resize-none shadow-inner"></textarea>
             <span className={`absolute bottom-3 right-3 text-[9px] font-black ${replyContent.length >= 500 ? 'text-red-500' : 'text-gray-500'}`}>{replyContent.length}/500</span>
         </div>
         <div className="flex justify-end gap-3 mt-1">
            <button onClick={onCancel} className="text-[8px] font-black text-gray-600 hover:text-white uppercase tracking-widest">Hủy</button>
            <button onClick={handleReplySubmit} disabled={isSubmitting} className="px-5 py-2 bg-[#4caf50] text-[#0a0c0a] font-black rounded-lg text-[9px] shadow-lg shadow-[#4caf50]/20 uppercase tracking-widest">{isSubmitting ? 'ĐANG GỬI...' : 'GỬI ✨'}</button>
         </div>
      </div>
    );
};

// 🛠️ COMPONENT CON: ITEM BÌNH LUẬN 🚀
const CommentItem = ({ comment, isReply = false, allComments = [], user, replyTo, setReplyTo, handleLike, handleDelete, localLikes, mangaId, chapterId, fetchComments, checkCooldown }) => {
    const isReplyingThis = replyTo?.id === comment.id;
    const cK = (s) => (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').trim().toLowerCase();
        const key = cK(comment.user_name);
    const isAdmin = key.includes('admin') || key.includes('quan tri') || key.includes('shiroi arika');

    // 🔍 TÌM THÔNG TIN NGƯỜI ĐƯỢC PHẢN HỒI (UI MỚI) 🍀
    let replyingTo = null;
    if (comment.parent_id) {
        const parent = allComments.find(c => String(c.id) === String(comment.parent_id));
        if (parent) replyingTo = parent.user_name;
    }

    return (
      <div className={`${isReply ? 'ml-10 border-l border-white/5 pl-6' : ''} group animate-fade-in`}>
        <div className="flex gap-4">
          <Link href={`/user/${comment.user_id}`} className="block shrink-0 group/avt">
            <div className={`${isReply ? 'w-8 h-8 rounded-lg' : 'w-12 h-12 rounded-2xl'} overflow-hidden bg-[#141814] border border-white/10 shadow-xl group-hover/avt:border-[#4caf50]/50 transition-all`}>
               <img src={fixR2Url(comment.display_avatar)} className="w-full h-full object-cover group-hover/avt:scale-110 transition-transform duration-500" alt="" onError={(e) => { e.currentTarget.removeAttribute('crossOrigin'); }} />
            </div>
          </Link>
          <div className="flex-1 space-y-2">
             <div className="flex items-center gap-2">
                <Link href={`/user/${comment.user_id}`} className="text-[10px] font-black uppercase tracking-tight hover:text-[#4caf50] transition-colors" style={{ color: 'var(--text-heading, var(--text-reader, white))' }}>{comment.user_name}</Link>
                {isAdmin ? (
                  <span className="text-[10px] text-[#4caf50] font-black uppercase tracking-widest bg-[#4caf50]/5 px-3 py-1 rounded-lg border border-[#4caf50]/20 shadow-[0_0_10px_rgba(76,175,80,0.1)] shrink-0">BAN QUẢN TRỊ 🍀</span>
                ) : (
                  <>
                    <span className="text-[7px] font-black uppercase text-[#4caf50] bg-[#4caf50]/5 px-2 py-0.5 rounded border border-[#4caf50]/20 tracking-widest">{comment.display_badge}</span>
                    {comment.display_level && <span className="text-[9px] text-gray-500 font-bold border-l border-white/10 pl-3">LV.{comment.display_level}</span>}
                  </>
                )}
                
                {/* 📖 NHÃN PHÂN LOẠI CHƯƠNG / TỔNG 🍀 */}
                {!isReply && (
                   <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-md border border-white/5 bg-white/[0.02] text-gray-400 group-hover:border-[#4caf50]/20 group-hover:text-[#4caf50] transition-all tracking-tighter shrink-0">
                     {comment.chapters?.chapter_number ? `Chương ${comment.chapters.chapter_number}` : 'Bình luận tổng'}
                   </span>
                )}

                {(() => {
                   if (!user) return false;
                   const currentUserIsAdmin = cK(user.display_name || user.username).includes('admin') || 
                                              cK(user.display_name || user.username).includes('quan tri') || 
                                              cK(user.display_name || user.username).includes('shiroi arika');
                   if (currentUserIsAdmin) return true;
                   const myNameNormal = cK(user.display_name || user.username);
                   const commentNameNormal = cK(comment.user_name);
                   const myId = user.id?.toString();
                   const commentUserId = comment.user_id?.toString();
                   return (myId && myId === commentUserId) || (myNameNormal === commentNameNormal);
                })() && (
                   <button onClick={() => handleDelete(comment.id)} className="ml-2 text-[8px] font-black text-gray-800 hover:text-red-500 transition-colors uppercase tracking-tighter opacity-0 group-hover:opacity-100">[Xóa]</button>
                )}
                <span className="text-[8px] text-gray-700 font-bold ml-auto">{new Date(comment.created_at).toLocaleTimeString('vi-VN')}</span>
             </div>
             {replyingTo && (
                <div className="flex items-center gap-1.5 mb-1.5 ml-2 opacity-60">
                   <svg className="w-2.5 h-2.5 text-[#4caf50]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                   <span className="text-[9px] font-black uppercase text-[#4caf50]">Phản hồi @{replyingTo}</span>
                </div>
             )}
             <div className="p-4 rounded-2xl rounded-tl-none border border-white/5 transition-all shadow-sm" style={{ backgroundColor: 'var(--bg-card-reader, rgba(20, 24, 20, 0.5))' }}>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted-reader, #9ca3af)' }}>
                  {(() => {
                      if (!replyingTo || !comment.content) return comment.content;
                      // 🔍 TỰ ĐỘNG LỌC BỎ @username NẾU TRÙNG VỚI NGƯỜI ĐƯỢC PHẢN HỒI 🍀
                      const tag = `@${replyingTo}`;
                      if (comment.content.startsWith(tag)) {
                          return comment.content.substring(tag.length).trim();
                      }
                      return comment.content;
                  })()}
                </p>
             </div>
             <div className="flex items-center gap-6 ml-1">
                <button onClick={() => handleLike(comment.id)} className={`flex items-center gap-1.5 text-[9px] font-black transition-all ${localLikes[comment.id] ? 'text-red-500 scale-110' : 'text-gray-600 hover:text-red-500'}`}>
                   <svg className="w-3 h-3" fill={localLikes[comment.id] ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                   {comment.likes_count || 0}
                </button>
                {/* 💬 MỞ NÚT TRẢ LỜI CHO TẤT CẢ TẦNG 🚀 */}
                <button onClick={() => setReplyTo(isReplyingThis ? null : comment)} className={`flex items-center gap-1 text-[9px] font-black transition-colors ${isReplyingThis ? 'text-[#4caf50]' : 'text-gray-600 hover:text-[#4caf50]'}`}>
                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                   TRẢ LỜI
                </button>
             </div>
             {isReplyingThis && (
                <ReplyForm 
                    parentComment={comment} 
                    user={user} 
                    mangaId={mangaId} 
                    chapterId={chapterId} 
                    onCancel={() => setReplyTo(null)} 
                    onSuccess={() => setReplyTo(null)} 
                    fetchComments={fetchComments}
                    checkCooldown={checkCooldown}
                />
             )}
          </div>
        </div>
      </div>
    );
};

export default function Comments({ mangaId, chapterId }) {
  const [comments, setComments] = useState([]);
  const [user, setUser] = useState(null);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [localLikes, setLocalLikes] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [xpToast, setXpToast] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedThreads, setExpandedThreads] = useState({});
  const [lastCommentTime, setLastCommentTime] = useState(0);

  const checkCooldown = () => {
      const now = Date.now();
      const diff = now - lastCommentTime;
      if (diff < 5000) {
          alert(`Vui lòng đợi ${Math.ceil((5000 - diff) / 1000)}s để tiếp tục bình luận (chống spam 🍀).`);
          return false;
      }
      setLastCommentTime(now);
      return true;
  };

  // 🔍 HÀM TÌM TẤT CẢ CON CHÁU ĐỂ HIỂN THỊ DẠNG PHẲNG (2 CẤP) 🍀
  const getAllDescendants = (parentId, allComments) => {
    let results = [];
    const directChildren = allComments.filter(c => String(c.parent_id) === String(parentId));
    
    directChildren.forEach(child => {
        results.push(child);
        const grandchildren = getAllDescendants(child.id, allComments);
        results = results.concat(grandchildren);
    });
    
    return results;
  };


  useEffect(() => {
    const checkSession = () => {
      localStorage.removeItem('shiroi_comment_likes');
      const storedUser = localStorage.getItem('shiroi_user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        setUser(u);
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
    setIsMounted(true);
    
    // 🕵️‍♂️ ĐỒNG BỘ COOKIE (Dành cho Server Actions) 🍪
    const syncCookie = async () => {
        const storedUser = localStorage.getItem('shiroi_user');
        if (storedUser) {
            try {
                const u = JSON.parse(storedUser);
                // Nếu chưa có Cookie, hãy gọi loginAction (silent) để tạo lại Cookie
                // Điều này giúp Server Action getAuthenticatedUser() hoạt động chính xác
                const res = await fetch('/api/auth-sync', { 
                    method: 'POST', 
                    body: JSON.stringify(u),
                    headers: { 'Content-Type': 'application/json' }
                }).catch(() => null);
            } catch (e) {}
        }
    };
    syncCookie();

    // ⚡ KÍCH HOẠT REAL-TIME CAO CẤP CHO BÌNH LUẬN 🚀
    const channel = supabase
        .channel(`room-${mangaId || chapterId || 'global'}`)
        .on('postgres_changes', { 
            event: '*', // Nghe cả INSERT, UPDATE, DELETE 🎯
            schema: 'public', 
            table: 'comments',
            // Lọc theo manga_id hoặc chapter_id để tránh nhận nhầm của truyện khác
            filter: mangaId ? `manga_id=eq.${mangaId}` : (chapterId ? `chapter_id=eq.${chapterId}` : undefined)
        }, (payload) => {
            console.log("💬 Phát hiện thay đổi bình luận (Real-time):", payload.eventType);
            fetchComments(true); // Tải lại danh sách (Silent) khi có bất kỳ thay đổi nào
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log("✅ Đã kết nối Real-time cho mục Bình luận");
            }
        });

    return () => {
        window.removeEventListener('storage', checkSession);
        supabase.removeChannel(channel);
    };
}, [mangaId, chapterId]);

  const fetchComments = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      let query = supabase.from('comments').select('*, chapters(chapter_number)');
      if (chapterId) query = query.eq('chapter_id', chapterId);
      else if (mangaId) query = query.eq('manga_id', mangaId);
      const { data: cData } = await query.order('created_at', { ascending: false });
      
      // 🚀 TỐI ƯU HÓA: Chỉ lấy thông tin những người thực sự đã bình luận 🕵️‍♂️
      const commentUserIds = [...new Set(cData?.map(c => c.user_id).filter(id => !!id))];
      const commentUserNames = [...new Set(cData?.map(c => c.user_name).filter(name => !!name))];
      
      let uData = [];
      if (commentUserIds.length > 0 || commentUserNames.length > 0) {
          const userQuery = supabase.from('shiroi_users').select('id, username, display_name, avatar_url, bio, role, xp, level, created_at, selected_badge');
          
          if (commentUserIds.length > 0 && commentUserNames.length > 0) {
              userQuery.or(`id.in.(${commentUserIds.map(id => `"${id}"`).join(',')}),username.in.(${commentUserNames.map(name => `"${name}"`).join(',')})`);
          } else if (commentUserIds.length > 0) {
              userQuery.in('id', commentUserIds);
          } else {
              userQuery.in('username', commentUserNames);
          }
          
          const { data } = await userQuery;
          uData = data || [];
      }

      const uMap = {};
      const cK = (s) => (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').trim().toLowerCase();

      uData.forEach(u => {
         const info = {  
            avatar: u.avatar_url, 
            badge: calculateTitle(u.xp, u.selected_badge).name, 
            level: calculateLevel(u.xp) 
         };
         if (u.id) uMap[u.id] = info;
         const nameKey = cK(u.username);
         if (!uMap[nameKey]) uMap[nameKey] = info;
      });

      console.log("🔍 [Fetch] Đang lọc bình luận cho:", { mangaId, chapterId, totalRaw: cData?.length });
      const filtered = cData || [];
      
      console.log("🔍 [Fetch] Sau khi lọc:", filtered.length);
      
      const enriched = filtered.map(c => {
          const key = cK(c.user_name);
          const info = (c.user_id && uMap[c.user_id]) ? uMap[c.user_id] : uMap[key];
          const isAd = key.includes('admin') || key.includes('quan tri') || key.includes('shiroi arika');
          return {
             ...c,
             display_avatar: info?.avatar || (isAd ? "https://psgivxgycjireinwnelc.supabase.co/storage/v1/object/public/avatars/Admin-1775229030334.jpg" : "https://psgivxgycjireinwnelc.supabase.co/storage/v1/object/public/avatars/default-avatar.png"),
             display_badge: info?.badge || (isAd ? 'BAN QUẢN TRỊ' : 'Vô danh tiểu tốt'),
             display_level: info?.level || 1
          };
      });
      setComments(enriched);
    } catch (err) { console.error("Lỗi thảo luận:", err); } finally { if (!silent) setLoading(false); }
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
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, likes_count: newCount } : c));
    try { 
      await toggleCommentLikeAction(commentId, newCount); 
    } catch (err) { 
      console.error("Lỗi LIKE:", err); 
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("BAN QUẢN TRỊ / Bạn có chắc muốn xóa lời nói này? 🍀")) return;
    const originalComments = [...comments];
    setComments(prev => prev.filter(c => c.id !== id && c.parent_id !== id));
    try {
      const res = await deleteCommentAction(id);
      if (!res.success) { 
          setComments(originalComments); 
          alert(res.error || "Không thể xóa bình luận!");
      } else { 
          fetchComments(true); 
      }
    } catch (err) { setComments(originalComments); }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!user || !content.trim()) return;
    if (content.length > 500) return alert("Bình luận quá dài (tối đa 500 ký tự).");
    if (!checkCooldown()) return;
    try {
      setSubmitting(true);
      console.log("💬 Gửi bình luận:", { mangaId, chapterId, content: content.trim() });
      const res = await addCommentAction({
          manga_id: mangaId || null,
          chapter_id: chapterId || null,
          content: content.trim(),
          parent_id: null
      });

      console.log("💬 Kết quả bình luận từ Server:", res);
      if (res.success) {
        setContent('');
        setTimeout(() => fetchComments(true), 1000); // Tăng lên 1s ⚡
        setXpToast("✨ GỬI LỜI THẢO LUẬN THÀNH CÔNG! 🚀");
        setTimeout(() => setXpToast(false), 3000);
      } else {
        console.error("❌ Lỗi bình luận (Server):", res.error);
        alert(`KHÔNG THỂ GỬI BÌNH LUẬN: ${res.error}\n(Lưu ý: Hãy thử đăng xuất và đăng nhập lại)`);
      }
    } finally { setSubmitting(false); }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-12">
      <div className="flex items-center space-x-3 mb-10">
        <div className="w-1.5 h-6 bg-[#4caf50] rounded-full shadow-[0_0_10px_#4caf50]"></div>
        <h2 className="text-xl font-black tracking-tight uppercase" style={{ color: 'var(--text-reader, white)' }}>Thảo luận Shiroi <span className="text-gray-600 font-normal ml-1">({comments.length})</span></h2>
      </div>

      {xpToast && (
        <div className="fixed top-24 right-4 z-[30000] bg-gradient-to-r from-amber-500 to-orange-500 text-black px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl animate-bounce border-2 border-white/20">
            ✨ KHO THÀNH TỰU +5 XP ! 🚀
        </div>
      )}

      {!replyTo && user && (
        <form onSubmit={handleSubmit} className="bg-[#141814]/60 backdrop-blur-xl border border-white/5 p-6 rounded-[32px] mb-12 shadow-2xl relative group overflow-hidden">
             <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-[#4caf50]/20 to-transparent"></div>
             <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/5 shadow-lg bg-[#0a0c0a]">
                    <img src={user.avatar_url || 'https://psgivxgycjireinwnelc.supabase.co/storage/v1/object/public/avatars/default-avatar.png'} className="w-full h-full object-cover" alt="" />
                 </div>
                 <span className="text-[8px] font-black uppercase tracking-widest italic" style={{ color: 'var(--text-muted-reader, #6b7280)' }}>Gửi lời thảo luận 🍀</span>
             </div>
             <div className="relative">
                 <textarea maxLength={500} placeholder={chapterId ? "Cảm nhận về chương này..." : "Cảm nhận về truyện..."} value={content} onChange={(e) => setContent(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-6 text-sm focus:border-[#4caf50] outline-none transition-all min-h-[100px] resize-none shadow-inner" style={{ color: 'var(--text-reader, #d1d5db)' }}></textarea>
                 <span className={`absolute bottom-4 right-4 text-[10px] font-black ${content.length >= 500 ? 'text-red-500' : 'text-gray-500'}`}>{content.length}/500</span>
             </div>
             <div className="flex justify-end mt-4">
                 <button disabled={submitting} className="px-10 py-3 bg-[#4caf50] text-[#0a0c0a] font-black rounded-2xl shadow-xl shadow-[#4caf50]/20 hover:scale-105 active:scale-95 transition-all text-[10px] uppercase tracking-widest">{submitting ? '...' : 'XÁC NHẬN GỬI 🚀'}</button>
             </div>
        </form>
      )}

      <div className="space-y-12">
        {!isMounted || loading ? (
             <div className="text-center py-10 opacity-30 animate-pulse text-[10px] font-black uppercase tracking-widest text-[#4caf50]">Đang kết nối...</div>
        ) : comments.length === 0 ? (
             <div className="text-center py-20 bg-white/[0.01] rounded-[40px] border border-dashed border-white/5 text-gray-800 font-black text-[9px] uppercase tracking-[0.4em]">KHÔNG CÓ TIẾNG NÓI NÀO...</div>
        ) : (
          (() => {
              const parentComments = comments.filter(c => !c.parent_id);
              const COMMENTS_PER_PAGE = 10;
              const totalPages = Math.max(1, Math.ceil(parentComments.length / COMMENTS_PER_PAGE));
              const visibleParents = parentComments.slice((currentPage - 1) * COMMENTS_PER_PAGE, currentPage * COMMENTS_PER_PAGE);

              return (
                <>
                  {visibleParents.map((comment) => {
                    const allReplies = getAllDescendants(comment.id, comments).sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
                    const isExpanded = expandedThreads[comment.id];
                    const visibleReplies = isExpanded ? allReplies : allReplies.slice(allReplies.length > 0 ? allReplies.length - 1 : 0);
                    
                    return (
                      <div key={comment.id} className="space-y-6">
                        <CommentItem allComments={comments} 
                          comment={comment} 
                          user={user} 
                          replyTo={replyTo} 
                          setReplyTo={setReplyTo} 
                          handleLike={handleLike} 
                          handleDelete={handleDelete} 
                          localLikes={localLikes} 
                          mangaId={mangaId} 
                          chapterId={chapterId} 
                          fetchComments={fetchComments}
                          checkCooldown={checkCooldown}
                        />
                        <div className="space-y-6">
                          {allReplies.length > 1 && !isExpanded && (
                             <button onClick={() => setExpandedThreads(p => ({...p, [comment.id]: true}))} className="ml-10 text-[9px] font-black uppercase text-[#4caf50] bg-[#4caf50]/5 hover:bg-[#4caf50]/10 border border-[#4caf50]/20 px-4 py-2 rounded-xl transition-all shadow-sm">
                                ↪ Xem thêm {allReplies.length - 1} phản hồi khác
                             </button>
                          )}
                          {visibleReplies.map(reply => (
                            <CommentItem allComments={comments} 
                              key={reply.id} 
                              comment={reply} 
                              isReply={true} 
                              user={user} 
                              replyTo={replyTo}
                              setReplyTo={setReplyTo}
                              handleLike={handleLike} 
                              handleDelete={handleDelete} 
                              localLikes={localLikes} 
                              fetchComments={fetchComments}
                              checkCooldown={checkCooldown}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-12 pt-8 border-t border-white/5">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#4caf50] hover:text-black transition-all">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div className="flex items-center gap-1">
                           {[...Array(totalPages)].map((_, i) => (
                             <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-10 h-10 rounded-xl text-[11px] font-black transition-all ${currentPage === i + 1 ? 'bg-[#4caf50] text-black shadow-[0_0_15px_rgba(76,175,80,0.3)]' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                                {i + 1}
                             </button>
                           ))}
                        </div>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#4caf50] hover:text-black transition-all">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                  )}
                </>
              );
          })()
        )}
      </div>
    </div>
  );
}
