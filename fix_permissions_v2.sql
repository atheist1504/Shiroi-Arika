-- 🛡️ SHIROI PERMISSION FIX V2 - DISABLE RLS 🍀
-- Chạy script này trong SQL Editor của Supabase để tắt hoàn toàn RLS cho các bảng công khai.
-- Việc này giúp đảm bảo 100% độc giả có thể xem ảnh mà không bị hệ thống bảo mật chặn lại.

-- 1. Tắt RLS cho bảng Mangas
ALTER TABLE public.mangas DISABLE ROW LEVEL SECURITY;

-- 2. Tắt RLS cho bảng Chapters
ALTER TABLE public.chapters DISABLE ROW LEVEL SECURITY;

-- 3. Tắt RLS cho bảng Pages (Quan trọng nhất để hiện ảnh) 🖼️
ALTER TABLE public.pages DISABLE ROW LEVEL SECURITY;

-- 4. Xóa các Policy cũ để dọn dẹp (Không còn cần thiết khi đã tắt RLS)
DROP POLICY IF EXISTS "Cho phép mọi người xem chương" ON public.chapters;
DROP POLICY IF EXISTS "Cho phép mọi người xem trang truyện" ON public.pages;
DROP POLICY IF EXISTS "Khóa quyền thay đổi chương" ON public.chapters;
DROP POLICY IF EXISTS "Khóa quyền thay đổi trang" ON public.pages;

SELECT 'Hệ thống đã được mở khóa hoàn toàn! Độc giả giờ đây có thể truy cập mượt mà. 🔓🟢' as status;
