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
    DAY_3: 100,   // Thưởng thêm +100 XP (Tổng 200)
    DAY_7: 200,   // Thưởng thêm +200 XP (Tổng 300)
    DAY_14: 500,  // Thưởng thêm +500 XP (Tổng 600)
    DAY_21: 500,  // Thưởng thêm +500 XP (Tổng 600)
    DAY_30: 1000, // Thưởng thêm +1000 XP (Tổng 1100)
};

export const calculateLevel = (xp) => {
  return Math.floor((xp || 0) / 100) + 1;
};

export const calculateProgress = (xp) => {
  return (xp || 0) % 100;
};

export const TITLES = [
    // 🏆 DANH HIỆU HUYỀN THOẠI (Dành riêng cho những người khai mở Shiroi Arika) 🍀
    { name: '🥇 Quán Quân Thử Nghiệm', lv: 999 },
    { name: '🥈 Á Quân Thử Nghiệm', lv: 998 },
    { name: '🥉 Hạng 3 Thử Nghiệm', lv: 997 },
    { name: '🎖️ Top 10 Thử Nghiệm', lv: 996 },

    { name: 'Thái Thượng Vong Tình Quyết', lv: 220 },
    { name: 'Thiên cơ bất khả lộ', lv: 215 },
    { name: 'Đệ nhất kiếm tiên', lv: 210 },
    { name: 'Bóng Đêm Vô Tận', lv: 205 },
    { name: 'Vạn cổ như đêm dài', lv: 200 },
    { name: 'Thâm tàng bất lộ', lv: 195 },
    { name: 'Sát Thủ Bóng Đêm', lv: 190 },
    { name: 'Độc cô cầu bại', lv: 185 },
    { name: 'Đệ nhị thiên hạ', lv: 180 },
    { name: 'Thịnh cực tất suy', lv: 175 },
    { name: 'Tuệ cực tất thương', lv: 170 },
    { name: 'Ẩn sĩ sơn lâm', lv: 165 },
    { name: 'Tàn ảnh phong vân', lv: 160 },
    { name: 'Túy quyền tửu khách', lv: 155 },
    { name: 'Hành giả độc hành', lv: 150 },
    { name: 'Lối đi riêng', lv: 145 },
    { name: 'Cửu sư thúc', lv: 140 },
    { name: 'Cao nhân ở ẩn', lv: 135 },
    { name: 'Đại tiểu thư', lv: 130 },
    { name: 'Băng thanh ngọc khiết', lv: 125 },
    { name: 'Ôn nhuận như ngọc', lv: 120 },
    { name: 'Lãng khách', lv: 115 },
    { name: 'Đại sư tỷ', lv: 110 },
    { name: 'Đại sư huynh', lv: 105 },
    { name: 'Tiểu sư muội', lv: 100 },
    { name: 'Kỳ môn độn giả', lv: 95 },
    { name: 'Tiểu vọng thư', lv: 90 },
    { name: 'Họa mây', lv: 85 },
    { name: 'Tàng thư các chủ', lv: 80 },
    { name: 'Sĩ phu', lv: 75 },
    { name: 'Nho sinh', lv: 70 },
    { name: 'Vạn kiếp bất phục', lv: 65 },
    { name: 'Nhân sinh như mộng', lv: 60 },
    { name: 'Dục tốc bất đạt', lv: 55 },
    { name: 'Hồ ly tinh', lv: 50 },
    { name: 'Giang hồ tiểu bạch', lv: 45 },
    { name: 'Vật có duyên với ta', lv: 40 },
    { name: 'Đạo hữu dừng bước', lv: 35 },
    { name: 'Hàn môn tử đệ', lv: 30 },
    { name: 'Tẩu vi thượng sách', lv: 25 },
    { name: 'Nhất kiến chung tình', lv: 20 },
    { name: 'Kẻ vô danh', lv: 15 },
    { name: 'Tiểu quy đầu', lv: 10 },
    { name: 'Đệ tử tạp dịch', lv: 5 },
    { name: 'Vô danh tiểu tốt', lv: 1 },
];

// Hàm tính danh xưng (Title) chuẩn Shiroi ✨
export const calculateTitle = (xp, selectedBadge = null) => {
    const lvl = calculateLevel(xp);
    // 🚀 ƯU TIÊN 1: Nếu người dùng đã chủ động chọn một danh hiệu (Badge) -> Hiển thị nó 🍀
    // (Bao gồm cả danh hiệu cứng và danh hiệu động từ Database)
    if (selectedBadge && typeof selectedBadge === 'string' && selectedBadge.trim()) {
        const standardTitle = TITLES.find(t => t.name === selectedBadge);
        // 💎 ĐẶC CÁCH: Nếu là danh hiệu "Thử Nghiệm" (lv >= 900) hoặc người dùng đủ cấp -> Cho phép hiển thị 🍀
        if (!standardTitle || lvl >= standardTitle.lv || standardTitle.lv >= 900) {
            return { name: selectedBadge, lv: standardTitle ? standardTitle.lv : 0 };
        }
    }

    // 🚀 ƯU TIÊN 2: Nếu không chọn hoặc không đủ cấp, trả về danh hiệu cao nhất đã mở khóa theo Level
    const unlockedTitles = TITLES.filter(t => lvl >= t.lv);
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
        const res = await recordXpLogAction(amount, type, reason, userId);
        if (!res.success) {
            console.warn("Ghi log XP thất bại (Server):", res.error);
        }
    } catch (err) {
        console.error("Lỗi gọi Server Action Log XP:", err);
    }
};
