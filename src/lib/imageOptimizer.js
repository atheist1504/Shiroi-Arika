/**
 * Nén ảnh và chuyển đổi sang định dạng WebP bằng HTML5 Canvas trực tiếp trên trình duyệt
 * @param {File} file - File ảnh gốc
 * @param {number} quality - Chất lượng ảnh WebP (0.0 đến 1.0)
 * @returns {Promise<File>} File định dạng WebP đã được nén
 */
export const compressImageToWebP = async (file, quality = 0.85) => {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement("canvas");
      // 🚀 TĂNG ĐỘ PHÂN GIẢI LÊN 1600PX ĐẾ TRÁNH VỠ ẢNH TRÊN MÀN HÌNH LỚN
      const maxWidth = 1600;
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) {
        URL.revokeObjectURL(imageUrl);
        return reject(new Error("Không thể khởi tạo Canvas"));
      }

      // ✨ CẤU HÌNH RENDERING CHẤT LƯỢNG CAO
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      
      // ⚪️ ĐỔ NỀN TRẮNG (TRÁNH LỖI VÙNG ĐEN TRÊN ẢNH TRONG SUỐT)
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(imageUrl);
          if (!blob) {
            reject(new Error("Không thể xử lý ảnh này"));
            return;
          }
          const fileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
          const webpFile = new File([blob], fileName, {
             type: "image/webp",
          });
          resolve(webpFile);
        },
        "image/webp",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error("Lỗi định dạng ảnh (không thể giải mã)"));
    };
    img.src = imageUrl;
  });
};
