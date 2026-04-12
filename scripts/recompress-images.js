const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const axios = require('axios');
const sharp = require('sharp');
const path = require('path');

// 🔑 TRÍCH XUẤT CẤU HÌNH TỪ .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const getEnv = (key) => {
    const match = envContent.match(new RegExp(`${key}=(.*)`));
    return match ? match[1].trim() : null;
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'); // Hoặc Service Role nếu cần quyền cao hơn
const r2AccountId = getEnv('R2_ACCOUNT_ID') || getEnv('NEXT_PUBLIC_R2_ACCOUNT_ID');
const r2AccessKeyId = getEnv('R2_ACCESS_KEY_ID') || getEnv('NEXT_PUBLIC_R2_ACCESS_KEY_ID');
const r2SecretAccessKey = getEnv('R2_SECRET_ACCESS_KEY') || getEnv('NEXT_PUBLIC_R2_SECRET_ACCESS_KEY');
const r2BucketName = getEnv('R2_BUCKET_NAME') || getEnv('NEXT_PUBLIC_R2_BUCKET_NAME') || 'shiroi';
const r2PublicUrl = getEnv('R2_PUBLIC_URL') || getEnv('NEXT_PUBLIC_R2_PUBLIC_URL');

if (!supabaseUrl || !supabaseKey || !r2AccountId) {
    console.error("❌ Thiếu cấu hình trong .env.local!");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey
    }
});

async function run() {
    console.log("🔍 Đang lấy danh sách trang truyện từ Database...");
    
    const { data: pages, error } = await supabase
        .from('pages')
        .select('id, image_url, page_number')
        .order('id');

    if (error) {
        console.error("❌ Lỗi lấy dữ liệu:", error);
        return;
    }

    console.log(`✅ Tìm thấy ${pages.length} trang truyện.`);
    
    let success = 0;
    let failed = 0;
    let skipped = 0;

    for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const url = page.image_url;

        // Chỉ xử lý ảnh thuộc R2 của chúng ta
        if (!url.includes(r2PublicUrl.replace('https://', '')) && !url.includes('r2.dev')) {
            console.log(`[${i+1}/${pages.length}] ⏭️ Bỏ qua (Không phải R2): ${url}`);
            skipped++;
            continue;
        }

        const key = url.split('/').slice(3).join('/'); // Lấy path sau domain
        
        try {
            console.log(`[${i+1}/${pages.length}] 📥 Đang xử lý: ${key}...`);

            // 1. Tải ảnh
            const response = await axios({
                url,
                method: 'GET',
                responseType: 'arraybuffer'
            });

            const inputBuffer = Buffer.from(response.data);
            const originalSize = inputBuffer.length;

            // 2. Nén với Sharp
            const transformer = sharp(inputBuffer);
            const metadata = await transformer.metadata();

            let processed = transformer;
            if (metadata.width > 1100) {
                processed = processed.resize({ width: 1100, fit: 'inside' });
            }
            
            const outputBuffer = await processed
                .webp({ quality: 75 })
                .toBuffer();

            const newSize = outputBuffer.length;
            const saved = ((originalSize - newSize) / 1024).toFixed(2);

            if (newSize >= originalSize) {
                console.log(`   🔸 Không tiết kiệm được dung lượng. Bỏ qua ghi đè.`);
                skipped++;
                continue;
            }

            // 3. Tải lên lại R2 (Ghi đè)
            await s3.send(new PutObjectCommand({
                Bucket: r2BucketName,
                Key: key,
                Body: outputBuffer,
                ContentType: 'image/webp'
            }));

            console.log(`   ✅ Thành công! Tiết kiệm: ${saved} KB (${((originalSize - newSize) / originalSize * 100).toFixed(1)}%)`);
            success++;
        } catch (err) {
            console.error(`   ❌ Lỗi: ${err.message}`);
            failed++;
        }
    }

    console.log("\n--- KẾT QUẢ TỔNG THỂ ---");
    console.log(`✅ Thành công: ${success}`);
    console.log(`⏭️ Bỏ qua/Không đổi: ${skipped}`);
    console.log(`❌ Thất bại: ${failed}`);
    console.log("------------------------");
}

run();
