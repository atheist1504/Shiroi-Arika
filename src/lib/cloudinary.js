/**
 * CLOUDINARY MAGIC WRAPPER 🍀
 * Giúp tối ưu hóa mọi hình ảnh qua hệ thống CDN của Cloudinary
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo'; // Thay 'demo' bằng Cloud Name của bạn

export const optimizeImage = (url, width = '', height = '') => {
  // 🚀 TỐI ƯU HIỂN THỊ: Không qua Cloudinary nếu là ảnh local hoặc đã nằm trên R2 🍀
  const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '';
  const r2Domain = r2PublicUrl.replace(/^https?:\/\//, '').split('/')[0];

  if (
    !url || 
    url.startsWith('blob:') || 
    url.startsWith('data:') || 
    url.startsWith('/') ||
    url.includes('r2.cloudflarestorage.com') ||
    url.includes('r2.dev') ||
    url.includes('cloudflarestorage.com') ||
    (r2Domain && url.includes(r2Domain)) ||
    !url.startsWith('http')
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

/**
 * 🛠️ SMART R2 RECOVERY ENGINE 🍀
 * Tự động sửa lỗi Domain R2 cũ, undefined/ và đường dẫn tương đối
 */
export const fixR2Url = (url) => {
    if (!url || url.startsWith('blob:') || url.startsWith('data:')) return url;

    const r2Url = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '';
    const cleanR2Url = r2Url.endsWith('/') ? r2Url.slice(0, -1) : r2Url;

    let finalData = url;

    // 1. Sửa lỗi undefined/
    if (finalData.includes('undefined/')) {
        finalData = finalData.replace(/.*undefined\//, `${cleanR2Url}/`);
    }

    // 2. Tự động chuyển đổi Domain R2 cũ sang mới
    // Nếu link chứa r2.dev nhưng không khớp domain hiện tại (Chỉ áp dụng nếu có config r2Url)
    if (finalData.includes('r2.dev') && cleanR2Url && !finalData.includes(cleanR2Url)) {
        const pathMatch = finalData.match(/r2\.dev\/(.*)/);
        const cleanPath = pathMatch ? pathMatch[1] : null;
        if (cleanPath) {
            finalData = `${cleanR2Url}/${cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath}`;
        }
    }

    // 3. Xử lý đường dẫn tương đối
    if (!finalData.startsWith('http') && cleanR2Url) {
        const separator = finalData.startsWith('/') ? '' : '/';
        finalData = `${cleanR2Url}${separator}${finalData}`;
    }

    return finalData;
};

/**
 * 🎨 GENERATE OG IMAGE (ZALO/FB Optimization) 🍀
 * Biến ảnh dọc thành ngang 1200x630 chuẩn SEO, thêm hiệu ứng Blur cạnh
 */
export const getOgImageUrl = (url) => {
    if (!url) return 'https://shiroi-arika.vercel.app/logo.png';
    
    // Fix link R2 trước khi gửi cho Cloudinary
    const cleanUrl = fixR2Url(url);
    
    // Sử dụng Cloudinary Fetch với bộ lọc "Thần thánh":
    // c_pad: Thêm khoảng trắng để đủ kích thước
    // b_auto:blur_2000: Lấy chính ảnh đó làm mờ để lấp đầy khoảng trắng (Trông rất Pro)
    const transformations = 'w_1200,h_630,c_pad,b_auto:blur_2000,q_auto,f_jpg';
    
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch/${transformations}/${encodeURIComponent(cleanUrl)}`;
};
