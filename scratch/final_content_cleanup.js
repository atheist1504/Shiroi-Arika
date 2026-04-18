const fs = require('fs');

const path = 'c:/Shiroi Arika/src/components/Comments.js';
if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');

    // 1. Force Remove the @username prepending logic in ReplyForm
    // Be very broad with the search to catch any variation
    const oldLogicRegex = /\/\/\s*🗨️\s*TỰ ĐỘNG GẮN THẺ @ NẾU TRẢ LỜI MỘT BÌNH LUẬN CON 🍀\s*const finalContent = parentComment\.parent_id\s*\?\s*`@\${parentComment\.user_name}\s+\${replyContent\.trim\(\)}`\s*:\s*replyContent\.trim\(\);/g;
    
    // Also try without the specific comment if it's different
    const fallbackRegex = /const finalContent = parentComment\.parent_id\s*\?\s*`@\${parentComment\.user_name}\s+\${replyContent\.trim\(\)}`\s*:\s*replyContent\.trim\(\);/g;

    const finalSuccessReplacement = '// 🔍 CHỈ GỬI NỘI DUNG SẠCH (Bản tối ưu UI mới) 🍀\n        const finalContent = replyContent.trim();';

    if (oldLogicRegex.test(content)) {
        content = content.replace(oldLogicRegex, finalSuccessReplacement);
    } else {
        content = content.replace(fallbackRegex, finalSuccessReplacement);
    }

    // 2. Implement Visual Filter in CommentItem
    const contentRenderOld = '<p className="text-sm leading-relaxed" style={{ color: \'var(--text-muted-reader, #9ca3af)\' }}>{comment.content}</p>';
    
    const contentRenderNew = `<p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted-reader, #9ca3af)' }}>
                  {(() => {
                      if (!replyingTo || !comment.content) return comment.content;
                      // 🔍 TỰ ĐỘNG LỌC BỎ @username NẾU TRÙNG VỚI NGƯỜI ĐƯỢC PHẢN HỒI 🍀
                      const tag = \`@\${replyingTo}\`;
                      if (comment.content.startsWith(tag)) {
                          return comment.content.substring(tag.length).trim();
                      }
                      return comment.content;
                  })()}
                </p>`;

    content = content.replace(contentRenderOld, contentRenderNew);

    fs.writeFileSync(path, content, 'utf8');
    console.log('Comments.js Cleaned: No more @ prefixes and added visual filtering');
}
