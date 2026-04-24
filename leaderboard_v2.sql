-- 🏆 HỆ THỐNG NHẬT KÝ XP VÀ BXH PHÂN CẤP (V3 - CACHE OPTIMIZED) 🍀
-- Chạy lệnh này trong Supabase SQL Editor để kích hoạt tính năng BXH theo tháng siêu tốc.

-- 1. Tạo bảng ghi nhật ký XP (Nếu chưa có)
CREATE TABLE IF NOT EXISTS shiroi_xp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES shiroi_users(id) ON DELETE CASCADE,
    amount INT NOT NULL,
    type TEXT NOT NULL, -- 'read', 'checkin', 'lucky_draw', 'comment'
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TẠO BẢNG CACHE THEO THÁNG (GỠ BOM HIỆU NĂNG) 💣🛡️
CREATE TABLE IF NOT EXISTS shiroi_monthly_stats (
    user_id UUID REFERENCES shiroi_users(id) ON DELETE CASCADE,
    month_year DATE, -- Lưu ngày đầu tiên của tháng (VD: 2024-04-01)
    amount BIGINT DEFAULT 0,
    PRIMARY KEY (user_id, month_year)
);

-- 3. TRIGGER TỰ ĐỘNG CẬP NHẬT CACHE (INSERT & DELETE) ⚙️
CREATE OR REPLACE FUNCTION fn_update_monthly_stats()
RETURNS TRIGGER AS $$
DECLARE
    v_month_year DATE;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        v_month_year := date_trunc('month', NEW.created_at)::date;
        INSERT INTO shiroi_monthly_stats (user_id, month_year, amount)
        VALUES (NEW.user_id, v_month_year, NEW.amount)
        ON CONFLICT (user_id, month_year) 
        DO UPDATE SET amount = shiroi_monthly_stats.amount + EXCLUDED.amount;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        v_month_year := date_trunc('month', OLD.created_at)::date;
        UPDATE shiroi_monthly_stats 
        SET amount = GREATEST(0, amount - OLD.amount)
        WHERE user_id = OLD.user_id AND month_year = v_month_year;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_monthly_stats ON shiroi_xp_logs;
CREATE TRIGGER trg_update_monthly_stats
AFTER INSERT OR DELETE ON shiroi_xp_logs
FOR EACH ROW EXECUTE FUNCTION fn_update_monthly_stats();

-- 4. ĐỔ DỮ LIỆU CŨ VÀO CACHE (CHỈ CHẠY 1 LẦN NẾU CẦN)
INSERT INTO shiroi_monthly_stats (user_id, month_year, amount)
SELECT user_id, date_trunc('month', created_at)::date, SUM(amount)
FROM shiroi_xp_logs
GROUP BY 1, 2
ON CONFLICT (user_id, month_year) DO NOTHING;

-- 5. FUNCTION RPC LẤY BXH THÁNG (SIÊU TỐC ĐỘ < 10ms) 🚀
DROP FUNCTION IF EXISTS get_monthly_leaderboard(int);
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
DECLARE
    target_month DATE;
BEGIN
    target_month := date_trunc('month', now() - (month_offset * interval '1 month'))::date;

    RETURN QUERY
    SELECT 
        u.id::UUID, 
        u.username::TEXT, 
        u.display_name::TEXT, 
        u.avatar_url::TEXT, 
        u.selected_badge::TEXT,
        u.xp::BIGINT as total_xp,
        COALESCE(ms.amount, 0)::BIGINT as monthly_xp
    FROM shiroi_users u
    LEFT JOIN shiroi_monthly_stats ms ON u.id = ms.user_id AND ms.month_year = target_month
    ORDER BY monthly_xp DESC, total_xp DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql;

SELECT 'Shiroi Leaderboard v3 (Cache Optimized) đã được thiết lập thành công! 🚀🏆' as status;

