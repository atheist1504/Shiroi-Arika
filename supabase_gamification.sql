-- 1. Thêm các cột Gamification vào bảng shiroi_users
ALTER TABLE public.shiroi_users 
ADD COLUMN IF NOT EXISTS xp BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_check_in TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS check_in_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS badges TEXT[] DEFAULT '{}';

-- 2. Tạo hàm để tự động tính toán level dựa trên XP (Logic: Lvl = sqrt(XP/100) + 1)
-- Bạn có thể cập nhật logic này tùy ý
CREATE OR REPLACE FUNCTION public.calculate_level(xp_val BIGINT) 
RETURNS INTEGER AS $$
BEGIN
    RETURN floor(sqrt(xp_val / 100)) + 1;
END;
$$ LANGUAGE plpgsql;

-- 3. Tạo Trigger để tự động cập nhật Level khi XP thay đổi
CREATE OR REPLACE FUNCTION public.trigger_update_level() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.level := public.calculate_level(NEW.xp);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_level ON public.shiroi_users;
CREATE TRIGGER tr_update_level
BEFORE UPDATE OF xp ON public.shiroi_users
FOR EACH ROW
EXECUTE FUNCTION public.trigger_update_level();

-- 4. Thông báo hoàn tất
SELECT 'Hệ thống Gamification Shiroi Arika đã được kích hoạt! 🍀' as status;
