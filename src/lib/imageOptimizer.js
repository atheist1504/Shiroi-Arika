/**
 * Nén ảnh và chuyển đổi sang định dạng WebP bằng HTML5 Canvas trực tiếp trên trình duyệt
 * @param {File} file - File ảnh gốc
 * @param {number} quality - Chất lượng ảnh WebP (0.0 đến 1.0)
 * @returns {Promise<File>} File định dạng WebP đã được nén
 */
export const compressImageToWebP = async (file, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      
      img.onload = () => {
        const canvas = document.createElement("canvas");
        
        // Giữ nguyên kích thước gốc của ảnh
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Chuyển đổi nội dung sang WebP
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Không thể xử lý ảnh này"));
              return;
            }
            // Đổi đuôi tên file thành .webp
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
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};
