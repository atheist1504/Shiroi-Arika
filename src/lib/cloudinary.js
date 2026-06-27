/**
 * CLOUDINARY MAGIC WRAPPER 🍀
 * ⚠️ CLOUDINARY ACCOUNT (dcfxienmu) ĐÃ BỊ KHÓA/HẠN CHẾ (401 Unauthorized)
 * → Tạm thời bypass Cloudinary, hiển thị ảnh trực tiếp từ URL gốc.
 * → Khi có tài khoản Cloudinary mới, bật lại bằng cách đổi USE_CLOUDINARY = true
 */

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo';
const USE_CLOUDINARY = false; // 🔴 TẮT CLOUDINARY (Account bị khóa)

export const optimizeImage = (url, width = '', height = '') => {
  // 🛡️ Trả về ngay nếu URL không hợp lệ
  if (
    !url || 
    url.startsWith('blob:') || 
    url.startsWith('data:') || 
    url.startsWith('/') ||
    !url.startsWith('http')
  ) {
    return url;
  }

  // 🔧 Luôn sửa URL R2 trước
  const cleanUrl = fixR2Url(url);

  // 🚀 NẾU CLOUDINARY ĐANG BẬT VÀ HOẠT ĐỘNG
  if (USE_CLOUDINARY) {
    try {
      let transformations = 'f_auto,q_auto:best';
      if (width) transformations += `,w_${width}`;
      if (height) transformations += `,h_${height},c_fill`;

      return `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch/${transformations}/${encodeURIComponent(cleanUrl)}`;
    } catch (err) {
      console.warn("Lỗi tối ưu ảnh, dùng ảnh gốc:", err);
      return cleanUrl;
    }
  }

  // 🟢 BYPASS MODE: Trả về URL gốc trực tiếp (không qua Cloudinary)
  return cleanUrl;
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
 * Biến ảnh dọc thành ngang 1200x630 chuẩn SEO
 */
export const getOgImageUrl = (url) => {
    if (!url) return 'https://shiroi-arika.vercel.app/og-banner-v8.png';
    
    const cleanUrl = fixR2Url(url);
    
    // 🚀 Nếu Cloudinary đang bật, dùng Cloudinary transform
    if (USE_CLOUDINARY) {
        const transformations = 'w_1200,h_630,c_pad,b_auto:blur_2000,q_auto,f_jpg';
        return `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch/${transformations}/${encodeURIComponent(cleanUrl)}`;
    }

    // 🟢 BYPASS MODE: Trả về ảnh gốc (không transform)
    return cleanUrl;
};
