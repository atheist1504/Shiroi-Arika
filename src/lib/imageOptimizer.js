/**
 * Nén ảnh và chuyển đổi sang định dạng WebP bằng HTML5 Canvas trực tiếp trên trình duyệt
 * @param {File} file - File ảnh gốc
 * @param {number} quality - Chất lượng ảnh WebP (0.0 đến 1.0)
 * @returns {Promise<File>} File định dạng WebP đã được nén
 */
export const compressImageToWebP = async (file, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(imageUrl);
        return reject(new Error("Không thể khởi tạo Canvas"));
      }
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
