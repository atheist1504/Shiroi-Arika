import { supabase } from './supabase';
import { recordXpLog } from './xp';

// 🍀 ĐỊNH NGHĨA HỆ THỐNG NHIỆM VỤ SHIROI Arika 🏗️💎
export const MISSION_CATEGORIES = {
    DAILY: 'Hàng ngày',
    LIFETIME_CHAPTERS: 'Tu luyện',
    LIFETIME_COMMENTS: 'Tương tác',
    CONQUEST: 'Chinh phục'
};

export const MISSIONS = {
    // 📅 NHIỆM VỤ HÀNG NGÀY
    daily_read_1: {
        key: 'daily_read_1',
        title: 'Độc hành giả I',
        description: 'Đọc 1 chương truyện trong ngày',
        category: MISSION_CATEGORIES.DAILY,
        target: 1,
        xp: 50,
        type: 'daily'
    },
    daily_read_3: {
        key: 'daily_read_3',
        title: 'Độc hành giả II',
        description: 'Đọc 3 chương truyện trong ngày',
        category: MISSION_CATEGORIES.DAILY,
        target: 3,
        xp: 100,
        type: 'daily'
    },
    daily_comment_1: {
        key: 'daily_comment_1',
        title: 'Thảo luận viên',
        description: 'Để lại 1 bình luận trong ngày',
        category: MISSION_CATEGORIES.DAILY,
        target: 1,
        xp: 30,
        type: 'daily'
    },

    // 📜 THÀNH TỰU TU LUYỆN (Cày chương)
    total_chapters_100: { key: 'total_chapters_100', title: 'Tiếp cận', description: 'Đọc tổng cộng 100 chương', category: MISSION_CATEGORIES.LIFETIME_CHAPTERS, target: 100, xp: 500, type: 'lifetime' },
    total_chapters_200: { key: 'total_chapters_200', title: 'Thành thạo', description: 'Đọc tổng cộng 200 chương', category: MISSION_CATEGORIES.LIFETIME_CHAPTERS, target: 200, xp: 1000, type: 'lifetime' },
    total_chapters_300: { key: 'total_chapters_300', title: 'Bứt phá', description: 'Đọc tổng cộng 300 chương', category: MISSION_CATEGORIES.LIFETIME_CHAPTERS, target: 300, xp: 1500, type: 'lifetime' },
    total_chapters_400: { key: 'total_chapters_400', title: 'Kiên trì', description: 'Đọc tổng cộng 400 chương', category: MISSION_CATEGORIES.LIFETIME_CHAPTERS, target: 400, xp: 2000, type: 'lifetime' },
    total_chapters_500: { key: 'total_chapters_500', title: 'Tông sư', description: 'Đọc tổng cộng 500 chương', category: MISSION_CATEGORIES.LIFETIME_CHAPTERS, target: 500, xp: 3000, type: 'lifetime' },
    total_chapters_600: { key: 'total_chapters_600', title: 'Vượt ngưỡng', description: 'Đọc tổng cộng 600 chương', category: MISSION_CATEGORIES.LIFETIME_CHAPTERS, target: 600, xp: 4000, type: 'lifetime' },
    total_chapters_700: { key: 'total_chapters_700', title: 'Khổ hạnh', description: 'Đọc tổng cộng 700 chương', category: MISSION_CATEGORIES.LIFETIME_CHAPTERS, target: 700, xp: 5000, type: 'lifetime' },
    total_chapters_800: { key: 'total_chapters_800', title: 'Đỉnh cao', description: 'Đọc tổng cộng 800 chương', category: MISSION_CATEGORIES.LIFETIME_CHAPTERS, target: 800, xp: 6000, type: 'lifetime' },
    total_chapters_900: { key: 'total_chapters_900', title: 'Vô đối', description: 'Đọc tổng cộng 900 chương', category: MISSION_CATEGORIES.LIFETIME_CHAPTERS, target: 900, xp: 8000, type: 'lifetime' },
    total_chapters_1000: { key: 'total_chapters_1000', title: 'Thánh nhân', description: 'Đọc tổng cộng 1000 chương', category: MISSION_CATEGORIES.LIFETIME_CHAPTERS, target: 1000, xp: 10000, type: 'lifetime' },

    // 💬 THÀNH TỰU TƯƠNG TÁC
    total_comments_10: { key: 'total_comments_10', title: 'Giao lưu', description: 'Để lại 10 bình luận', category: MISSION_CATEGORIES.LIFETIME_COMMENTS, target: 10, xp: 100, type: 'lifetime' },
    total_comments_50: { key: 'total_comments_50', title: 'Giao thiệp rộng', description: 'Để lại 50 bình luận', category: MISSION_CATEGORIES.LIFETIME_COMMENTS, target: 50, xp: 500, type: 'lifetime' },
    total_comments_100: { key: 'total_comments_100', title: 'Diễn thuyết gia', description: 'Để lại 100 bình luận', category: MISSION_CATEGORIES.LIFETIME_COMMENTS, target: 100, xp: 1000, type: 'lifetime' },
    total_comments_500: { key: 'total_comments_500', title: 'Cố vấn', description: 'Để lại 500 bình luận', category: MISSION_CATEGORIES.LIFETIME_COMMENTS, target: 500, xp: 5000, type: 'lifetime' },
    total_comments_1000: { key: 'total_comments_1000', title: 'Huyền thoại', description: 'Để lại 1000 bình luận', category: MISSION_CATEGORIES.LIFETIME_COMMENTS, target: 1000, xp: 10000, type: 'lifetime' },
};

