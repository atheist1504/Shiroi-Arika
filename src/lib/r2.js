import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

/**
 * 🌩️ CLOUDFLARE R2 CLIENT
 * Hệ thống lưu trữ vô tận cho Shiroi Arika 🍀
 */

const S3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.NEXT_PUBLIC_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.NEXT_PUBLIC_R2_SECRET_ACCESS_KEY,
  },
});

export const uploadToR2 = async (file, fileName) => {
  const bucketName = process.env.NEXT_PUBLIC_R2_BUCKET_NAME || 'shiroi';
  
  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: file,
      ContentType: "image/webp",
    });

    await S3.send(command);
    
    // Trả về URL công khai (Cần link r2.dev của bác để hoàn thiện)
    const publicBaseUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
    return `${publicBaseUrl}/${fileName}`;
  } catch (error) {
    console.error("Lỗi Upload R2:", error);
    throw error;
  }
};
