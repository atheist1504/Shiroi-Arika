'use server';

import { uploadToR2, getPresignedUploadUrl, deleteFolderFromR2 } from './r2';
import { supabase } from './supabase';

/**
 * 📊 SERVER ACTION: Lấy thông tin dung lượng đã sử dụng
 * Tính toán dựa trên cột size_kb trong bảng pages và mangas 🍀
 */
export async function getStorageUsageAction() {
  try {
    // 1. Tính tổng từ bảng pages
    const { data: pagesData, error: pagesError } = await supabase
      .from('pages')
      .select('size_kb');
    
    if (pagesError) throw pagesError;
    const pagesTotal = (pagesData || []).reduce((sum, p) => sum + (p.size_kb || 150), 0);

    // 2. Tính tổng từ bảng mangas (ảnh bìa)
    const { data: mangasData, error: mangasError } = await supabase
      .from('mangas')
      .select('size_kb');
    
    if (mangasError) throw mangasError;
    const mangasTotal = (mangasData || []).reduce((sum, m) => sum + (m.size_kb || 300), 0);

    const totalKB = pagesTotal + mangasTotal;
    const totalGB = totalKB / (1024 * 1024);

    return { 
      success: true, 
      totalGB: parseFloat(totalGB.toFixed(3)), 
      totalKB,
      limitGB: 10 
    };
  } catch (error) {
    console.error('Lỗi tính dung lượng:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 🗑️ SERVER ACTION: Xóa trọn bộ truyện (Data + R2)
 * Đây là thao tác nguy hiểm, cần dọn dẹp triệt để 🍀
 */
export async function deleteMangaAction(mangaId) {
  try {
    if (!mangaId) throw new Error("Thiếu ID truyện!");

    // 1. Lấy danh sách Chapter IDs để dọn dẹp R2
    const { data: chapters, error: chapError } = await supabase
      .from('chapters')
      .select('id')
      .eq('manga_id', mangaId);

    if (chapError) throw chapError;

    // 2. Dọn dẹp tệp vật lý trên R2 cho từng chương
    if (chapters && chapters.length > 0) {
      for (const chap of chapters) {
        await deleteFolderFromR2(`chapters/${chap.id}/`);
      }
    }

    // 3. Xóa dữ liệu trong DB (Xóa Pages -> Chapters -> Manga)
    // Supabase sẽ tự động cascade nếu có cấu hình, nhưng ta làm thủ công cho chắc chắn
    const chapterIds = chapters.map(c => c.id);
    if (chapterIds.length > 0) {
      await supabase.from('pages').delete().in('chapter_id', chapterIds);
      await supabase.from('chapters').delete().in('id', chapterIds);
    }
    
    // Cuối cùng xóa bản ghi Manga
    const { error: mangaDelError } = await supabase.from('mangas').delete().eq('id', mangaId);
    if (mangaDelError) throw mangaDelError;

    return { success: true };
  } catch (error) {
    console.error('Lỗi khi xóa truyện:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 🎫 SERVER ACTION: Lấy vé tải ảnh lên R2
 */
export async function getUploadUrlAction(fileName) {
  try {
    if (!fileName) throw new Error('Thiếu tên tệp!');
    const data = await getPresignedUploadUrl(fileName);
    return { success: true, ...data };
  } catch (error) {
    console.error('Lỗi lấy Signed URL:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 🌩️ SERVER ACTION: Upload Image to R2
 * Giải quyết triệt để lỗi CORS và bảo mật Keys 🍀
 */
export async function uploadImageAction(formData) {
  try {
    const file = formData.get('file');
    const fileName = formData.get('fileName');

    if (!file || !fileName) {
      throw new Error('Thiếu tệp tin hoặc tên tệp!');
    }

    // Chuyển đổi file (Blob/File) sang Buffer để uploadToR2 xử lý
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Re-use logic từ r2.js (đã được sửa dùng server keys)
    const publicUrl = await uploadToR2(buffer, fileName);

    return { success: true, url: publicUrl };
  } catch (error) {
    const errorMsg = error.message || String(error);
    console.error('Lỗi Server Action Upload:', errorMsg);

    // 🕵️‍♂️ PHÂN LOẠI LỖI THÔNG MINH
    if (errorMsg.includes('413') || errorMsg.includes('Payload Too Large')) {
      return { success: false, error: "Ảnh quá nặng! Vercel giới hạn tối đa 4.5MB. Hãy thử giảm chất lượng ảnh hoặc nén thêm.", code: 'PAYLOAD_TOO_LARGE' };
    }
    if (errorMsg.includes('Credential') || errorMsg.includes('AccessKey')) {
      return { success: false, error: "Lỗi xác thực R2! Vui lòng kiểm tra R2_ACCESS_KEY_ID và SECRET_ACCESS_KEY trên Vercel.", code: 'R2_AUTH_ERROR' };
    }
    if (errorMsg.includes('ENOTFOUND') || errorMsg.includes('Network')) {
      return { success: false, error: "Không thể kết nối tới Cloudflare R2. Vui lòng kiểm tra Endpoint và R2_ACCOUNT_ID.", code: 'R2_NETWORK_ERROR' };
    }

    return { success: false, error: `Lỗi hệ thống: ${errorMsg}`, code: 'UNKNOWN_ERROR' };
  }
}
