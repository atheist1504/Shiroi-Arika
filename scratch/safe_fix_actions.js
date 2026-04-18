const fs = require('fs');
const path = 'c:/Shiroi Arika/src/lib/actions.js';
let content = fs.readFileSync(path, 'utf8');

const startMarker = 'export async function addCommentAction(commentData) {';
const nextFuncMarker = 'export async function getNotificationsAction';

const startIdx = content.indexOf(startMarker);
const nextIdx = content.indexOf(nextFuncMarker);

if (startIdx !== -1 && nextIdx !== -1) {
    const newFunc = `export async function addCommentAction(commentData) {
    try {
      const user = await getAuthenticatedUser();
      if (!user || !user.id) throw new Error("Vui lòng đăng nhập để bình luận! 🛡️");
  
      const client = getDbClient();
      const userId = user.id;

      let m_id = commentData.manga_id || null;
      let c_id = commentData.chapter_id || null;
      const parent_id = commentData.parent_id || null;

      if (parent_id && (!m_id || !c_id)) {
          try {
              const { data: p } = await client.from('comments').select('manga_id, chapter_id').eq('id', parent_id).single();
              if (p) {
                  m_id = m_id || p.manga_id;
                  c_id = c_id || p.chapter_id;
              }
          } catch (e) {}
      }
      
      const { data: insertData, error: commentError } = await client
        .from('comments')
        .insert([{
          manga_id: m_id,
          chapter_id: c_id,
          parent_id: parent_id,
          content: commentData.content,
          user_id: userId,
          user_name: user.display_name || user.username
        }])
        .select();
  
      if (commentError) throw commentError;
      const newComment = insertData && insertData.length > 0 ? insertData[0] : null;
  
      if (parent_id) {
          try {
              const { data: parentComment } = await client.from('comments').select('user_id, user_name').eq('id', parent_id).single();
              if (parentComment && parentComment.user_id !== userId) {
                  const title = \`\${user.display_name || user.username} đã phản hồi bình luận của bạn! 💬\`;
                  const body = \`"\${commentData.content.substring(0, 50)}\${commentData.content.length > 50 ? '...' : ''}"\`;
                  const notifType = 'reply';
                  const notifData = { 
                      commentId: newComment?.id || null, 
                      parentId: parent_id,
                      mangaId: m_id,
                      chapterId: c_id
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
    const finalContent = content.substring(0, startIdx) + newFunc + content.substring(nextIdx);
    fs.writeFileSync(path, finalContent, 'utf8');
    console.log('SUCCESS: actions.js updated');
} else {
    console.error('ERROR: Markers not found', { startIdx, nextIdx });
}
