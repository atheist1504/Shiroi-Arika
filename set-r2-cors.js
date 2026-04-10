const { S3Client, PutBucketCorsCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

async function run() {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) throw new Error('.env.local không tồn tại');
    
    const env = fs.readFileSync(envPath, 'utf8');
    const getVal = (key) => env.match(new RegExp(`${key}=(.*)`))?.[1]?.trim();
    
    const bucketName = getVal('R2_BUCKET_NAME');
    const accessKeyId = getVal('R2_ACCESS_KEY_ID');
    const secretAccessKey = getVal('R2_SECRET_ACCESS_KEY');
    const accountId = getVal('R2_ACCOUNT_ID');

    if (!bucketName || !accessKeyId || !secretAccessKey || !accountId) {
      throw new Error('Thiếu thông tin cấu hình trong .env.local');
    }

    const S3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    const command = new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: [{
          AllowedHeaders: ['*'],
          AllowedMethods: ['PUT', 'GET', 'OPTIONS', 'POST', 'DELETE'],
          AllowedOrigins: ['*'],
          MaxAgeSeconds: 3000
        }]
      }
    });

    console.log(`📡 Đang gửi lệnh CORS tới R2 cho bucket: ${bucketName}...`);
    await S3.send(command);
    console.log('✅ THÀNH CÔNG: Đã kích hoạt CORS cho Bucket qua API!');
  } catch (err) {
    console.error('❌ LỖI:', err.message);
    process.exit(1);
  }
}

run();
