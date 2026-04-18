const fs = require('fs');

// --- 1. Fix actions.js (Backend) ---
const actionsPath = 'c:/Shiroi Arika/src/lib/actions.js';
if (fs.existsSync(actionsPath)) {
    let content = fs.readFileSync(actionsPath, 'utf8');
    
    // Find addCommentAction
    const funcStartMarker = 'export async function addCommentAction(commentData) {';
    const funcEndMarker = '/**\r\n   * 📊 SERVER ACTION: Ghi Log XP Bảo Mật';
    const funcEndMarkerN = '/**\n   * 📊 SERVER ACTION: Ghi Log XP Bảo Mật';
    
    const startIdx = content.indexOf(funcStartMarker);
    let endIdx = content.indexOf(funcEndMarker);
    if (endIdx === -1) endIdx = content.indexOf(funcEndMarkerN);

    if (startIdx !== -1 && endIdx !== -1) {
        const cleanFunc = `export async function addCommentAction(commentData) {
    try {
      const user = await getAuthenticatedUser();
      if (!user || !user.id) throw new Error("Vui lòng đăng nhập để bình luận! 🛡️");
  
      const client = getDbClient();
      const userId = user.id;

      // 1. TỰ ĐỘNG THỨA KẾ MANGA_ID / CHAPTER_ID NẾU LÀ REPlY 🍀
      let manga_id = commentData.manga_id || null;
      let chapter_id = commentData.chapter_id || null;
      const parent_id = commentData.parent_id || null;

      if (parent_id && (!manga_id || !chapter_id)) {
          try {
              const { data: parent } = await client
                  .from('comments')
                  .select('manga_id, chapter_id')
                  .eq('id', parent_id)
                  .single();
              if (parent) {
                  manga_id = manga_id || parent.manga_id;
                  chapter_id = chapter_id || parent.chapter_id;
              }
          } catch (e) {
              console.warn("⚠️ Không thể thừa kế ID từ parent:", e.message);
          }
      }
  
      // 2. GHI BÌNH LUẬN VÀO DATABASE
      console.log("📝 [Server] INSERT comment:", { manga_id, chapter_id, parent_id });
      
      const { data: insertData, error: commentError } = await client
        .from('comments')
        .insert([{
          manga_id,
          chapter_id,
          parent_id,
          content: commentData.content,
          user_id: userId,
          user_name: user.display_name || user.username
        }])
        .select();
  
      if (commentError) throw commentError;
      const newComment = insertData && insertData.length > 0 ? insertData[0] : null;
  
      // 3. XỬ LÝ THÔNG BÁO PHẢN HỒI (REPLY NOTIFICATION) 🔔
      if (parent_id) {
          try {
              const { data: parentComment } = await client
                  .from('comments')
                  .select('user_id, user_name, content')
                  .eq('id', parent_id)
                  .single();
              
              if (parentComment && parentComment.user_id !== userId) {
                  const title = \`\${user.display_name || user.username} đã phản hồi bình luận của bạn! 💬\`;
                  const body = \`"\${commentData.content.substring(0, 50)}\${commentData.content.length > 50 ? '...' : ''}"\`;
                  const notifType = 'reply';
                  const notifData = { 
                      commentId: newComment?.id || null, 
                      parentId: parent_id,
                      mangaId: manga_id,
                      chapterId: chapter_id
                  };
  
                  await createInAppNotification(parentComment.user_id, title, body, notifType, notifData);
              }
          } catch (notifErr) {
              console.warn("⚠️ Lỗi thông báo:", notifErr.message);
          }
      }
  
      return { success: true, comment: newComment };
    } catch (error) {
      console.error("❌ Lỗi addCommentAction:", error.message);
      return { success: false, error: error.message };
    }
}
`;
        content = content.substring(0, startIdx) + cleanFunc + '\n  ' + content.substring(endIdx);
        fs.writeFileSync(actionsPath, content, 'utf8');
        console.log('actions.js REWRITTEN SUCCESSFULLY');
    } else {
        console.error('FAILED TO FIND MARKERS IN actions.js', { startIdx, endIdx });
    }
}

// --- 2. Fix Comments.js (UI Feedback) ---
const commentsPath = 'c:/Shiroi Arika/src/components/Comments.js';
if (fs.existsSync(commentsPath)) {
    let content = fs.readFileSync(commentsPath, 'utf8');
    
    // 1. Add loading state to ReplyForm button
    const btnTarget = "{isSubmitting ? '...' : 'GỬI ✨'}";
    const btnReplacement = "{isSubmitting ? 'ĐANG GỬI...' : 'GỬI ✨'}";
    content = content.replace(btnTarget, btnReplacement);

    // 2. Reduce wait time in ReplyForm to 1s instead of 1.5s
    content = content.replace('}, 1500);', '}, 800);');

    fs.writeFileSync(commentsPath, content, 'utf8');
    console.log('Comments.js UI improved');
}
