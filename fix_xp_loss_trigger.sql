-- 🛠️ SỬA LỖI MẤT XP KHI DỌN DẸP NHẬT KÝ 🛡️
-- Nhật ký (Logs) chỉ là lịch sử, việc xóa nhật ký cũ không nên làm giảm điểm (XP) của người dùng.

-- 1. CẬP NHẬT LẠI HÀM TRIGGER: Loại bỏ việc trừ XP khi xóa Log
CREATE OR REPLACE FUNCTION fn_sync_user_xp_on_log()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE shiroi_users SET xp = xp + NEW.amount WHERE id = NEW.user_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE shiroi_users SET xp = xp - OLD.amount + NEW.amount WHERE id = NEW.user_id;
    -- ELSIF (TG_OP = 'DELETE') THEN -- ❌ ĐÃ LOẠI BỎ: Không trừ XP khi xóa log cũ
    --    UPDATE shiroi_users SET xp = xp - OLD.amount WHERE id = OLD.user_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. ĐẢM BẢO TRIGGER VẪN HOẠT ĐỘNG
DROP TRIGGER IF EXISTS trg_sync_user_xp ON shiroi_xp_logs;
CREATE TRIGGER trg_sync_user_xp
AFTER INSERT OR UPDATE OR DELETE ON shiroi_xp_logs
FOR EACH ROW
EXECUTE FUNCTION fn_sync_user_xp_on_log();

-- 3. (GỢI Ý) PHỤC HỒI XP TẠM THỜI (TÙY CHỌN)
-- Nếu bạn biết lượng XP trung bình bị mất, có thể chạy lệnh cộng lại cho toàn bộ người dùng.
-- Ví dụ: Tặng mỗi người 5000 XP bù đắp lỗi hệ thống.
-- UPDATE shiroi_users SET xp = xp + 5000;
