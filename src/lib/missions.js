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
        xp: 25,
        type: 'daily'
    },
    daily_read_3: {
        key: 'daily_read_3',
        title: 'Độc hành giả II',
        description: 'Đọc 3 chương truyện trong ngày',
        category: MISSION_CATEGORIES.DAILY,
        target: 3,
        xp: 50,
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
export const fetchUserMissionProgress = async (userId, customClient = null) => {
    if (!userId) return [];
    
    const client = customClient || supabase;

    try {
        // 1. Lấy mốc thời gian "Hôm nay" chuẩn Việt Nam 🇻🇳
        const startOfToday = getStartOfVNDay();
        const startOfTodayISO = startOfToday.toISOString();

        // Chạy song song các truy vấn cơ bản để tối ưu tốc độ 🚀
        const [
            { count: totalRead },
            { count: dailyRead },
            { count: totalValidComments },
            { data: dailyComments },
            { data: claims }
        ] = await Promise.all([
            client.from('shiroi_read_chapters').select('*', { count: 'exact', head: true }).eq('user_id', userId),
            client.from('shiroi_read_chapters').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('read_at', startOfTodayISO),
            client.from('comments').select('*', { count: 'exact', head: true }).eq('user_id', userId),
            client.from('comments').select('content, created_at').eq('user_id', userId).gte('created_at', startOfTodayISO),
            client.from('shiroi_mission_claims').select('mission_key, claimed_at').eq('user_id', userId)
        ]);
        
        const dailyValidCommentsRaw = dailyComments?.filter(c => !isGibberish(c.content)) || [];
        const dailyContributionCount = Math.min(dailyValidCommentsRaw.length, 10);
        
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

        // 3. Xử lý nhiệm vụ Chinh phục bộ truyện (Toàn bộ hệ thống) ⚔️
        try {
            // Lấy tất cả bộ truyện có trên hệ thống (Lấy thêm status để kiểm tra hoàn thành)
            const { data: allMangas } = await client.from('mangas').select('id, title, genres, status');
            if (allMangas && allMangas.length > 0) {
                const mangaIds = allMangas.map(m => m.id);
                
                // Lấy tổng số chương và số lượng đã đọc song song 🚀
                const [
                    { data: chapterCounts },
                    { data: userReadCounts }
                ] = await Promise.all([
                    client.from('chapters').select('manga_id').in('manga_id', mangaIds).limit(10000),
                    client.from('shiroi_read_chapters').select('manga_id').eq('user_id', userId).in('manga_id', mangaIds)
                ]);

                const totalMap = {};
                chapterCounts?.forEach(c => {
                    totalMap[c.manga_id] = (totalMap[c.manga_id] || 0) + 1;
                });

                const userMap = {};
                userReadCounts?.forEach(c => {
                    userMap[c.manga_id] = (userMap[c.manga_id] || 0) + 1;
                });

                // Tạo nhiệm vụ Chinh phục cho từng bộ
                allMangas.forEach(m => {
                    const total = totalMap[m.id] || 0;
                    const read = userMap[m.id] || 0;
                    
                    // 🚩 CHỈ TÍNH NHỮNG BỘ CÓ CHƯƠNG 🛡️
                    if (total === 0) return;

                    // 🏁 CHỈ TẶNG THƯỞNG NẾU: Đã đọc hết AND Admin đánh dấu Hoàn thành (COMPLETED)
                    const isFinished = m.status === 'COMPLETED';

                    if (read >= total && isFinished) {
                        const mKey = `finish_series_${m.id}`;
                        
                        // Tính toán thưởng: 1 chương (One-shot) = 50 XP, nhiều chương = Dùng hàm tính toán 💎
                        const rewardXp = total === 1 ? 50 : calculateConquestReward(total);

                        results.push({
                            key: mKey,
                            title: `Chinh phục: ${m.title}`,
                            description: total === 1 ? `Hoàn thành bộ truyện One-shot` : `Hoàn thành bộ truyện dài ${total} chương`,
                            category: MISSION_CATEGORIES.CONQUEST,
                            target: total,
                            current: read,
                            xp: rewardXp,
                            isCompleted: true,
                            isClaimed: lifetimeClaimedKeys.has(mKey)
                        });
                    }
                });

                // 🏆 NHIỆM VỤ ĐẠI CHINH PHỤC (PHÁ ĐẢO TOÀN BỘ) 💮
                const totalFinished = allMangas.filter(m => (totalMap[m.id] || 0) > 0).length;
                const userFinishedCount = results.filter(r => r.category === MISSION_CATEGORIES.CONQUEST).length;
                const grandKey = 'grand_conquest_all';
                const isGrandClaimed = lifetimeClaimedKeys.has(grandKey);

                // Hiển thị nhiệm vụ nếu đã hoàn thành HOẶC đã nhận thưởng từ trước 🍀
                if (totalFinished > 0) {
                    results.push({
                        key: grandKey,
                        title: `💮 ĐẠI CHINH PHỤC: PHÁ ĐẢO SHIROI`,
                        description: isGrandClaimed 
                            ? `Bạn đã là Huyền thoại Chinh phục của Shiroi Arika! ✨`
                            : `Quét sạch toàn bộ ${totalFinished} bộ truyện trên hệ thống để nhận thưởng cực đại.`,
                        category: MISSION_CATEGORIES.CONQUEST,
                        target: totalFinished,
                        current: isGrandClaimed ? totalFinished : userFinishedCount, // Nếu đã nhận thì giữ 100%
                        xp: 10000,
                        isCompleted: isGrandClaimed || userFinishedCount >= totalFinished,
                        isClaimed: isGrandClaimed
                    });
                }
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
