const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function test() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const getVal = (key) => env.match(new RegExp(`${key}=(.*)`))?.[1]?.trim();
  
  const url = getVal('NEXT_PUBLIC_SUPABASE_URL');
  const key = getVal('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  
  const supabase = createClient(url, key);
  
  console.log("Checking last 5 chapters...");
  const { data: chapters, error: cErr } = await supabase.from('chapters').select('id, chapter_number, manga_id').order('created_at', { ascending: false }).limit(5);
  
  if (cErr) {
    console.error("Error fetching chapters:", cErr);
    return;
  }
  
  for (const chap of chapters) {
    console.log(`\nChapter ${chap.id} (Number: ${chap.chapter_number})`);
    const { data: pages, error: pErr } = await supabase.from('pages').select('id, image_url, page_number').eq('chapter_id', chap.id).order('page_number', { ascending: true }).limit(3);
    
    if (pErr) {
      console.error("Error fetching pages:", pErr);
      continue;
    }
    
    pages.forEach(p => {
      console.log(`  Page ${p.page_number}: ${p.image_url}`);
    });
  }
}

test();
