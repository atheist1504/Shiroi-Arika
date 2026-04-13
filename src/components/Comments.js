'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { calculateLevel, calculateTitle, XP_REWARDS, recordXpLog } from '@/lib/xp';
import { fixR2Url } from '@/lib/cloudinary';
import Link from 'next/link';

// 🛠️ COMPONENT CON: FORM TRẢ LỜI (Đưa ra ngoài để tránh nháy 🚀)
const ReplyForm = ({ parentComment, user, mangaId, chapterId, onCancel, onSuccess, fetchComments }) => {
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
          // Gọi callback cộng XP từ cha nếu cần, hoặc tự xử lý ở đây 🍀
          window.dispatchEvent(new CustomEvent('shiroi_xp_reward', { detail: { type: 'comment' } }));
          fetchComments(true); // Silent refresh
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

// 🛠️ COMPONENT CON: ITEM BÌNH LUẬN (Đưa ra ngoài để tránh nháy 🚀)
const CommentItem = ({ comment, isReply = false, user, replyTo, setReplyTo, handleLike, handleDelete, localLikes, mangaId, chapterId, fetchComments }) => {
    const isReplyingThis = replyTo?.id === comment.id;
    const cK = (s) => (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').trim().toLowerCase();
    const key = cK(comment.user_name);
    const isAdmin = key.includes('admin') || key.includes('quan tri') || key.includes('shiroi arika');

    return (
      <div className={`${isReply ? 'ml-10 border-l border-white/5 pl-6' : ''} group animate-fade-in`}>
        <div className="flex gap-4">
          <Link href={`/user/${comment.user_id}`} className="block shrink-0 group/avt">
            <div className={`${isReply ? 'w-8 h-8 rounded-lg' : 'w-12 h-12 rounded-2xl'} overflow-hidden bg-[#141814] border border-white/10 shadow-xl group-hover/avt:border-[#4caf50]/50 transition-all`}>
               <img src={fixR2Url(comment.display_avatar)} className="w-full h-full object-cover group-hover/avt:scale-110 transition-transform duration-500" alt="" crossOrigin="anonymous" referrerPolicy="no-referrer" />
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
                <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-md border border-white/5 bg-white/[0.02] text-gray-400 group-hover:border-[#4caf50]/20 group-hover:text-[#4caf50] transition-all tracking-tighter shrink-0">
                  {comment.chapters?.chapter_number ? `Chương ${comment.chapters.chapter_number}` : 'Bình luận tổng'}
                </span>

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
             <div className="p-4 rounded-2xl rounded-tl-none border border-white/5 transition-all shadow-sm" style={{ backgroundColor: 'var(--bg-card-reader, rgba(20, 24, 20, 0.5))' }}>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted-reader, #9ca3af)' }}>{comment.content}</p>
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
                <ReplyForm 
                    parentComment={comment} 
                    user={user} 
                    mangaId={mangaId} 
                    chapterId={chapterId} 
                    onCancel={() => setReplyTo(null)} 
                    onSuccess={() => setReplyTo(null)} 
                    fetchComments={fetchComments}
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
    
    // 👂 Lắng nghe sự kiện cộng XP từ component con hoặc chính mình 🍀
    const handleXPReward = () => giveCommentXP();
    window.addEventListener('shiroi_xp_reward', handleXPReward);

    fetchComments();
    return () => {
        window.removeEventListener('storage', checkSession);
        window.removeEventListener('shiroi_xp_reward', handleXPReward);
    };
  }, [mangaId, chapterId]);

  const giveCommentXP = async () => {
    if (!user) return;
    try {
        // 🕒 Thiết lập mốc thời gian "Hôm nay" (00:00:00) 🍀
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();

        // 🔍 Lấy tất cả bình luận của người dùng trong ngày hôm nay để tính toán XP 🕵️‍♂️
        const { data: todayComments, error: fetchErr } = await supabase
            .from('comments')
            .select('created_at')
            .eq('user_id', user.id)
            .gte('created_at', todayISO)
            .order('created_at', { ascending: true });

        if (fetchErr || !todayComments || todayComments.length === 0) return;

        // 🧠 THUẬT TOÁN MÔ PHỎNG PHẦN THƯỞNG (Simulated Rewards) 🏗️
        let totalXPEarnedToday = 0;
        let lastRewardedTime = 0;
        let rewardedCount = 0;
        let currentCommentShouldReward = false;
        let rewardAmount = 0;

        todayComments.forEach((c, index) => {
            const cTime = new Date(c.created_at).getTime();
            
            if (index === 0) {
                // Bình luận đầu tiên: Luôn nhận 10 XP 🥇
                totalXPEarnedToday += XP_REWARDS.FIRST_COMMENT;
                lastRewardedTime = cTime;
                rewardedCount++;
                if (index === todayComments.length - 1) {
                    currentCommentShouldReward = true;
                    rewardAmount = XP_REWARDS.FIRST_COMMENT;
                }
            } else {
                // Các bình luận tiếp theo: Check Cooldown 60s & Giới hạn 100 XP 🛡️
                if (cTime - lastRewardedTime >= XP_REWARDS.COMMENT_COOLDOWN && totalXPEarnedToday < XP_REWARDS.MAX_DAILY_COMMENT_XP) {
                    const amount = XP_REWARDS.SUBSEQUENT_COMMENT;
                    totalXPEarnedToday += amount;
                    lastRewardedTime = cTime;
                    rewardedCount++;
                    if (index === todayComments.length - 1) {
                        currentCommentShouldReward = true;
                        rewardAmount = amount;
                    }
                }
            }
        });

        // 🚀 Thực hiện cộng XP nếu thỏa mãn điều kiện
        if (currentCommentShouldReward && rewardAmount > 0) {
            const { data: latestUser } = await supabase.from('shiroi_users').select('xp').eq('id', user.id).single();
            const newXP = (latestUser?.xp || 0) + rewardAmount;
            const { error: updateErr } = await supabase.from('shiroi_users').update({ xp: newXP }).eq('id', user.id);
            
            if (!updateErr) {
                // 📝 GHI NHẬN NHẬT KÝ XP CHO BXH THÁNG 🏆
                await recordXpLog(supabase, user.id, rewardAmount, 'comment', mangaId || chapterId || 'General');

                const { data: updated } = await supabase.from('shiroi_users').select('*').eq('id', user.id).single();
                if (updated) {
                    localStorage.setItem('shiroi_user', JSON.stringify(updated));
                    setUser(updated);
                    // Hiển thị thông báo phần thưởng tương ứng 🔔
                    setXpToast(rewardAmount === XP_REWARDS.FIRST_COMMENT ? "✨ KHỞI ĐẦU NGÀY MỚI +10 XP! 🥇" : `✨ THẢO LUẬN TÍCH CỰC +${rewardAmount} XP! 🚀`);
                    setTimeout(() => setXpToast(false), 4000);
                    window.dispatchEvent(new Event('storage'));
                }
            }
        }
    } catch (err) { console.error("Lỗi xác thực XP bình luận:", err); }
  };

  const fetchComments = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const { data: cData } = await supabase.from('comments').select('*, chapters(chapter_number)').order('created_at', { ascending: false });
      const { data: uData } = await supabase.from('shiroi_users').select('*');
      const uMap = {};
      const cK = (s) => (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').trim().toLowerCase();

      uData?.forEach(u => {
         const info = {  avatar: u.avatar_url, badge: u.selected_badge || 'Vô danh tiểu tốt', level: calculateLevel(u.xp) };
         if (u.id) uMap[u.id] = info;
         const nameKey = cK(u.username);
         if (!uMap[nameKey]) uMap[nameKey] = info;
      });

      const filtered = (chapterId ? (cData?.filter(c => c.chapter_id === chapterId) || []) : (mangaId ? (cData?.filter(c => c.manga_id === mangaId) || []) : (cData || [])));
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
    try { await supabase.from('comments').update({ likes_count: newCount }).eq('id', commentId); } catch (err) { console.error("Lỗi LIKE:", err); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("BAN QUẢN TRỊ / Bạn có chắc muốn xóa lời nói này? 🍀")) return;
    const originalComments = [...comments];
    setComments(prev => prev.filter(c => c.id !== id && c.parent_id !== id));
    try {
      const { error } = await supabase.from('comments').delete().eq('id', id);
      if (error) { setComments(originalComments); } else { fetchComments(true); }
    } catch (err) { setComments(originalComments); }
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
        giveCommentXP();
        fetchComments(true); // Silent refresh 🚀
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
             <textarea placeholder={chapterId ? "Cảm nhận về chương này..." : "Cảm nhận về truyện..."} value={content} onChange={(e) => setContent(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 px-6 text-sm focus:border-[#4caf50] outline-none transition-all min-h-[100px] resize-none shadow-inner" style={{ color: 'var(--text-reader, #d1d5db)' }}></textarea>
             <div className="flex justify-end mt-4">
                 <button disabled={submitting} className="px-10 py-3 bg-[#4caf50] text-[#0a0c0a] font-black rounded-2xl shadow-xl shadow-[#4caf50]/20 hover:scale-105 active:scale-95 transition-all text-[10px] uppercase tracking-widest">{submitting ? '...' : 'XÁC NHẬN GỬI 🚀'}</button>
             </div>
        </form>
      )}

      <div className="space-y-12">
        {loading ? (
             <div className="text-center py-10 opacity-30 animate-pulse text-[10px] font-black uppercase tracking-widest text-[#4caf50]">Đang kết nối...</div>
        ) : comments.length === 0 ? (
             <div className="text-center py-20 bg-white/[0.01] rounded-[40px] border border-dashed border-white/5 text-gray-800 font-black text-[9px] uppercase tracking-[0.4em]">KHÔNG CÓ TIẾNG NÓI NÀO...</div>
        ) : (
          comments.filter(c => !c.parent_id).map((comment) => (
            <div key={comment.id} className="space-y-6">
              <CommentItem 
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
              />
              <div className="space-y-6">
                {comments.filter(r => r.parent_id === comment.id).sort((a,b) => new Date(a.created_at) - new Date(b.created_at)).map(reply => (
                  <CommentItem 
                    key={reply.id} 
                    comment={reply} 
                    isReply={true} 
                    user={user} 
                    handleLike={handleLike} 
                    handleDelete={handleDelete} 
                    localLikes={localLikes} 
                    fetchComments={fetchComments}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
