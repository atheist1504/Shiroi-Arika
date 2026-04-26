/**
 * TIỆN ÍCH TRÍCH XUẤT ẢNH TỪ FILE MHTML (BẢN TỐI THƯỢNG - BINARY READY) 🚀
 * Hỗ trợ trích xuất ảnh nhúng (Base64/Binary) và ảnh từ Link.
 */
export const parseMHTMLImages = async (file) => {
    // Đọc file dưới dạng ArrayBuffer để tránh hỏng dữ liệu nhị phân 🛡️
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const decoder = new TextDecoder();
    
    // Chuyển một phần nhỏ đầu file sang text để tìm boundary
    const headerText = decoder.decode(bytes.slice(0, 5000));
    const boundaryMatch = headerText.match(/boundary=["']?([^"'\s;\r\n]+)["']?/i);
    
    if (!boundaryMatch) {
        throw new Error("Không tìm thấy cấu trúc dữ liệu (Boundary) trong file này! 🛡️");
    }
    
    const boundary = boundaryMatch[1];
    const boundaryBytes = new TextEncoder().encode(`--${boundary}`);
    
    // Tìm các vị trí ranh giới trong mảng byte
    const partIndices = [];
    for (let i = 0; i < bytes.length - boundaryBytes.length; i++) {
        let found = true;
        for (let j = 0; j < boundaryBytes.length; j++) {
            if (bytes[i + j] !== boundaryBytes[j]) {
                found = false;
                break;
            }
        }
        if (found) partIndices.push(i);
    }

    const images = [];
    let imageIndex = 0;

    for (let i = 0; i < partIndices.length - 1; i++) {
        const start = partIndices[i] + boundaryBytes.length;
        const end = partIndices[i+1];
        const partBytes = bytes.slice(start, end);
        
        // Tìm vị trí ngăn cách giữa Header và Body (\r\n\r\n)
        let headerEndIndex = -1;
        for (let j = 0; j < partBytes.length - 3; j++) {
            if (partBytes[j] === 13 && partBytes[j+1] === 10 && partBytes[j+2] === 13 && partBytes[j+3] === 10) {
                headerEndIndex = j;
                break;
            }
        }
        
        if (headerEndIndex === -1) continue;
        
        const header = decoder.decode(partBytes.slice(0, headerEndIndex));
        const bodyBytes = partBytes.slice(headerEndIndex + 4);
        
        // Kiểm tra xem có phải ảnh không
        const isImage = /Content-Type:\s*image\//i.test(header) || 
                        /Content-Location:.*(\.jpg|\.jpeg|\.png|\.webp|\.gif)/i.test(header);
        
        if (isImage) {
            const typeMatch = header.match(/Content-Type:\s*image\/([^;\s\r\n]+)/i);
            let type = typeMatch ? typeMatch[1] : 'jpeg';
            if (type.includes('icon')) continue; // Bỏ qua favicon

            const isBase64 = /Content-Transfer-Encoding:\s*base64/i.test(header);
            let finalBlob;

            if (isBase64) {
                const base64Text = decoder.decode(bodyBytes).replace(/[\r\n\s]/g, '');
                try {
                    const binaryString = atob(base64Text);
                    const uint8Array = new Uint8Array(binaryString.length);
                    for (let j = 0; j < binaryString.length; j++) {
                        uint8Array[j] = binaryString.charCodeAt(j);
                    }
                    finalBlob = new Blob([uint8Array], { type: `image/${type}` });
                } catch (e) { continue; }
            } else {
                // Xử lý dữ liệu nhị phân trực tiếp 🚀
                finalBlob = new Blob([bodyBytes], { type: `image/${type}` });
            }

            if (finalBlob && finalBlob.size > 5000) {
                const fileName = `mhtml-img-${imageIndex++}.${type}`;
                images.push(new File([finalBlob], fileName, { type: `image/${type}` }));
            }
        }
    }

    // Nếu vẫn không thấy ảnh nhúng, dùng chiêu cũ: Quét Link
    if (images.length === 0) {
        const fullText = decoder.decode(bytes);
        const urlRegex = /https?:\/\/[^"'\s<>]+\.(?:jpg|jpeg|png|webp|gif|bmp)[^"'\s<>]*/gi;
        let match;
        const urls = [];
        while ((match = urlRegex.exec(fullText)) !== null) {
            const url = match[0].replace(/&amp;/g, '&');
            if (!urls.includes(url)) urls.push(url);
        }
        
        for (let i = 0; i < urls.length; i++) {
            try {
                const res = await fetch(urls[i]);
                if (res.ok) {
                    const blob = await res.blob();
                    if (blob.size > 5000) {
                        images.push(new File([blob], `web-img-${i}.${blob.type.split('/')[1]}`, { type: blob.type }));
                    }
                }
            } catch (e) {}
        }
    }

    if (images.length === 0) {
        throw new Error("Không tìm thấy bất kỳ hình ảnh hay liên kết ảnh nào trong file này! 🛡️");
    }

    return images;
};
