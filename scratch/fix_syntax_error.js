const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'lib', 'actions.js');
let content = fs.readFileSync(filePath, 'utf8');

const correctAction = `export async function saveMangaAction(mangaData, mangaId = null) {
  try {
    const isAdmin = await checkAdminAuth().catch(() => false);
    const isStaff = await checkStaffAuth().catch(() => false);
    
    if (!isAdmin && !isStaff) throw new Error("Quyền hạn không đủ! 🛡️");
    
    // Nếu là sửa bài, kiểm tra quyền sở hữu (Nếu không phải Admin)
    if (mangaId && !isAdmin) {
      const canEdit = await checkResourceOwnership('mangas', mangaId);
      if (!canEdit) throw new Error("Bạn không có quyền chỉnh sửa bộ truyện này! 🛡️");
    }

    const client = getDbClient();
    const user = await getAuthenticatedUser();

    let resultData;

    if (mangaId) {
      const { data, error } = await client
        .from('mangas')
        .update({ ...mangaData })
        .eq('id', mangaId)
        .select()
        .single();
      
      if (error) throw error;
      resultData = data;
    } else {
      const { data, error } = await client
        .from('mangas')
        .insert([{ ...mangaData, uploader_id: user.id }])
        .select()
        .single();
      
      if (error) throw error;
      resultData = data;
    }

    // 🚀 XÓA CACHE ĐỂ CẬP NHẬT TRUYỆN MỚI / CẬP NHẬT ⚡
    revalidatePath('/');
    revalidatePath('/latest');
    if (mangaId || resultData?.id) revalidatePath(\`/manga/\${mangaId || resultData?.id}\`);

    return { success: true, data: resultData };
  } catch (error) {
    console.error('❌ Lỗi saveMangaAction:', error.message);
    return { success: false, error: error.message };
  }
}`;

// Find the broken function
const startPattern = 'export async function saveMangaAction';
const nextFunctionPattern = 'export async function toggleFollowAction';

const startIndex = content.indexOf(startPattern);
const nextIndex = content.indexOf(nextFunctionPattern);

if (startIndex !== -1 && nextIndex !== -1) {
    // Find the comment block before toggleFollowAction to preserve it
    const commentStart = content.lastIndexOf('/**', nextIndex);
    if (commentStart !== -1) {
        content = content.slice(0, startIndex) + correctAction + '\n\n' + content.slice(commentStart);
    }
}

fs.writeFileSync(filePath, content);
console.log('Fixed broken saveMangaAction surgically.');
