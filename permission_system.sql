-- 🛡️ SHIROI PERMISSION & ROLE SYSTEM
-- Run this in your Supabase SQL Editor

-- 1. Thêm cột role vào bảng shiroi_users
ALTER TABLE public.shiroi_users 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- 2. Thiết lập quyền Admin cho tài khoản quản trị
-- Thay 'admin' bằng username thực tế của bạn nếu khác
UPDATE public.shiroi_users 
SET role = 'admin' 
WHERE username ILIKE 'admin' OR username ILIKE '%quản trị%';

-- 3. Kích hoạt RLS cho các bảng quan trọng
ALTER TABLE public.mangas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shiroi_xp_logs ENABLE ROW LEVEL SECURITY;

-- 4. Chính sách (Policies) cho bảng mangas
-- Mọi người đều có quyền xem
DROP POLICY IF EXISTS "Cho phép mọi người xem truyện" ON public.mangas;
CREATE POLICY "Cho phép mọi người xem truyện" ON public.mangas 
FOR SELECT USING (true);

-- Chỉ Admin mới có quyền thêm/sửa/xóa
-- Lưu ý: Chính sách này dựa trên giả định chúng ta sẽ sớm chuyển sang dùng Supabase Auth 
-- Hoặc sử dụng Service Role Key cho các tác vụ Admin.
-- Đối với hiện tại, chúng ta sẽ khóa chặt và yêu cầu dùng API Server (Service Role).

DROP POLICY IF EXISTS "Chỉ Admin mới có quyền thay đổi truyện" ON public.mangas;
CREATE POLICY "Chỉ Admin mới có quyền thay đổi truyện" ON public.mangas 
FOR ALL USING (false); -- Mặc định khóa chặt, sẽ dùng Service Role ở Server

-- 5. Chính sách cho bảng XP Logs
DROP POLICY IF EXISTS "Cho phép xem log XP cá nhân" ON public.shiroi_xp_logs;
CREATE POLICY "Cho phép xem log XP cá nhân" ON public.shiroi_xp_logs 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Khóa quyền tự thêm Log XP" ON public.shiroi_xp_logs;
CREATE POLICY "Khóa quyền tự thêm Log XP" ON public.shiroi_xp_logs 
FOR INSERT WITH CHECK (false); -- Phải quay về Server Action để xử lý

-- Thông báo
SELECT 'Hệ thống phân quyền Shiroi đã được thiết lập! 🛡️' as status;
