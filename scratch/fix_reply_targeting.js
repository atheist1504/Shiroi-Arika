const fs = require('fs');

const path = 'c:/Shiroi Arika/src/components/Comments.js';
if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');

    // 1. Update ReplyForm to use DIRECT parent ID
    const replyFormTarget = 'parent_id: (parentComment.parent_id || parentComment.id) || null';
    const replyFormReplacement = 'parent_id: parentComment.id || null';
    content = content.replace(replyFormTarget, replyFormReplacement);

    // 2. Add recursive descendant helper at the top level or inside Comments component
    // I'll place it inside the Comments component for easy access to state
    const helperCode = `
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
`;
    
    // Inject helper into Comments component (after state declarations)
    content = content.replace('const [isMounted, setIsMounted] = useState(false);', 'const [isMounted, setIsMounted] = useState(false);' + helperCode);

    // 3. Update the main rendering loop to use getAllDescendants
    const oldLoopTarget = `                {comments
                  .filter(r => r.parent_id && String(r.parent_id) === String(comment.id))
                  .sort((a,b) => new Date(a.created_at) - new Date(b.created_at))
                  .map(reply => (
                  <CommentItem 
                    key={reply.id} 
                    comment={reply} 
                    isReply={true} 
                    allComments={comments} 
                    user={user} 
                    replyTo={replyTo}
                    setReplyTo={setReplyTo}
                    handleLike={handleLike} 
                    handleDelete={handleDelete} 
                    localLikes={localLikes} 
                    fetchComments={fetchComments}
                  />
                ))}`;

    const newLoopReplacement = `                {getAllDescendants(comment.id, comments)
                  .sort((a,b) => new Date(a.created_at) - new Date(b.created_at))
                  .map(reply => (
                  <CommentItem 
                    key={reply.id} 
                    comment={reply} 
                    isReply={true} 
                    allComments={comments} 
                    user={user} 
                    replyTo={replyTo}
                    setReplyTo={setReplyTo}
                    handleLike={handleLike} 
                    handleDelete={handleDelete} 
                    localLikes={localLikes} 
                    fetchComments={fetchComments}
                  />
                ))}`;

    if (content.indexOf(oldLoopTarget) !== -1) {
        content = content.replace(oldLoopTarget, newLoopReplacement);
    } else {
        // Try version with different line endings/spacing
        console.log('LOOP_TARGET_NOT_FOUND_EXACTLY, trying regex...');
        content = content.replace(/\{comments\s+\.filter\(r => r\.parent_id && String\(r\.parent_id\) === String\(comment\.id\)\)/, '{getAllDescendants(comment.id, comments)');
    }

    fs.writeFileSync(path, content, 'utf8');
    console.log('Comments.js Logic Fixed for Accurate Reply Targeting');
}
