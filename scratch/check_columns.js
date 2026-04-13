
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkColumns() {
  const { data, error } = await supabase.rpc('get_current_user_id').catch(e => ({error: e}));
  // Vì không có RPC trực tiếp để xem cột, ta sẽ thử select một dòng và xem lỗi
  const { error: pageError } = await supabase.from('pages').select('size_kb').limit(1);
  const { error: mangaError } = await supabase.from('mangas').select('size_kb').limit(1);

  console.log('--- KẾT QUẢ KIỂM TRA ---');
  console.log('Pages size_kb logic:', pageError ? 'THIẾU CỘT (HOẶC LỖI)' : 'OK');
  console.log('Mangas size_kb logic:', mangaError ? 'THIẾU CỘT (HOẶC LỖI)' : 'OK');
}

checkColumns();
