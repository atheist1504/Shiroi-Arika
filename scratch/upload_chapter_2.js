
const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const axios = require('axios');
const fs = require('fs');

// Configuration from .env.local
const supabaseUrl = 'https://psgivxgycjireinwnelc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzZ2l2eGd5Y2ppcmVpbnduZWxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxOTQ2OTUsImV4cCI6MjA5MDc3MDY5NX0.E0vWoptWMkDQo4qh45tYy1qjpsZCHBad0IBhgP8IVI0';

const r2Config = {
  bucket: 'shiroi',
  endpoint: 'https://4e8800a6a4f6c6ccbad3d7eceb863db0.r2.cloudflarestorage.com',
  accessKeyId: '2b903d933691a0519b8ca6689c62ae89',
  secretAccessKey: '5705a87d4e45b3dc761477886a33425f5069e556e9f04979d96f5404d6ea63f9',
  publicUrl: 'https://pub-d501ec30298b49da8ecc1281a2194602.r2.dev'
};

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const s3 = new S3Client({
  region: 'auto',
  endpoint: r2Config.endpoint,
  credentials: {
    accessKeyId: r2Config.accessKeyId,
    secretAccessKey: r2Config.secretAccessKey,
  },
});

const mangaTitle = 'From Nightmare To Love';
const chapterNumber = 2;
const imageUrls = [
  'https://sv1.otruyencdn.com/uploads/20231126/f5c628f5c604ea895e6495204d5831d0/chapter_2/page_1.jpg',
  'https://sv1.otruyencdn.com/uploads/20231126/f5c628f5c604ea895e6495204d5831d0/chapter_2/page_2.jpg',
  'https://sv1.otruyencdn.com/uploads/20231126/f5c628f5c604ea895e6495204d5831d0/chapter_2/page_3.jpg',
  'https://sv1.otruyencdn.com/uploads/20231126/f5c628f5c604ea895e6495204d5831d0/chapter_2/page_4.jpg',
  'https://sv1.otruyencdn.com/uploads/20231126/f5c628f5c604ea895e6495204d5831d0/chapter_2/page_5.jpg',
  'https://sv1.otruyencdn.com/uploads/20231126/f5c628f5c604ea895e6495204d5831d0/chapter_2/page_6.jpg',
  'https://sv1.otruyencdn.com/uploads/20231126/f5c628f5c604ea895e6495204d5831d0/chapter_2/page_7.jpg',
  'https://sv1.otruyencdn.com/uploads/20231126/f5c628f5c604ea895e6495204d5831d0/chapter_2/page_8.jpg',
  'https://sv1.otruyencdn.com/uploads/20231126/f5c628f5c604ea895e6495204d5831d0/chapter_2/page_9.jpg',
  'https://sv1.otruyencdn.com/uploads/20231126/f5c628f5c604ea895e6495204d5831d0/chapter_2/page_10.jpg',
  'https://sv1.otruyencdn.com/uploads/20231126/f5c628f5c604ea895e6495204d5831d0/chapter_2/page_11.jpg',
  'https://sv1.otruyencdn.com/uploads/20231126/f5c628f5c604ea895e6495204d5831d0/chapter_2/page_12.jpg',
  'https://sv1.otruyencdn.com/uploads/20231126/f5c628f5c604ea895e6495204d5831d0/chapter_2/page_13.jpg',
  'https://sv1.otruyencdn.com/uploads/20231126/f5c628f5c604ea895e6495204d5831d0/chapter_2/page_14.jpg',
  'https://sv1.otruyencdn.com/uploads/20231126/f5c628f5c604ea895e6495204d5831d0/chapter_2/page_15.jpg',
  'https://sv1.otruyencdn.com/uploads/20231126/f5c628f5c604ea895e6495204d5831d0/chapter_2/page_16.jpg',
  'https://sv1.otruyencdn.com/uploads/20231126/f5c628f5c604ea895e6495204d5831d0/chapter_2/page_17.jpg',
  'https://sv1.otruyencdn.com/uploads/20231126/f5c628f5c604ea895e6495204d5831d0/chapter_2/page_18.jpg',
  'https://sv1.otruyencdn.com/uploads/20231126/f5c628f5c604ea895e6495204d5831d0/chapter_2/page_19.jpg',
  'https://sv1.otruyencdn.com/uploads/20231126/f5c628f5c604ea895e6495204d5831d0/chapter_2/page_20.jpg',
  'https://sv1.otruyencdn.com/uploads/20231126/f5c628f5c604ea895e6495204d5831d0/chapter_2/page_21.jpg',
  'https://sv1.otruyencdn.com/uploads/20231126/f5c628f5c604ea895e6495204d5831d0/chapter_2/page_22.jpg',
  'https://sv1.otruyencdn.com/uploads/20231126/f5c628f5c604ea895e6495204d5831d0/chapter_2/page_23.jpg',
  'https://sv1.otruyencdn.com/uploads/20231126/f5c628f5c604ea895e6495204d5831d0/chapter_2/page_24.jpg',
  'https://sv1.otruyencdn.com/uploads/20231126/f5c628f5c604ea895e6495204d5831d0/chapter_2/page_25.jpg',
  'https://sv1.otruyencdn.com/uploads/20231126/f5c628f5c604ea895e6495204d5831d0/chapter_2/page_26.jpg',
  'https://sv1.otruyencdn.com/uploads/20231126/f5c628f5c604ea895e6495204d5831d0/chapter_2/page_27.jpg',
  'https://sv1.otruyencdn.com/uploads/20231126/f5c628f5c604ea895e6495204d5831d0/chapter_2/page_28.jpg',
  'https://sv1.otruyencdn.com/uploads/20231126/f5c628f5c604ea895e6495204d5831d0/chapter_2/page_29.jpg',
  'https://sv1.otruyencdn.com/uploads/20231126/f5c628f5c604ea895e6495204d5831d0/chapter_2/page_30.jpg',
  'https://sv1.otruyencdn.com/uploads/20231126/f5c628f5c604ea895e6495204d5831d0/chapter_2/page_31.jpg',
  'https://sv1.otruyencdn.com/uploads/20231126/f5c628f5c604ea895e6495204d5831d0/chapter_2/page_32.jpg'
];

