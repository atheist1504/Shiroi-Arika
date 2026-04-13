-- 🏆 HỆ THỐNG NHẬT KÝ XP VÀ BXH PHÂN CẤP 🍀
-- Chạy lệnh này trong Supabase SQL Editor để kích hoạt tính năng BXH theo tháng.

-- 1. Tạo bảng ghi nhật ký XP
CREATE TABLE IF NOT EXISTS shiroi_xp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES shiroi_users(id) ON DELETE CASCADE,
    amount INT NOT NULL,
    type TEXT NOT NULL, -- 'read', 'checkin', 'comment'
    reason TEXT, -- Thông tin thêm (ví dụ: chapter_id hoặc "Streak bonus")
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tạo Index để tăng tốc độ tính toán BXH theo thời gian
CREATE INDEX IF NOT EXISTS idx_xp_logs_user_date ON shiroi_xp_logs(user_id, created_at);

-- 3. [TÙY CHỌN] Lệnh dọn dẹp nhật ký cũ hơn 2 tháng
-- Bạn có thể chạy lệnh này định kỳ để giữ Database nhẹ.
-- DELETE FROM shiroi_xp_logs WHERE created_at < now() - interval '2 months';

-- HƯỚNG DẪN:
-- BXH Tổng: Dùng cột 'xp' trong bảng 'shiroi_users' (như hiện tại).
-- BXH Tháng: Dùng Function RPC bên dưới để tính toán chính xác.

-- 4. Function RPC để lấy BXH theo tháng (Cực nhanh & chính xác)
-- Lưu ý: Phải xóa hàm cũ trước khi tạo mới để tránh xung đột tham số (Lỗi 400) 🛡️
DROP FUNCTION IF EXISTS get_monthly_leaderboard(int);
DROP FUNCTION IF EXISTS get_monthly_leaderboard();

CREATE OR REPLACE FUNCTION get_monthly_leaderboard(month_offset INT DEFAULT 0)
RETURNS TABLE (
    id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    selected_badge TEXT,
    total_xp BIGINT,
    monthly_xp BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH monthly_stats AS (
        SELECT 
            user_id, 
            SUM(amount) as m_xp
        FROM shiroi_xp_logs
        WHERE 
            created_at >= date_trunc('month', now() - (month_offset * interval '1 month'))
            AND created_at < date_trunc('month', now() - (month_offset * interval '1 month')) + interval '1 month'
        GROUP BY user_id
    )
    SELECT 
        u.id::UUID, 
        u.username::TEXT, 
        u.display_name::TEXT, 
        u.avatar_url::TEXT, 
        u.selected_badge::TEXT,
        u.xp::BIGINT as total_xp,
        COALESCE(ms.m_xp, 0)::BIGINT as monthly_xp
    FROM shiroi_users u
    LEFT JOIN monthly_stats ms ON u.id = ms.user_id
    -- 🛑 ĐÃ GỠ BỘ LỌC ADMIN ĐỂ KIỂM TRA DỮ LIỆU CHÍNH XÁC 🍀
    ORDER BY monthly_xp DESC, total_xp DESC;
END;
$$ LANGUAGE plpgsql;
