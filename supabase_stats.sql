-- 🍀 SHIROI STATS & HISTORY ENHANCEMENT 📊

-- 1. Bảng lưu chi tiết từng chương đã đọc (Để thống kê chính xác)
CREATE TABLE IF NOT EXISTS public.shiroi_read_chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id), -- Option nếu dùng Auth của Supabase
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    manga_id UUID NOT NULL REFERENCES public.mangas(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(username, chapter_id)
);

-- Index để truy vấn nhanh cho profile
CREATE INDEX IF NOT EXISTS idx_read_chapters_username ON public.shiroi_read_chapters(username);

-- 2. Đảm bảo bảng shiroi_users có đủ các cột cần thiết cho Gamification
ALTER TABLE public.shiroi_users 
ADD COLUMN IF NOT EXISTS check_in_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_check_in TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS total_read_chapters INTEGER DEFAULT 0;

-- 3. Phân quyền (RLS) cho bảng mới
ALTER TABLE public.shiroi_read_chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cho phép đọc lịch sử" ON public.shiroi_read_chapters;
CREATE POLICY "Cho phép đọc lịch sử" ON public.shiroi_read_chapters 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Cho phép thêm lịch sử" ON public.shiroi_read_chapters;
CREATE POLICY "Cho phép thêm lịch sử" ON public.shiroi_read_chapters 
FOR INSERT WITH CHECK (true);

-- Thông báo
SELECT 'Hệ thống Thống kê Shiroi đã sẵn rành! 🚀' as status;
