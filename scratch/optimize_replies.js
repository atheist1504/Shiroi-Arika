const fs = require('fs');

// --- 1. Fix Comments.js (UI) ---
const commentsPath = 'c:/Shiroi Arika/src/components/Comments.js';
if (fs.existsSync(commentsPath)) {
    let content = fs.readFileSync(commentsPath, 'utf8');
    
    // Find the badge rendering part
    const badgeTarget = '{/* 📖 NHÃN PHÂN LOẠI CHƯƠNG / TỔNG 🍀 */}\r\n                <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-md border border-white/5 bg-white/[0.02] text-gray-400 group-hover:border-[#4caf50]/20 group-hover:text-[#4caf50] transition-all tracking-tighter shrink-0">\r\n                  {comment.chapters?.chapter_number ? `Chương ${comment.chapters.chapter_number}` : \'Bình luận tổng\'}\r\n                </span>';
    
    // Replacement adds !isReply check
    const badgeReplacement = '{/* 📖 NHÃN PHÂN LOẠI CHƯƠNG / TỔNG 🍀 */}\r\n                {!isReply && (\r\n                   <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-md border border-white/5 bg-white/[0.02] text-gray-400 group-hover:border-[#4caf50]/20 group-hover:text-[#4caf50] transition-all tracking-tighter shrink-0">\r\n                     {comment.chapters?.chapter_number ? `Chương ${comment.chapters.chapter_number}` : \'Bình luận tổng\'}\r\n                   </span>\r\n                )}';

    if (content.indexOf(badgeTarget) !== -1) {
        content = content.replace(badgeTarget, badgeReplacement);
    } else {
        // Try \n version
        const badgeTargetN = '{/* 📖 NHÃN PHÂN LOẠI CHƯƠNG / TỔNG 🍀 */}\n                <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-md border border-white/5 bg-white/[0.02] text-gray-400 group-hover:border-[#4caf50]/20 group-hover:text-[#4caf50] transition-all tracking-tighter shrink-0">\n                  {comment.chapters?.chapter_number ? `Chương ${comment.chapters.chapter_number}` : \'Bình luận tổng\'}\n                </span>';
        const badgeReplacementN = '{/* 📖 NHÃN PHÂN LOẠI CHƯƠNG / TỔNG 🍀 */}\n                {!isReply && (\n                   <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-md border border-white/5 bg-white/[0.02] text-gray-400 group-hover:border-[#4caf50]/20 group-hover:text-[#4caf50] transition-all tracking-tighter shrink-0">\n                     {comment.chapters?.chapter_number ? `Chương ${comment.chapters.chapter_number}` : \'Bình luận tổng\'}\n                   </span>\n                )}';
        content = content.replace(badgeTargetN, badgeReplacementN);
    }
    
    fs.writeFileSync(commentsPath, content, 'utf8');
    console.log('Comments.js UI optimized');
}

// --- 2. Fix actions.js (Backend) ---
const actionsPath = 'c:/Shiroi Arika/src/lib/actions.js';
if (fs.existsSync(actionsPath)) {
    let content = fs.readFileSync(actionsPath, 'utf8');
    
    const insertTarget = "      const { data: insertData, error: commentError } = await client\r\n        .from('comments')\r\n        .insert([{\r\n          manga_id: commentData.manga_id || null,\r\n          chapter_id: commentData.chapter_id || null,\r\n          parent_id: commentData.parent_id || null,\r\n          content: commentData.content,\r\n          user_id: userId,\r\n          user_name: user.display_name || user.username\r\n        }])\r\n        .select();";

    // Logic with inheritance
    const insertReplacement = `      let m_id = commentData.manga_id || null;
      let c_id = commentData.chapter_id || null;

      if (commentData.parent_id && (!m_id || !c_id)) {
          const { data: p } = await client.from('comments').select('manga_id, chapter_id').eq('id', commentData.parent_id).single();
          if (p) {
              if (!m_id) m_id = p.manga_id;
              if (!c_id) c_id = p.chapter_id;
          }
      }

      const { data: insertData, error: commentError } = await client
        .from('comments')
        .insert([{
          manga_id: m_id,
          chapter_id: c_id,
          parent_id: commentData.parent_id || null,
          content: commentData.content,
          user_id: userId,
          user_name: user.display_name || user.username
        }])
        .select();`;

    if (content.indexOf(insertTarget) !== -1) {
        content = content.replace(insertTarget, insertReplacement);
    } else {
        // Try \n version
        const insertTargetN = "      const { data: insertData, error: commentError } = await client\n        .from('comments')\n        .insert([{\n          manga_id: commentData.manga_id || null,\n          chapter_id: commentData.chapter_id || null,\n          parent_id: commentData.parent_id || null,\n          content: commentData.content,\n          user_id: userId,\n          user_name: user.display_name || user.username\n        }])\n        .select();";
        const insertReplacementN = `      let m_id = commentData.manga_id || null;
      let c_id = commentData.chapter_id || null;

      if (commentData.parent_id && (!m_id || !c_id)) {
          const { data: p } = await client.from('comments').select('manga_id, chapter_id').eq('id', commentData.parent_id).single();
          if (p) {
              if (!m_id) m_id = p.manga_id;
              if (!c_id) c_id = p.chapter_id;
          }
      }

      const { data: insertData, error: commentError } = await client
        .from('comments')
        .insert([{
          manga_id: m_id,
          chapter_id: c_id,
          parent_id: commentData.parent_id || null,
          content: commentData.content,
          user_id: userId,
          user_name: user.display_name || user.username
        }])
        .select();`;
        content = content.replace(insertTargetN, insertReplacementN);
    }
    
    fs.writeFileSync(actionsPath, content, 'utf8');
    console.log('actions.js Backend optimized');
}
