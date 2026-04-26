/**
 * 🛠️ MHTML PARSER ENGINE 🍀
 * Giúp trích xuất hình ảnh từ file .mhtml (MIME HTML) 📚
 */

export const parseMHTMLImages = async (file) => {
    const text = await file.text();
    
    // 1. Tìm boundary (ranh giới giữa các phần)
    // Cải tiến Regex để bắt được cả trường hợp boundary nằm ở dòng tiếp theo 🚀
    let boundary = null;
    const boundaryMatch = text.match(/boundary=["']?([^"'\s;\r\n]+)["']?/i);
    
    if (boundaryMatch) {
        boundary = boundaryMatch[1];
    } else {
        // Fallback: Thử tìm theo cấu trúc dòng bắt đầu bằng --
        const lines = text.split('\n');
        for (const line of lines) {
            if (line.startsWith('----') && line.trim().length > 10) {
                boundary = line.trim().substring(2);
                break;
            }
        }
    }

    if (!boundary) {
        throw new Error("Không tìm thấy ranh giới dữ liệu (Boundary) trong file MHTML này! 🛡️");
    }
    const parts = text.split(`--${boundary}`);
    
    const images = [];
    let imageIndex = 0;

    for (const part of parts) {
        // Kiểm tra xem phần này có phải là ảnh không
        if (part.includes('Content-Type: image/')) {
            try {
                // Tách Header và Body
                const splitIndex = part.indexOf('\r\n\r\n');
                if (splitIndex === -1) continue;
                
                const header = part.substring(0, splitIndex);
                const body = part.substring(splitIndex + 4).trim();
                
                // Lấy định dạng ảnh (jpeg, png, webp, ...)
                const typeMatch = header.match(/Content-Type: image\/([^;\s\r\n]+)/i);
                const type = typeMatch ? typeMatch[1] : 'jpeg';
                
                // Lấy encoding (thường là base64)
                const isBase64 = header.includes('Content-Transfer-Encoding: base64');
                
                if (isBase64) {
                    // Làm sạch dữ liệu Base64 (loại bỏ xuống dòng)
                    const cleanBase64 = body.replace(/[\r\n\s]/g, '');
                    
                    // Chuyển sang Blob
                    const byteCharacters = atob(cleanBase64);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: `image/${type}` });
                    
                    // Tạo File object để tương thích với logic upload hiện tại
                    const fileName = `mhtml-image-${imageIndex++}.${type}`;
                    const imageFile = new File([blob], fileName, { type: `image/${type}` });
                    
                    images.push(imageFile);
                }
            } catch (err) {
                console.warn("⚠️ Lỗi khi trích xuất một ảnh từ MHTML:", err);
            }
        }
    }
    
    if (images.length === 0) {
        throw new Error("Không tìm thấy hình ảnh nào trong file MHTML này! 🛡️");
    }

    return images;
};
