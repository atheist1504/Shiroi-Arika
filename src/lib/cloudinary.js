/**
 * CLOUDINARY MAGIC WRAPPER 🍀
 * Giúp tối ưu hóa mọi hình ảnh qua hệ thống CDN của Cloudinary
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo'; // Thay 'demo' bằng Cloud Name của bạn

export const optimizeImage = (url, width = '', height = '') => {
  if (!url) return '';
  
  // Nếu là ảnh từ Blob hoặc base64 thì không xử lý qua Cloudinary (do là ảnh tạm local) 🍀
  if (url.startsWith('blob:') || url.startsWith('data:')) return url;

  // Cấu hình tối ưu "Thần thánh" cho web lớn: 
  // f_auto: Tự động đổi sag WebP/AVIF tiết kiệm 70% dung lượng
  // q_auto: Tự động giữ nét cao nhất trong khi dung lượng thấp nhất
  let transformations = 'f_auto,q_auto:best';
  
  if (width) transformations += `,w_${width}`;
  if (height) transformations += `,h_${height},c_fill`;

  // Sử dụng Cloudinary Fetch API để tối ưu hóa ảnh từ Supabase hoặc bất kỳ nguồn nào
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch/${transformations}/${encodeURIComponent(url)}`;
};
