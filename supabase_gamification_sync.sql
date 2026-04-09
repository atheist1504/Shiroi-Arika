-- 🍀 AUTO-CALCULATE LEVEL TRIGGER 🏗️
-- Đảm bảo cột Level trong Database luôn khớp với XP theo công thức chuẩn: Level = floor(XP / 100) + 1

CREATE OR REPLACE FUNCTION public.calculate_level_trigger()
RETURNS TRIGGER AS $$
BEGIN
    NEW.level := floor(COALESCE(NEW.xp, 0) / 100) + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Gắn Trigger vào bảng shiroi_users
DROP TRIGGER IF EXISTS tr_update_level ON shiroi_users;
CREATE TRIGGER tr_update_level
BEFORE INSERT OR UPDATE OF xp ON shiroi_users
FOR EACH ROW
EXECUTE FUNCTION public.calculate_level_trigger();

-- Bổ sung cột badges nếu chưa có để lưu danh sách huy hiệu đặc biệt (JSONB cho linh hoạt)
ALTER TABLE shiroi_users ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]';

-- Phân quyền cho bảng lịch sử để có thể thực hiện UPSERT (Update or Insert)
-- Lưu ý: Đảm bảo bảng shiroi_history đã có ràng buộc UNIQUE(user_id, manga_id) hoặc UNIQUE(username, manga_id)
ALTER TABLE shiroi_history DROP CONSTRAINT IF EXISTS shiroi_history_username_manga_id_key;
ALTER TABLE shiroi_history ADD CONSTRAINT shiroi_history_username_manga_id_key UNIQUE (username, manga_id);

-- Cho phép UPSERT lịch sử
CREATE POLICY "Cho phép lưu lịch sử" ON shiroi_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Cho phép cập nhật lịch sử" ON shiroi_history FOR UPDATE USING (true);
