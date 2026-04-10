'use server';

import { uploadToR2, getPresignedUploadUrl } from './r2';

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
    console.error('Lỗi Server Action Upload:', error);
    return { success: false, error: error.message };
  }
}
