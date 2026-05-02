import { supabaseAdmin } from './src/lib/supabaseAdmin';

async function test() {
    const userId = 'da79a186-c536-4610-b702-ce8154d45a6f';
    const username = 'ShiroiArika';
    
    console.log("🔍 Đang kiểm tra dữ liệu cho:", username, userId);
    
    const [mId, mName, cId, cName] = await Promise.all([
        supabaseAdmin.from('shiroi_history').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabaseAdmin.from('shiroi_history').select('*', { count: 'exact', head: true }).eq('username', username),
        supabaseAdmin.from('shiroi_read_chapters').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabaseAdmin.from('shiroi_read_chapters').select('*', { count: 'exact', head: true }).eq('username', username)
    ]);
    
    console.log("📊 Kết quả đếm:");
    console.log("- Manga (theo ID):", mId.count);
    console.log("- Manga (theo Tên):", mName.count);
    console.log("- Chương (theo ID):", cId.count);
    console.log("- Chương (theo Tên):", cName.count);
}

test();
