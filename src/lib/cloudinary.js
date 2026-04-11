/**
 * CLOUDINARY MAGIC WRAPPER 🍀
 * Giúp tối ưu hóa mọi hình ảnh qua hệ thống CDN của Cloudinary
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo'; // Thay 'demo' bằng Cloud Name của bạn

export const optimizeImage = (url, width = '', height = '') => {
  // 🚀 TỐI ƯU HIỂN THỊ: Không qua Cloudinary nếu là ảnh local hoặc đã nằm trên R2 🍀
  if (
    !url || 
    url.startsWith('blob:') || 
    url.startsWith('data:') || 
    url.startsWith('/') ||
    url.includes('r2.cloudflarestorage.com') ||
    url.includes('r2.dev') ||
    !url.startsWith('http') // Bỏ qua nếu không phải URL tuyệt đối 🛡️
  ) {
    return url;
  }

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
