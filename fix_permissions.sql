-- 🛡️ SHIROI PERMISSION FIX - CHAPTERS & PAGES
-- Run this in your Supabase SQL Editor to fix the missing images issue! 🍀

-- 1. Cho phép mọi người xem danh sách Chương
DROP POLICY IF EXISTS "Cho phép mọi người xem chương" ON public.chapters;
CREATE POLICY "Cho phép mọi người xem chương" ON public.chapters 
FOR SELECT USING (true);

-- 2. Cho phép mọi người xem các Trang truyện (QUAN TRỌNG: Đây là lý do mất ảnh) 🖼️
DROP POLICY IF EXISTS "Cho phép mọi người xem trang truyện" ON public.pages;
CREATE POLICY "Cho phép mọi người xem trang truyện" ON public.pages 
FOR SELECT USING (true);

-- 3. Khóa quyền thay đổi cho người dùng thường (Chỉ dùng Service Role ở Server)
DROP POLICY IF EXISTS "Khóa quyền thay đổi chương" ON public.chapters;
CREATE POLICY "Khóa quyền thay đổi chương" ON public.chapters 
FOR ALL USING (false);

DROP POLICY IF EXISTS "Khóa quyền thay đổi trang" ON public.pages;
CREATE POLICY "Khóa quyền thay đổi trang" ON public.pages 
FOR ALL USING (false);

SELECT 'Quyền truy cập hình ảnh đã được mở cho tất cả mọi người! 🟢' as status;
