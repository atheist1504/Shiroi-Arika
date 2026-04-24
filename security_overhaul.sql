-- 🛡️ SHIROI SECURITY OVERHAUL - MASTER SQL
-- Chạy script này trong Supabase SQL Editor để siết chặt bảo mật toàn diện! 🍀

-- 1. KÍCH HOẠT LẠI RLS CHO TẤT CẢ CÁC BẢNG (Vô cùng quan trọng!) 🏗️
ALTER TABLE public.mangas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shiroi_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shiroi_xp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shiroi_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shiroi_read_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shiroi_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shiroi_follows ENABLE ROW LEVEL SECURITY;

-- 2. CHÍNH SÁCH TRUY CẬP CÔNG KHAI (SELECT ONLY) 🔓
-- Chỉ cho phép XEM, không cho phép sửa đổi trực tiếp từ Anon Key

-- Manga & Chapters & Pages
DROP POLICY IF EXISTS "Public SELECT mangas" ON public.mangas;
CREATE POLICY "Public SELECT mangas" ON public.mangas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public SELECT chapters" ON public.chapters;
CREATE POLICY "Public SELECT chapters" ON public.chapters FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public SELECT pages" ON public.pages;
CREATE POLICY "Public SELECT pages" ON public.pages FOR SELECT USING (true);

-- Comments (Công khai xem)
DROP POLICY IF EXISTS "Public SELECT comments" ON public.comments;
CREATE POLICY "Public SELECT comments" ON public.comments FOR SELECT USING (true);

-- Users (Công khai xem hồ sơ)
DROP POLICY IF EXISTS "Public SELECT users" ON public.shiroi_users;
CREATE POLICY "Public SELECT users" ON public.shiroi_users FOR SELECT USING (true);

-- Stats & History (Công khai xem số liệu)
DROP POLICY IF EXISTS "Public SELECT history" ON public.shiroi_history;
CREATE POLICY "Public SELECT history" ON public.shiroi_history FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public SELECT read_chapters" ON public.shiroi_read_chapters;
CREATE POLICY "Public SELECT read_chapters" ON public.shiroi_read_chapters FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public SELECT follows" ON public.shiroi_follows;
CREATE POLICY "Public SELECT follows" ON public.shiroi_follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public SELECT xp_logs" ON public.shiroi_xp_logs;
CREATE POLICY "Public SELECT xp_logs" ON public.shiroi_xp_logs FOR SELECT USING (true);

-- 3. KHÓA CHẶT MỌI QUYỀN THAY ĐỔI DỮ LIỆU TỪ CLIENT (ANON/AUTH) 🔐
-- Mọi thay đổi PHẢI đi qua Server Action (Service Role)
DROP POLICY IF EXISTS "Lock INSERT/UPDATE/DELETE mangas" ON public.mangas;
CREATE POLICY "Lock INSERT/UPDATE/DELETE mangas" ON public.mangas FOR ALL USING (false);

DROP POLICY IF EXISTS "Lock INSERT/UPDATE/DELETE chapters" ON public.chapters;
CREATE POLICY "Lock INSERT/UPDATE/DELETE chapters" ON public.chapters FOR ALL USING (false);

DROP POLICY IF EXISTS "Lock INSERT/UPDATE/DELETE pages" ON public.pages;
CREATE POLICY "Lock INSERT/UPDATE/DELETE pages" ON public.pages FOR ALL USING (false);

DROP POLICY IF EXISTS "Lock INSERT/UPDATE/DELETE comments" ON public.comments;
CREATE POLICY "Lock INSERT/UPDATE/DELETE comments" ON public.comments FOR ALL USING (false);

DROP POLICY IF EXISTS "Lock INSERT/UPDATE/DELETE users" ON public.shiroi_users;
CREATE POLICY "Lock INSERT/UPDATE/DELETE users" ON public.shiroi_users FOR ALL USING (false);

-- 4. BẢO VỆ CỘT MẬT KHẨU (PASSWORD) KHỎI ANON KEY 🕵️‍♂️
-- Ngăn chặn kẻ xấu dùng API public để lấy hash mật khẩu
REVOKE SELECT ON public.shiroi_users FROM anon;
GRANT SELECT (id, username, display_name, avatar_url, bio, role, xp, level, last_check_in, check_in_streak, selected_badge, created_at) ON public.shiroi_users TO anon;
GRANT SELECT (id, username, display_name, avatar_url, bio, role, xp, level, last_check_in, check_in_streak, selected_badge, created_at) ON public.shiroi_users TO authenticated;

-- 5. BẢO VỆ NHẬT KÝ VÀ THÔNG BÁO (CHỈ ADMIN HOẶC QUA SERVER) 🕰️
DROP POLICY IF EXISTS "Restrict XP logs" ON public.shiroi_xp_logs;
CREATE POLICY "Restrict XP logs" ON public.shiroi_xp_logs FOR ALL USING (false);

DROP POLICY IF EXISTS "Restrict Notifications" ON public.shiroi_notifications;
CREATE POLICY "Restrict Notifications" ON public.shiroi_notifications FOR ALL USING (false);

-- 6. TỰ ĐỘNG CẬP NHẬT UPDATED_AT (NẾU CHƯA CÓ)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_mangas_updated_at ON public.mangas;
CREATE TRIGGER update_mangas_updated_at BEFORE UPDATE ON public.mangas FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

SELECT 'Hệ thống bảo mật Shiroi đã được siết chặt! 🛡️🍀' as status;
