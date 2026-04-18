const fs = require('fs');

const path = 'c:/Shiroi Arika/src/components/Comments.js';
if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');

    // 1. Fix ReplyForm (Stop prepending @username)
    const replyFormTarget = '        // 🔍 TỰ ĐỘNG GẮN THẺ @ NẾU TRẢ LỜI MỘT BÌNH LUẬN CON 🍀\r\n        const finalContent = parentComment.parent_id \r\n            ? `@${parentComment.user_name} ${replyContent.trim()}`\r\n            : replyContent.trim();';
    const replyFormReplacement = '        // 🔍 CHỈ GỬI NỘI DUNG SẠCH (Bản tối ưu UI mới) 🍀\r\n        const finalContent = replyContent.trim();';

    if (content.indexOf(replyFormTarget) !== -1) {
        content = content.replace(replyFormTarget, replyFormReplacement);
    } else {
        // Try \n version
        const replyFormTargetN = '        // 🔍 TỰ ĐỘNG GẮN THẺ @ NẾU TRẢ LỜI MỘT BÌNH LUẬN CON 🍀\n        const finalContent = parentComment.parent_id \n            ? `@${parentComment.user_name} ${replyContent.trim()}`\n            : replyContent.trim();';
        const replyFormReplacementN = '        // 🔍 CHỈ GỬI NỘI DUNG SẠCH (Bản tối ưu UI mới) 🍀\n        const finalContent = replyContent.trim();';
        content = content.replace(replyFormTargetN, replyFormReplacementN);
    }

    // 2. Update CommentItem signature to accept allComments
    content = content.replace('CommentItem = ({ comment, isReply = false, user', 'CommentItem = ({ comment, isReply = false, allComments = [], user');

    // 3. Add parent lookup logic inside CommentItem
    const parentLookupLogic = `    const key = cK(comment.user_name);
    const isAdmin = key.includes('admin') || key.includes('quan tri') || key.includes('shiroi arika');

    // 🔍 TÌM THÔNG TIN NGƯỜI ĐƯỢC PHẢN HỒI (UI MỚI) 🍀
    let replyingTo = null;
    if (comment.parent_id) {
        const parent = allComments.find(c => String(c.id) === String(comment.parent_id));
        if (parent) replyingTo = parent.user_name;
    }`;
    
    // Replace the old key/isAdmin lines with the new logic
    content = content.replace(/const key = cK\(comment\.user_name\);\s+const isAdmin = key\.includes\('admin'\) \|\| key\.includes\('quan tri'\) \|\| key\.includes\('shiroi arika'\);/, parentLookupLogic);

    // 4. Implement the UI for "Phản hồi @..." tag
    const bubbleStartTarget = '<div className="p-4 rounded-2xl rounded-tl-none border border-white/5 transition-all shadow-sm"';
    const bubbleReplacement = `{replyingTo && (
                <div className="flex items-center gap-1.5 mb-1.5 ml-2 opacity-60">
                   <svg className="w-2.5 h-2.5 text-[#4caf50]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                   <span className="text-[9px] font-black uppercase text-[#4caf50]">Phản hồi @{replyingTo}</span>
                </div>
             )}
             <div className="p-4 rounded-2xl rounded-tl-none border border-white/5 transition-all shadow-sm"`;

    content = content.replace(bubbleStartTarget, bubbleReplacement);

    // 5. Pass allComments in the main render loop
    // Replace the instances of CommentItem call
    content = content.replace(/<CommentItem/g, '<CommentItem allComments={comments}');

    fs.writeFileSync(path, content, 'utf8');
    console.log('Comments.js UI Optimized for Reply Tags');
}
