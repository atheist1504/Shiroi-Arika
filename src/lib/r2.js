import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * 🌩️ CLOUDFLARE R2 CLIENT
 * Hệ thống lưu trữ vô tận cho Shiroi Arika 🍀
 */

const S3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export const uploadToR2 = async (file, fileName) => {
  const bucketName = process.env.R2_BUCKET_NAME || 'shiroi';
  
  try {
    // 🛠️ Đảm bảo dữ liệu ở dạng Uint8Array để AWS SDK xử lý tốt nhất
    let bodyValue = file;
    if (file instanceof Blob || (typeof file.arrayBuffer === 'function')) {
      const arrayBuffer = await file.arrayBuffer();
      bodyValue = new Uint8Array(arrayBuffer);
    }

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: bodyValue,
      ContentType: "image/webp",
    });

    await S3.send(command);
    
    // Trả về URL công khai
    const publicBaseUrl = process.env.R2_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
    
    // Đảm bảo không bị thừa dấu gạch chéo
    const baseUrl = publicBaseUrl?.endsWith('/') ? publicBaseUrl.slice(0, -1) : publicBaseUrl;
    const finalUrl = `${baseUrl}/${fileName}`;
    
    console.log(`🚀 R2 Upload Success: ${finalUrl}`);
    return finalUrl;
  } catch (error) {
    console.error("Lỗi Upload R2:", error);
    throw error;
  }
};

/**
 * 🎫 TẠO VÉ THÔNG HÀNH (SIGNED URL)
 * Cho phép Client nộp ảnh thẳng lên R2 🍀
 */
export const getPresignedUploadUrl = async (fileName) => {
  const bucketName = process.env.R2_BUCKET_NAME || 'shiroi';
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    ContentType: "image/webp",
  });

  // Vé có hiệu lực trong 5 phút (300 giây)
  const signedUrl = await getSignedUrl(S3, command, { expiresIn: 300 });

  // Tạo URL công khai cuối cùng
  const publicBaseUrl = process.env.R2_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  const baseUrl = publicBaseUrl?.endsWith('/') ? publicBaseUrl.slice(0, -1) : publicBaseUrl;
  const finalPublicUrl = `${baseUrl}/${fileName}`;

  return { signedUrl, finalPublicUrl };
};