async function run() {
  try {
    console.log('🔍 Finding manga...');
    const { data: manga, error: mangaError } = await supabase
      .from('mangas')
      .select('id')
      .ilike('title', mangaTitle)
      .single();

    if (mangaError || !manga) {
      console.error('❌ Manga not found:', mangaTitle);
      return;
    }

    console.log(`✅ Found manga: ${mangaTitle} (ID: ${manga.id})`);

    // Create Chapter
    const { data: chapter, error: chapterError } = await supabase
      .from('chapters')
      .insert([{
        manga_id: manga.id,
        chapter_number: chapterNumber,
        title: `Chương ${chapterNumber}`,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (chapterError) {
      console.error('❌ Error creating chapter:', chapterError.message);
      return;
    }

    console.log(`✅ Created chapter: ${chapterNumber} (ID: ${chapter.id})`);

    const pagesData = [];

    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i];
      const pageNumber = i + 1;
      const fileName = `chapters/${chapter.id}/page_${pageNumber}.jpg`;

      console.log(`🌩️ Processing page ${pageNumber}/${imageUrls.length}...`);

      try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');

        await s3.send(new PutObjectCommand({
          Bucket: r2Config.bucket,
          Key: fileName,
          Body: buffer,
          ContentType: 'image/jpeg'
        }));

        const publicUrl = `${r2Config.publicUrl}/${fileName}`;
        pagesData.push({
          chapter_id: chapter.id,
          page_number: pageNumber,
          image_url: publicUrl,
          size_kb: Math.round(buffer.length / 1024)
        });

        console.log(`   ✅ Uploaded: ${publicUrl}`);
      } catch (uploadError) {
        console.error(`   ❌ Failed to upload page ${pageNumber}:`, uploadError.message);
      }
    }

    if (pagesData.length > 0) {
      const { error: pagesError } = await supabase.from('pages').insert(pagesData);
      if (pagesError) {
        console.error('❌ Error creating pages:', pagesError.message);
      } else {
        console.log(`🏁 Successfully uploaded ${pagesData.length} pages!`);
      }
    }

  } catch (err) {
    console.error('❌ Critical error:', err.message);
  }
}

run();
