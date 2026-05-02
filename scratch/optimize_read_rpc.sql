-- 🚀 SHIROI ARIKA PERFORMANCE OPTIMIZATION: ATOMIC READ HANDLER V2
-- Goal: Reduce Vercel CPU usage by consolidating 9+ DB calls into 1 RPC.

-- 1. Optimized Start of Day helper
CREATE OR REPLACE FUNCTION public.get_start_of_vn_day_sql()
RETURNS TIMESTAMPTZ AS $$
BEGIN
    -- Mốc 00:00:00 GMT+7 của ngày hiện tại
    RETURN (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh';
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. Atomic Read Handler
CREATE OR REPLACE FUNCTION public.rpc_handle_read_chapter_optimized(
    p_user_id UUID,
    p_username TEXT,
    p_manga_id UUID,
    p_chapter_id UUID,
    p_is_initial BOOLEAN DEFAULT FALSE
)
RETURNS JSON AS $$
DECLARE
    v_xp_gained INTEGER := 0;
    v_daily_read_count INTEGER;
    v_total_xp INTEGER;
    v_old_level INTEGER;
    v_new_level INTEGER;
    v_mission_completed TEXT := NULL;
    v_already_rewarded BOOLEAN;
    v_start_of_day TIMESTAMPTZ;
    v_user_role TEXT;
BEGIN
    v_start_of_day := public.get_start_of_vn_day_sql();

    -- 1. Ghi nhận đã đọc (Upsert) ✅
    INSERT INTO public.shiroi_read_chapters (user_id, username, chapter_id, manga_id, read_at)
    VALUES (p_user_id, p_username, p_chapter_id, p_manga_id, now())
    ON CONFLICT (user_id, chapter_id) DO UPDATE SET read_at = now();

    -- 2. Kiểm tra xem đã nhận thưởng XP cho chương này chưa 🛡️
    SELECT EXISTS (
        SELECT 1 FROM public.shiroi_xp_logs 
        WHERE user_id = p_user_id AND type = 'read' AND reason = p_chapter_id::text
    ) INTO v_already_rewarded;

    -- 3. Cộng XP nếu chưa có và không phải lần tải đầu (Initial Load) 💎
    IF NOT p_is_initial AND NOT v_already_rewarded THEN
        v_xp_gained := 20;
        INSERT INTO public.shiroi_xp_logs (user_id, amount, type, reason)
        VALUES (p_user_id, v_xp_gained, 'read', p_chapter_id::text);
        -- Trigger fn_sync_user_xp_and_monthly tự động cập nhật xp trong shiroi_users
    END IF;

    -- 4. Lấy thông tin User & Đếm số chương đã đọc trong ngày 📈
    SELECT xp, role INTO v_total_xp, v_user_role FROM public.shiroi_users WHERE id = p_user_id;
    
    v_old_level := FLOOR((v_total_xp - v_xp_gained) / 100.0) + 1;
    v_new_level := FLOOR(v_total_xp / 100.0) + 1;

    SELECT COUNT(*) INTO v_daily_read_count 
    FROM public.shiroi_read_chapters 
    WHERE user_id = p_user_id AND read_at >= v_start_of_day;

    -- 5. Kiểm tra Milestone nhiệm vụ (Chỉ báo về key nếu vừa chạm mốc) 🏆
    IF v_daily_read_count = 1 THEN
        v_mission_completed := 'daily_read_1';
    ELSIF v_daily_read_count = 3 THEN
        v_mission_completed := 'daily_read_3';
    END IF;

    -- Nếu đã đạt mốc, kiểm tra xem đã nhận thông báo (claim) chưa để tránh spam
    IF v_mission_completed IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM public.shiroi_notifications 
            WHERE user_id = p_user_id 
              AND type = 'system' 
              AND (data->>'missionKey') = v_mission_completed
              AND created_at >= v_start_of_day
        ) THEN
            v_mission_completed := NULL; -- Đã báo rồi thì thôi
        END IF;
    END IF;

    -- 6. Tự động dọn dẹp thông báo chương mới 🧹
    UPDATE public.shiroi_notifications 
    SET is_read = true 
    WHERE user_id = p_user_id 
      AND type = 'chapter_update' 
      AND is_read = false 
      AND (data->>'mangaId')::uuid = p_manga_id;

    RETURN json_build_object(
        'success', true,
        'xpGained', v_xp_gained,
        'dailyReadCount', v_daily_read_count,
        'missionCompletedKey', v_mission_completed,
        'levelUp', v_new_level > v_old_level,
        'newLevel', v_new_level,
        'totalXp', v_total_xp,
        'role', v_user_role
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.rpc_handle_read_chapter_optimized(UUID, TEXT, UUID, UUID, BOOLEAN) TO authenticated, service_role;
