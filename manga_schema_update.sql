-- 🍀 SHIROI MANGA SCHEMA ENHANCEMENT
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Thêm các cột còn thiếu vào bảng mangas
ALTER TABLE public.mangas 
ADD COLUMN IF NOT EXISTS author TEXT DEFAULT 'Khuyết danh',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ongoing',
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS default_reading_mode TEXT DEFAULT 'scroll';

-- 2. Cập nhật chú thích (Comments)
COMMENT ON COLUMN public.mangas.author IS 'Tên tác giả bộ truyện';
COMMENT ON COLUMN public.mangas.status IS 'Trạng thái: ongoing (đang làm) hoặc completed (hoàn thành)';
COMMENT ON COLUMN public.mangas.is_featured IS 'Ghim truyện lên banner trang chủ';
COMMENT ON COLUMN public.mangas.default_reading_mode IS 'Kiểu đọc mặc định: scroll hoặc page';

-- 3. Thông báo hoàn tất
SELECT 'Database Shiroi Arika đã được nâng cấp thành công! 🚀' as status;
