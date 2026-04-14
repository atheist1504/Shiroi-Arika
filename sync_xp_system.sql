-- 🏆 HỆ THỐNG ĐỒNG BỘ & BẢO MẬT XP SHIROI (BẢN CAO CẤP) 🍀
-- Chạy script này để sửa lỗi và kích hoạt chống hack tuyệt đối.

-- 1. ĐỒNG BỘ LẠI ĐIỂM (REPAIR)
UPDATE shiroi_users u
SET xp = COALESCE((
    SELECT SUM(amount) 
    FROM shiroi_xp_logs 
    WHERE user_id = u.id
), 0);

-- 2. TẠO CHỈ MỤC CHỐNG HACK (UNIQUE INDEX)
-- Chỉ cho phép mỗi User có đúng 1 dòng log 'check_in' và 'lucky_draw' mỗi ngày (theo trình tự VN).
-- Ngăn chặn tuyệt đối việc nhấn nhanh hoặc dùng Tool để cày điểm.
DROP INDEX IF EXISTS idx_unique_check_in_per_day;
CREATE UNIQUE INDEX idx_unique_check_in_per_day 
ON shiroi_xp_logs (user_id, ((created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date))
WHERE type = 'check_in';

DROP INDEX IF EXISTS idx_unique_lucky_draw_per_day;
CREATE UNIQUE INDEX idx_unique_lucky_draw_per_day 
ON shiroi_xp_logs (user_id, ((created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date))
WHERE type = 'lucky_draw';

-- 3. HÀM TRIGGER TỰ ĐỘNG ĐỒNG BỘ TỔNG ĐIỂM
CREATE OR REPLACE FUNCTION fn_sync_user_xp_on_log()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE shiroi_users SET xp = xp + NEW.amount WHERE id = NEW.user_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE shiroi_users SET xp = xp - OLD.amount WHERE id = OLD.user_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE shiroi_users SET xp = xp - OLD.amount + NEW.amount WHERE id = NEW.user_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. KÍCH HOẠT TRIGGER
DROP TRIGGER IF EXISTS trg_sync_user_xp ON shiroi_xp_logs;
CREATE TRIGGER trg_sync_user_xp
AFTER INSERT OR UPDATE OR DELETE ON shiroi_xp_logs
FOR EACH ROW
EXECUTE FUNCTION fn_sync_user_xp_on_log();

-- 5. THÔNG BÁO THÀNH CÔNG 🚀
-- Hệ thống giờ đây đã được bảo vệ ở cấp độ Database.
