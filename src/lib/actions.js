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
  } catch (error: any) {
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
