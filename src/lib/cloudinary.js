/**
 * CLOUDINARY MAGIC WRAPPER 🍀
 * Giúp tối ưu hóa mọi hình ảnh qua hệ thống CDN của Cloudinary
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo'; // Thay 'demo' bằng Cloud Name của bạn

export const optimizeImage = (url, width = '', height = '') => {
  if (!url) return '';
  
  // Nếu là ảnh từ Blob hoặc base64 hoặc Supabase thì không xử lý qua Cloudinary để tránh lỗi delay 🍀
  if (url.startsWith('blob:') || url.startsWith('data:') || url.includes('supabase.co')) return url;

  // Cấu hình tối ưu: f_auto (tự động định dạng), q_auto (tự động chất lượng)
  let transformations = 'f_auto,q_auto';
  
  if (width) transformations += `,w_${width}`;
  if (height) transformations += `,h_${height},c_fill`;

  // Sử dụng Cloudinary Fetch API để xử lý ảnh từ bất kỳ nguồn nào
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch/${transformations}/${encodeURIComponent(url)}`;
};
