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
        // Kiểm tra xem phần này có phải là ảnh không (Case-insensitive check) 🕵️‍♂️
        const hasImageHeader = /Content-Type:\s*image\//i.test(part);
        const hasImageLocation = /Content-Location:.*(\.jpg|\.jpeg|\.png|\.webp|\.gif)/i.test(part);

        if (hasImageHeader || hasImageLocation) {
            try {
                // Tách Header và Body
                const splitIndex = part.indexOf('\r\n\r\n');
                if (splitIndex === -1) continue;
                
                const header = part.substring(0, splitIndex);
                const body = part.substring(splitIndex + 4).trim();
                
                // Lấy định dạng ảnh
                const typeMatch = header.match(/Content-Type:\s*image\/([^;\s\r\n]+)/i);
                let type = typeMatch ? typeMatch[1] : null;
                
                // Nếu không thấy Content-Type, thử đoán qua Content-Location
                if (!type) {
                    const locMatch = header.match(/Content-Location:.*\.([a-z0-9]+)/i);
                    type = locMatch ? locMatch[1] : 'jpeg';
                }
                
                // Lấy encoding
                const isBase64 = /Content-Transfer-Encoding:\s*base64/i.test(header);
                
                if (isBase64 && body.length > 100) { // Đảm bảo có dữ liệu thực sự
                    const cleanBase64 = body.replace(/[\r\n\s]/g, '');
                    
                    const byteCharacters = atob(cleanBase64);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: `image/${type}` });
                    
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
