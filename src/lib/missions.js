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
 * 💎 Hàm tính mức thưởng Chinh phục bộ truyện dựa trên số chương ⚔️
 */
export const calculateConquestReward = (totalChapters) => {
    if (totalChapters >= 100) return 2000;
    if (totalChapters >= 50) return 1000;
    if (totalChapters >= 20) return 500;
    return 200;
};

/**
 * 🕵️‍♂️ Kiểm tra Spam bình luận: Chặn ký tự lặp lại hoặc chuỗi vô nghĩa 🍀
 */
export const isGibberish = (text) => {
    if (!text || text.length < 2) return true;
    
    const trimmed = text.trim();
    if (trimmed.length < 2) return true;

    // 1. Chặn lặp ký tự vô nghĩa (eee, vvv, ...)
    const repeatedPattern = /(.)\1{4,}/; 
    if (repeatedPattern.test(trimmed)) return true;

    // 2. Chặn lặp từ (ví dụ: "hay hay hay hay hay")
    const words = trimmed.toLowerCase().split(/\s+/);
    if (words.length >= 5) {
        let sameCount = 0;
        for (let i = 0; i < words.length - 1; i++) {
            if (words[i] === words[i+1] && words[i].length > 1) sameCount++;
        }
        if (sameCount >= 3) return true;
    }

    // 3. Chặn chỉ có ký tự đặc biệt/số (không có chữ cái)
    const hasAlpha = /[a-zA-Z\u00C0-\u1EF9]/.test(trimmed);
    if (!hasAlpha) return true;

    return false;
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
 * 🇻🇳 HÀM HELPER: Lấy thời điểm 00:00:00 của ngày hiện tại tại Việt Nam (GMT+7)
 * Trả về đối tượng Date ở dạng UTC tương ứng để so sánh chính xác trên DB. 🍀
 */
export const getStartOfVNDay = () => {
    const now = new Date();
    const vnDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(now);
    return new Date(`${vnDateStr}T00:00:00+07:00`);
};

/**
 * 🧭 Tính toán tiến trình nhiệm vụ của người dùng
 */
export const fetchUserMissionProgress = async (userId) => {
    if (!userId) return [];

    try {
        // 1. Lấy mốc thời gian "Hôm nay" chuẩn Việt Nam 🇻🇳
        const startOfToday = getStartOfVNDay();
        const startOfTodayISO = startOfToday.toISOString();

        // Đếm tổng chương đã đọc
        const { count: totalRead } = await supabase.from('shiroi_read_chapters').select('*', { count: 'exact', head: true }).eq('user_id', userId);
        
        // Đọc trong ngày (Dựa trên mốc 00:00:00 VN)
        const { count: dailyRead } = await supabase.from('shiroi_read_chapters').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('read_at', startOfTodayISO);

        // Đếm tổng bình luận hợp lệ (Chỉ đếm Head để tối ưu RAM)
        const { count: totalValidComments } = await supabase.from('comments').select('*', { count: 'exact', head: true }).eq('user_id', userId);
        
        // Bình luận trong ngày (Chỉ lấy bình luận hôm nay để kiểm tra spam)
        const { data: dailyComments } = await supabase.from('comments').select('content, created_at').eq('user_id', userId).gte('created_at', startOfTodayISO);
        
        const dailyValidCommentsRaw = dailyComments?.filter(c => !isGibberish(c.content)) || [];
        const dailyContributionCount = Math.min(dailyValidCommentsRaw.length, 10);
        
        // Lấy danh sách đã nhận thưởng (Bao gồm cả thời điểm nhận)
        const { data: claims } = await supabase.from('shiroi_mission_claims').select('mission_key, claimed_at').eq('user_id', userId);
        
        // Phân loại Claim thành 2 loại: Hàng ngày và Trọn đời
        const lifetimeClaimedKeys = new Set();
        const dailyClaimedKeysToday = new Set();

        claims?.forEach(c => {
            const claimedAt = new Date(c.claimed_at);
            
            if (claimedAt >= startOfToday) {
                dailyClaimedKeysToday.add(c.mission_key);
            }
            lifetimeClaimedKeys.add(c.mission_key);
        });

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
                isClaimed: m.type === 'daily' ? dailyClaimedKeysToday.has(m.key) : lifetimeClaimedKeys.has(m.key)
            };
        });

        // 3. Xử lý nhiệm vụ Chinh phục bộ truyện (Đã hoàn thành) ⚔️
        // Chỉ hiện với những bộ truyện có Status là 'completed' và user đã đọc xong hoàn toàn.
        try {
            const { data: completedMangas } = await supabase.from('mangas').select('id, title, genres').eq('status', 'completed');
            if (completedMangas && completedMangas.length > 0) {
                const mangaIds = completedMangas.map(m => m.id);
                
                // Lấy tổng số chương của các bộ này (Tăng giới hạn lên 10,000 để tránh mất dữ liệu)
                const { data: chapterCounts } = await supabase.from('chapters').select('manga_id').in('manga_id', mangaIds).limit(10000);
                const totalMap = {};
                chapterCounts?.forEach(c => {
                    totalMap[c.manga_id] = (totalMap[c.manga_id] || 0) + 1;
                });

                // Lấy số lượng user đã đọc trong các bộ này
                const { data: userReadCounts } = await supabase.from('shiroi_read_chapters').select('manga_id').eq('user_id', userId).in('manga_id', mangaIds);
                const userMap = {};
                userReadCounts?.forEach(c => {
                    userMap[c.manga_id] = (userMap[c.manga_id] || 0) + 1;
                });

                // Tạo nhiệm vụ Chinh phục cho từng bộ
                completedMangas.forEach(m => {
                    const total = totalMap[m.id] || 0;
                    const read = userMap[m.id] || 0;
                    
                    // 🚩 LOẠI BỎ ONE-SHOT (Dựa trên số chương HOẶC Thể loại) 🛡️
                    const isOneShotGenre = m.genres?.some(g => {
                        const normalized = g.toLowerCase().replace(/[^a-z]/g, '');
                        return normalized.includes('oneshot');
                    });
                    
                    if (total > 1 && !isOneShotGenre && read >= total) {

                        const mKey = `finish_series_${m.id}`;
                        
                        // Tính toán thưởng dựa trên số chương (Dùng hàm dùng chung)
                        const rewardXp = calculateConquestReward(total);

                        results.push({
                            key: mKey,
                            title: `Chinh phục: ${m.title}`,
                            description: `Hoàn thành bộ truyện dài ${total} chương`,
                            category: MISSION_CATEGORIES.CONQUEST,
                            target: total,
                            current: read,
                            xp: rewardXp,
                            isCompleted: true,
                            isClaimed: lifetimeClaimedKeys.has(mKey)
                        });
                    }
                });
            }
        } catch (err) {
            console.error("Lỗi tính toán nhiệm vụ Chinh phục:", err);
        }
        
        return results;
    } catch (err) {
        console.error("Lỗi tính toán nhiệm vụ:", err);
        return [];
    }
};
