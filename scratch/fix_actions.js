const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'lib', 'actions.js');
const backupPath = filePath + '.bak';

let content = fs.readFileSync(filePath, 'utf8');
let backupContent = fs.readFileSync(backupPath, 'utf8');

const publishChapterAction = `
/**
 * 📣 SERVER ACTION: Đăng chương mới (Atomic operation)
 */
export async function publishChapterAction(mangaId, mangaTitle, chapterData, pagesData, coverImage) {
  try {
    const isAdmin = await checkAdminAuth();
    const isStaff = await checkStaffAuth();
    if (!isAdmin && !isStaff) throw new Error("Quyền hạn không đủ! 🛡️");

    const user = await getAuthenticatedUser();
    const client = getDbClient();
    const { data: chapter, error: chapterError } = await client
      .from('chapters')
      .insert([{ ...chapterData, uploader_id: user.id }])
      .select()
      .single();

    if (chapterError) throw chapterError;

    const pagesWithChapterId = pagesData.map(page => ({
        ...page,
        chapter_id: chapter.id
    }));

    const { error: pagesError } = await client.from('pages').insert(pagesWithChapterId);
    if (pagesError) throw pagesError;

    // Gửi thông báo ngầm
    notifyNewChapterAction(mangaId, mangaTitle, chapter.chapter_number, coverImage).catch(() => {});

    // 🚀 XÓA CACHE ĐỂ CẬP NHẬT CHƯƠNG MỚI LÊN TRANG CHỦ & TRANG CHI TIẾT ⚡
    revalidatePath('/');
    revalidatePath('/latest');
    revalidatePath(\`/manga/\${mangaId}\`);
    revalidatePath(\`/read/\${chapter.id}\`);

    return { success: true, chapterId: chapter.id };
  } catch (error) {
    console.error('❌ Lỗi publishChapterAction:', error);
    return { success: false, error: error.message };
  }
}
`;

const saveChapterDataAction = `
/**
 * ⚡ SERVER ACTION: Lưu dữ liệu chương mới và các trang (Admin Only) 🍀
 */
export async function saveChapterDataAction(chapterPayload, pagesData, isEditing, existingChapterId = null) {
  console.log(\`⚡ [Server] Bắt đầu lưu chương - Chỉnh sửa: \${isEditing}, ID hiện tại: \${existingChapterId}\`);
  try {
    const isAdmin = await checkAdminAuth().catch(() => false);
    const isStaff = await checkStaffAuth().catch(() => false);
    if (!isAdmin && !isStaff) throw new Error("Quyền hạn không đủ! 🛡️");

    const user = await getAuthenticatedUser();
    const client = getDbClient();
    let chapId = existingChapterId;

    const chapterToSave = { ...chapterPayload };

    if (!isEditing) {
       const { data: existing } = await client
         .from("chapters")
         .select("id")
         .eq("manga_id", chapterPayload.manga_id)
         .eq("chapter_number", chapterPayload.chapter_number)
         .maybeSingle();
       
       if (existing) {
         chapId = existing.id;
       }
    }

    if (chapId) {
        await client.from("chapters").update(chapterToSave).eq("id", chapId);
    } else {
        const { data: newChap } = await client.from("chapters").insert([{ ...chapterToSave, uploader_id: user.id }]).select().single();
        chapId = newChap.id;
    }

    await client.from("pages").delete().eq("chapter_id", chapId);
    const pagesWithId = pagesData.map(p => ({ ...p, chapter_id: chapId }));
    await client.from("pages").insert(pagesWithId);

    revalidatePath(\`/read/\${chapId}\`);
    revalidatePath(\`/manga/\${chapterPayload.manga_id}\`);
    revalidatePath('/latest');
    revalidatePath('/');

    return { success: true, chapterId: chapId };
  } catch (error) {
    console.error('❌ [Server] LỖI saveChapterDataAction:', error.message);
    return { success: false, error: error.message || "Lỗi Server Action" };
  }
}
`;

// Extract toggleFollowAction and performLuckyDrawAction from backup
const toggleFollowMatch = backupContent.match(/\/\*\*[\s\S]*?export async function toggleFollowAction[\s\S]*?\n\}/);
const luckyDrawMatch = backupContent.match(/\/\*\*[\s\S]*?export async function performLuckyDrawAction[\s\S]*?\n\}/);

if (!content.includes('publishChapterAction')) {
    content = content.replace('export async function saveMangaAction', (match) => publishChapterAction + '\n' + saveChapterDataAction + '\n' + match);
}

if (!content.includes('toggleFollowAction') && toggleFollowMatch) {
    content = content.replace('export async function submitReportAction', (match) => toggleFollowMatch[0] + '\n\n' + match);
}

if (!content.includes('performLuckyDrawAction') && luckyDrawMatch) {
    content = content.replace('export async function submitReportAction', (match) => luckyDrawMatch[0] + '\n\n' + match);
}

fs.writeFileSync(filePath, content);
console.log('Restored all missing functions to actions.js');
