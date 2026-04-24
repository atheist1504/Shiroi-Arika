import { S3Client, PutObjectCommand, DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * 🌩️ CLOUDFLARE R2 CLIENT GETTER
 * Giải quyết triệt để lỗi "Resolved credential object is not valid" bằng cách kiểm tra biến môi trường. 🍀
 */
const getS3Client = () => {
  const accountId = process.env.R2_ACCOUNT_ID || process.env.NEXT_PUBLIC_R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.NEXT_PUBLIC_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.NEXT_PUBLIC_R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Hệ thống chưa cấu hình Cloudflare R2! Vui lòng thêm các biến môi trường (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY) vào Vercel Project Settings."
    );
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
    },
  });
};

export const uploadToR2 = async (file, fileName) => {
  const bucketName = process.env.R2_BUCKET_NAME || process.env.NEXT_PUBLIC_R2_BUCKET_NAME || 'shiroi';
  const S3 = getS3Client();
  
  try {
    // 🛠️ Đảm bảo dữ liệu ở dạng Uint8Array để AWS SDK xử lý tốt nhất
    let bodyValue = file;
    if (file instanceof Blob || (typeof file?.arrayBuffer === 'function')) {
      const arrayBuffer = await file.arrayBuffer();
      bodyValue = new Uint8Array(arrayBuffer);
    }

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: bodyValue,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable",
    });

    await S3.send(command);
    
    // Trả về URL công khai
    const publicBaseUrl = process.env.R2_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
    
    if (!publicBaseUrl) {
        throw new Error("Lỗi: Thiếu biến môi trường R2_PUBLIC_URL trên Server! Không thể tạo đường dẫn ảnh.");
    }

    // Đảm bảo không bị thừa dấu gạch chéo
    const baseUrl = publicBaseUrl.endsWith('/') ? publicBaseUrl.slice(0, -1) : publicBaseUrl;
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
  const bucketName = process.env.R2_BUCKET_NAME || process.env.NEXT_PUBLIC_R2_BUCKET_NAME || 'shiroi';
  const S3 = getS3Client();

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    ContentType: "image/webp",
    CacheControl: "public, max-age=31536000, immutable",
  });

  // Vé có hiệu lực trong 5 phút (300 giây)
  const signedUrl = await getSignedUrl(S3, command, { expiresIn: 300 });

  // Tạo URL công khai cuối cùng
  const publicBaseUrl = process.env.R2_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (!publicBaseUrl) {
    throw new Error("Lỗi: Thiếu biến môi trường R2_PUBLIC_URL trên Server! Không thể tạo đường dẫn ảnh.");
  }
  const baseUrl = publicBaseUrl.endsWith('/') ? publicBaseUrl.slice(0, -1) : publicBaseUrl;
  const finalPublicUrl = `${baseUrl}/${fileName}`;

  return { signedUrl, finalPublicUrl };
};

/**
 * 🧹 XÓA TOÀN BỘ THƯ MỤC TRÊN R2
 * Dùng để dọn dẹp ảnh khi xóa chương hoặc xóa truyện 🍀
 */
export const deleteFolderFromR2 = async (folderPath) => {
  const bucketName = process.env.R2_BUCKET_NAME || process.env.NEXT_PUBLIC_R2_BUCKET_NAME || 'shiroi';
  const S3 = getS3Client();

  try {
    // 1. Liệt kê tất cả tệp trong thư mục
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: folderPath,
    });

    const listResponse = await S3.send(listCommand);

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      console.log(`ℹ️ Thư mục ${folderPath} trống hoặc không tồn tại.`);
      return true;
    }

    // 2. Chuẩn bị danh sách xóa
    const deleteParams = {
      Bucket: bucketName,
      Delete: {
        Objects: listResponse.Contents.map((obj) => ({ Key: obj.Key })),
      },
    };

    // 3. Thực hiện xóa hàng loạt
    const deleteCommand = new DeleteObjectsCommand(deleteParams);
    await S3.send(deleteCommand);

    console.log(`✅ Đã xóa ${listResponse.Contents.length} tệp trong thư mục: ${folderPath}`);
    return true;
  } catch (error) {
    console.error(`❌ Lỗi khi xóa thư mục ${folderPath}:`, error);
    throw error;
  }
};
