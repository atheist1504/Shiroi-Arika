// 🍀 CHUẨN SHIROI XP LOGIC (Nguồn Chân Lý Duy Nhất) 🏗️

export const XP_REWARDS = {
  DAILY_CHECKIN: 100, // Thưởng 100 XP mỗi ngày
  READ_CHAPTER: 20,   // Thưởng 20 XP mỗi chương (giới hạn 1 ch/người)
  POST_COMMENT: 5,    // Thưởng 5 XP mỗi bình luận
};

export const STREAK_BONUSES = {
    DAY_3: 200,   // Thưởng khi đạt chuỗi 3 ngày
    DAY_7: 500,   // Thưởng khi đạt chuỗi 7 ngày
    DAY_30: 5000, // Thưởng khi đạt chuỗi 30 ngày (Đại Sư)
};

export const calculateLevel = (xp) => {
  return Math.floor((xp || 0) / 100) + 1;
};

export const calculateProgress = (xp) => {
  return (xp || 0) % 100;
};

// Hàm tính danh xưng (Title) chuẩn Shiroi ✨
export const calculateTitle = (xp) => {
    const lvl = calculateLevel(xp);
    if (lvl >= 50) return { name: 'HIỀN GIẢ', color: '#4caf50', icon: '🧙‍♂️', lv: 50 };
    if (lvl >= 35) return { name: 'ĐẠI SƯ', color: '#ff9800', icon: '🎨', lv: 35 };
    if (lvl >= 20) return { name: 'HỘ VỆ', color: '#2196f3', icon: '🛡️', lv: 20 };
    if (lvl >= 10) return { name: 'CHIẾN BINH', color: '#f44336', icon: '🗡️', lv: 10 };
    return { name: 'LỮ KHÁCH', color: '#9e9e9e', icon: '🚶', lv: 1 };
};

export const getStreakBonus = (newStreak) => {
    if (newStreak === 30) return STREAK_BONUSES.DAY_30;
    if (newStreak === 7) return STREAK_BONUSES.DAY_7;
    if (newStreak === 3) return STREAK_BONUSES.DAY_3;
    return 0;
};
