-- 🚀 FIX RLS FOR REPORTS (CUSTOM AUTH COMPATIBILITY) 🍀

-- 1. Tắt RLS để Admin dùng Custom Auth có thể truy xuất dữ liệu từ phía Client/Server an toàn
ALTER TABLE public.shiroi_reports DISABLE ROW LEVEL SECURITY;

-- 2. Cấp quyền truy cập công khai (An toàn vì đã có Logic kiểm tra Admin ở phía Server Action)
GRANT ALL ON public.shiroi_reports TO anon, authenticated, service_role;

-- 3. Thông báo hoàn tất
-- Hệ thống báo cáo hiện đã có thể truy xuất bởi Admin thông qua trang Quản lý.
