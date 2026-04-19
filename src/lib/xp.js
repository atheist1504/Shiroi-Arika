// 🍀 CHUẨN SHIROI XP LOGIC (Nguồn Chân Lý Duy Nhất) 🏗️

export const XP_REWARDS = {
  DAILY_CHECKIN: 100, // Thưởng 100 XP mỗi ngày
  READ_CHAPTER: 20,   // Thưởng 20 XP mỗi chương (giới hạn 1 ch/người)
  FIRST_COMMENT: 10,  // Thưởng 10 XP cho bình luận đầu tiên trong ngày
  SUBSEQUENT_COMMENT: 5, // Thưởng 5 XP cho các bình luận tiếp theo
  MAX_DAILY_COMMENT_XP: 100, // Giới hạn 100 XP từ bình luận mỗi ngày
  COMMENT_COOLDOWN: 30000,   // 30 giây chờ giữa các lần nhận XP bình luận
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
    { name: 'Vạn cổ như đêm dài', lv: 110 },
    { name: 'Đệ nhị thiên hạ', lv: 105 },
    { name: 'Độc cô cầu bại', lv: 100 },
    { name: 'Ẩn sĩ sơn lâm', lv: 95 },
    { name: 'Tàn ảnh phong vân', lv: 90 },
    { name: 'Túy quyền tửu khách', lv: 85 },
    { name: 'Hành giả độc hành', lv: 80 },
    { name: 'Cao nhân ở ẩn', lv: 75 },
    { name: 'Lãng khách', lv: 70 },
    { name: 'Đại sư tỷ', lv: 65 },
    { name: 'Đại sư huynh', lv: 60 },
    { name: 'Tiểu sư muội', lv: 55 },
    { name: 'Kỳ môn độn giả', lv: 50 },
    { name: 'Tàng thư các chủ', lv: 45 },
    { name: 'Sĩ phu', lv: 40 },
    { name: 'Nho sinh', lv: 35 },
    { name: 'Hồ ly tinh', lv: 30 },
    { name: 'Giang hồ tiểu bạch', lv: 25 },
    { name: 'Hàn môn tử đệ', lv: 20 },
    { name: 'Kẻ vô danh', lv: 15 },
    { name: 'Tiểu quy đầu', lv: 10 },
    { name: 'Đệ tử tạp dịch', lv: 5 },
    { name: 'Vô danh tiểu tốt', lv: 1 },
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