/**
 * 🕵️‍♂️ Kiểm tra Spam bình luận: Chặn ký tự lặp lại vô nghĩa (eeeeee, vvvvvv...)
 */
export const isGibberish = (text) => {
    if (!text || text.length < 3) return false;
    const repeatedPattern = /(.)\1{4,}/; // Lặp lại 1 ký tự 5 lần trở lên
    return repeatedPattern.test(text);
};

/**
 * 🚀 Ghi nhận chương đã đọc (UNIQUE)
 */
export const recordUniqueRead = async (userId, username, mangaId, chapterId) => {
    if (!userId || !chapterId || !mangaId) return;
    try {
        const { error } = await supabase.from('shiroi_read_chapters').insert([{
            user_id: userId,
            chapter_id: chapterId,
            manga_id: mangaId
        }]);
        // Bỏ qua lỗi 23505 (Unique violation) vì user đã đọc rồi 🍀
    } catch (err) { /* Silent fail */ }
};

/**
 * 🧭 Tính toán tiến trình nhiệm vụ của người dùng
 */
export const fetchUserMissionProgress = async (userId) => {
    if (!userId) return [];

    try {
        // 1. Lấy dữ liệu thô
        const today = new Date();
        today.setHours(0,0,0,0);
        const todayISO = today.toISOString();

        // Đếm tổng chương đã đọc
        const { count: totalRead } = await supabase.from('shiroi_read_chapters').select('*', { count: 'exact', head: true }).eq('user_id', userId);
        
        // Đọc trong ngày
        const { count: dailyRead } = await supabase.from('shiroi_read_chapters').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('read_at', todayISO);

        // Đếm bình luận hợp lệ (Không tính spam)
        const { data: comments } = await supabase.from('comments').select('content, created_at').eq('user_id', userId);
        
        // Áp dụng quy tắc Anti-Spam cho bình luận
        const validComments = comments?.filter(c => !isGibberish(c.content)) || [];
        const totalValidComments = validComments.length;
        
        // Bình luận trong ngày (Giới hạn 10 lần đóng góp/ngày)
        const dailyValidCommentsRaw = validComments.filter(c => new Date(c.created_at) >= today);
        const dailyContributionCount = Math.min(dailyValidCommentsRaw.length, 10);
        
        // Lấy danh sách đã nhận thưởng
        const { data: claims } = await supabase.from('shiroi_mission_claims').select('mission_key').eq('user_id', userId);
        const claimedKeys = new Set(claims?.map(c => c.mission_key) || []);

        // 2. Map dữ liệu vào định nghĩa nhiệm vụ
        const results = Object.values(MISSIONS).map(m => {
            let current = 0;
            if (m.key.includes('daily_read')) current = dailyRead || 0;
            else if (m.key === 'daily_comment_1') current = dailyContributionCount || 0;
            else if (m.key.startsWith('total_chapters')) current = totalRead || 0;
            else if (m.key.startsWith('total_comments')) {
                // Logic: Tính tổng bình luận trọn đời (có thể giới hạn growth nhưng ở đây tính total valid)
                current = totalValidComments;
            }

            return {
                ...m,
                current: current,
                isCompleted: current >= m.target,
                isClaimed: claimedKeys.has(m.key)
            };
        });

        // 3. Xử lý nhiệm vụ Chinh phục & Hoàn tất (Tiered)
        // [Cần logic phức tạp hơn cho từng bộ truyện - sẽ làm ở bước sau hoặc component]
        
        return results;
    } catch (err) {
        console.error("Lỗi tính toán nhiệm vụ:", err);
        return [];
    }
};
