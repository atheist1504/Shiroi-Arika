-- 🛠️ FIX STORAGE STATS COLUMNS
-- Chạy lệnh này trong Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- 1. Thêm cột size_kb vào bảng pages (mặc định 150KB cho các trang cũ)
ALTER TABLE public.pages 
ADD COLUMN IF NOT EXISTS size_kb FLOAT DEFAULT 150;

-- 2. Thêm cột size_kb vào bảng mangas (mặc định 300KB cho ảnh bìa cũ)
ALTER TABLE public.mangas 
ADD COLUMN IF NOT EXISTS size_kb FLOAT DEFAULT 300;

-- 3. Thông báo
SELECT 'Hệ thống tính toán dung lượng đã sẵn sàng! 🚀' as status;
