-- 🚀 SHIROI ARIKA - OPTIMIZED ACTIONS (SOLUTION B)
-- Mục tiêu: Chuyển các logic nặng sang Database RPC để tối ưu kết nối và đảm bảo tính nguyên tử (Atomic).

-- 1. Hàm Điểm danh hàng ngày (Optimized Check-in)
CREATE OR REPLACE FUNCTION public.rpc_perform_check_in(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_last_check TIMESTAMP WITH TIME ZONE;
    v_streak INTEGER;
    v_start_of_today TIMESTAMP WITH TIME ZONE;
    v_diff_days INTEGER;
    v_base_xp INTEGER := 100;
    v_bonus_xp INTEGER := 0;
    v_total_xp INTEGER;
    v_display_name TEXT;
BEGIN
    -- Mốc 0h sáng giờ VN (GMT+7)
    v_start_of_today := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;

    -- Lấy thông tin user hiện tại
    SELECT last_check_in, check_in_streak, display_name 
    INTO v_last_check, v_streak, v_display_name
    FROM shiroi_users WHERE id = p_user_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Không tìm thấy người dùng!');
    END IF;

    -- Kiểm tra nếu đã điểm danh hôm nay
    IF v_last_check IS NOT NULL AND (v_last_check AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = v_start_of_today::date THEN
        RETURN json_build_object('success', false, 'error', 'Bạn đã điểm danh hôm nay rồi!');
    END IF;

    -- Tính streak
    IF v_last_check IS NOT NULL AND (v_start_of_today::date - (v_last_check AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) = 1 THEN
        v_streak := v_streak + 1;
    ELSE
        v_streak := 1;
    END IF;

    -- Tính Bonus (Logic từ xp.js: 1-6 ngày: +0, 7-13: +50, 14-29: +100, 30+: +200)
    IF v_streak >= 30 THEN v_bonus_xp := 200;
    ELSIF v_streak >= 14 THEN v_bonus_xp := 100;
    ELSIF v_streak >= 7 THEN v_bonus_xp := 50;
    END IF;

    v_total_xp := v_base_xp + v_bonus_xp;

    -- Thực hiện các thay đổi (Atomic)
    INSERT INTO shiroi_xp_logs (user_id, amount, type, reason, created_at)
    VALUES (p_user_id, v_total_xp, 'check_in', 'Điểm danh (Chuỗi ' || v_streak || ' ngày)', CURRENT_TIMESTAMP);

    UPDATE shiroi_users 
    SET last_check_in = CURRENT_TIMESTAMP,
        check_in_streak = v_streak
    WHERE id = p_user_id;

    RETURN json_build_object(
        'success', true, 
        'xpGain', v_total_xp, 
        'streak', v_streak,
        'message', 'Điểm danh thành công! +' || v_total_xp || ' XP'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Hàm Bốc quà may mắn (Optimized Lucky Draw)
CREATE OR REPLACE FUNCTION public.rpc_perform_lucky_draw(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_last_draw TIMESTAMP WITH TIME ZONE;
    v_start_of_today TIMESTAMP WITH TIME ZONE;
    v_rand FLOAT;
    v_xp_gain INTEGER;
BEGIN
    -- Mốc 0h sáng giờ VN
    v_start_of_today := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;

    -- Kiểm tra user
    SELECT last_lucky_draw INTO v_last_draw FROM shiroi_users WHERE id = p_user_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Không tìm thấy người dùng!');
    END IF;

    -- Kiểm tra giới hạn 1 lần/ngày
    IF v_last_draw IS NOT NULL AND (v_last_draw AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = v_start_of_today::date THEN
        RETURN json_build_object('success', false, 'error', 'Hôm nay vận may đã cạn, hãy quay lại vào ngày mai!');
    END IF;

    -- Tính gacha (10:40%, 20:30%, 30:15%, 40:8%, 50:4%, 100:2.5%, 500:0.5%)
    v_rand := random() * 100;
    
    IF v_rand <= 0.5 THEN v_xp_gain := 500;
    ELSIF v_rand <= 3.0 THEN v_xp_gain := 100;
    ELSIF v_rand <= 7.0 THEN v_xp_gain := 50;
    ELSIF v_rand <= 15.0 THEN v_xp_gain := 40;
    ELSIF v_rand <= 30.0 THEN v_xp_gain := 30;
    ELSIF v_rand <= 60.0 THEN v_xp_gain := 20;
    ELSE v_xp_gain := 10;
    END IF;

    -- Ghi log (Atomic)
    INSERT INTO shiroi_xp_logs (user_id, amount, type, reason, created_at)
    VALUES (p_user_id, v_xp_gain, 'lucky_draw', 'May mắn hàng ngày: +' || v_xp_gain || ' XP', CURRENT_TIMESTAMP);

    UPDATE shiroi_users SET last_lucky_draw = CURRENT_TIMESTAMP WHERE id = p_user_id;

    RETURN json_build_object(
        'success', true, 
        'xpGain', v_xp_gain,
        'message', 'Bốc quà thành công! +' || v_xp_gain || ' XP'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Solution B: RPC Functions for Check-in and Lucky Draw ready! 🚀' as status;