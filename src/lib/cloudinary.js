/**
 * CLOUDINARY MAGIC WRAPPER 🍀
 * Giúp tối ưu hóa mọi hình ảnh qua hệ thống CDN của Cloudinary
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo'; // Thay 'demo' bằng Cloud Name của bạn

export const optimizeImage = (url, width = '', height = '') => {
  if (!url) return '';
  
  // Nếu là ảnh từ Blob hoặc base64 thì không xử lý (do là ảnh tạm local) 🍀
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;

  // 🌩️ Nếu là ảnh từ R2 (đã nén WebP sẵn) thì không cần qua Cloudinary nữa
  if (url.includes('r2.dev')) return url;

  try {
    // Cấu hình tối ưu "Thần thánh" cho các nguồn ảnh khác (Supabase, v.v.)
    let transformations = 'f_auto,q_auto:best';
    if (width) transformations += `,w_${width}`;
    if (height) transformations += `,h_${height},c_fill`;

    // Sử dụng Cloudinary Fetch API
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch/${transformations}/${encodeURIComponent(url)}`;
  } catch (err) {
    console.warn("Lỗi tối ưu ảnh, dùng ảnh gốc:", err);
    return url; // Fallback về ảnh gốc nếu có lỗi 🛡️
  }
};
