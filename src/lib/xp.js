// 🍀 CHUẨN SHIROI XP LOGIC (Nguồn Chân Lý Duy Nhất) 🏗️

export const XP_REWARDS = {
  DAILY_CHECKIN: 100, // Thưởng 100 XP mỗi ngày
  READ_CHAPTER: 20,   // Thưởng 20 XP mỗi chương (giới hạn 1 ch/người)
  FIRST_COMMENT: 10,  // Thưởng 10 XP cho bình luận đầu tiên trong ngày
  SUBSEQUENT_COMMENT: 5, // Thưởng 5 XP cho các bình luận tiếp theo
  MAX_DAILY_COMMENT_XP: 100, // Giới hạn 100 XP từ bình luận mỗi ngày
  COMMENT_COOLDOWN: 60000,   // 60 giây chờ giữa các lần nhận XP bình luận
};

export const STREAK_BONUSES = {
    DAY_3: 100,   // Thưởng chuỗi 3 ngày
    DAY_7: 200,   // Thưởng chuỗi 7 ngày
    DAY_14: 500,  // Thưởng chuỗi 14 ngày
    DAY_21: 500,  // Thưởng chuỗi 21 ngày
    DAY_30: 1000, // Thưởng chuỗi 30 ngày
};

export const calculateLevel = (xp) => {
  return Math.floor((xp || 0) / 100) + 1;
};

export const calculateProgress = (xp) => {
  return (xp || 0) % 100;
};

export const TITLES = [
    { name: 'HIỀN GIẢ', color: '#4caf50', icon: '🧙‍♂️', lv: 50 },
    { name: 'ĐẠI SƯ', color: '#4caf50', icon: '🎨', lv: 35 },
    { name: 'HỘ VỆ', color: '#4caf50', icon: '🛡️', lv: 20 },
    { name: 'CHIẾN BINH', color: '#4caf50', icon: '🗡️', lv: 10 },
    { name: 'LỮ KHÁCH', color: '#4caf50', icon: '🚶', lv: 1 },
];

// Hàm tính danh xưng (Title) chuẩn Shiroi ✨
export const calculateTitle = (xp, selectedBadge = null) => {
    const lvl = calculateLevel(xp);
    const unlockedTitles = TITLES.filter(t => lvl >= t.lv);
    
    // Nếu có chọn danh hiệu và danh hiệu đó đã mở khóa -> Ưu tiên dùng 🍀
    if (selectedBadge) {
        const selected = TITLES.find(t => t.name.toUpperCase() === selectedBadge.toUpperCase());
        if (selected && lvl >= selected.lv) return selected;
    }

    // Mặc định: Trả về danh hiệu cao nhất đã mở khóa
    return unlockedTitles[0] || TITLES[TITLES.length - 1];
};

export const getStreakBonus = (newStreak) => {
    if (newStreak === 30) return STREAK_BONUSES.DAY_30;
    if (newStreak === 21) return STREAK_BONUSES.DAY_21;
    if (newStreak === 14) return STREAK_BONUSES.DAY_14;
    if (newStreak === 7) return STREAK_BONUSES.DAY_7;
    if (newStreak === 3) return STREAK_BONUSES.DAY_3;
    return 0;
};

/**
 * 📝 Ghi lại nhật ký XP để phục vụ BXH Tháng 🍀
 * Chuyển sang sử dụng Server Action để đảm bảo bảo mật RLS 🛡️
 */
export const recordXpLog = async (supabase, userId, amount, type, reason = null) => {
    if (!userId || !amount) return;
    try {
        const { recordXpLogAction } = await import('./actions');
        const res = await recordXpLogAction(userId, amount, type, reason);
        if (!res.success) {
            console.warn("Ghi log XP thất bại (Server):", res.error);
        }
    } catch (err) {
        console.error("Lỗi gọi Server Action Log XP:", err);
    }
};
