const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://psgivxgycjireinwnelc.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzZ2l2eGd5Y2ppcmVpbnduZWxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxOTQ2OTUsImV4cCI6MjA5MDc3MDY5NX0.E0vWoptWMkDQo4qh45tYy1qjpsZCHBad0IBhgP8IVI0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBadges() {
  console.log("🔍 Đang kiểm tra danh hiệu Top 10...");
  
  const { data, error } = await supabase
    .from('shiroi_users')
    .select('username, display_name, xp, level, selected_badge')
    .neq('role', 'admin')
    .order('xp', { ascending: false })
    .limit(15);

  if (error) {
    console.error("❌ Lỗi truy vấn:", error.message);
    return;
  }

  console.table(data.map(u => ({
    "Tên": u.display_name || u.username,
    "XP": u.xp,
    "LV": u.level,
    "Danh hiệu hiện tại": u.selected_badge
  })));
  
  const hasBadges = data.some(u => u.selected_badge && u.selected_badge.includes('Thử Nghiệm'));
  if (hasBadges) {
    console.log("\n✅ KẾT QUẢ: Đã thấy danh hiệu 'Thử Nghiệm' được trao thành công!");
  } else {
    console.log("\n❌ KẾT QUẢ: Chưa thấy danh hiệu 'Thử Nghiệm' nào.");
    console.log("👉 Nguyên nhân có thể là do bạn chạy lệnh RESET (về XP=0) TRƯỚC khi trao danh hiệu, hoặc trao xong rồi nhưng lệnh RESET đè lên.");
  }
}

checkBadges();
