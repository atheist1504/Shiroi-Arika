-- 🍀 SHIROI ARIKA - MIGRATION: USER_ID SYNCHRONIZATION (REVISED) 🛡️
-- Mục tiêu: Chuyển đổi hệ thống định danh sang User ID (UUID) một cách an toàn.

-- 1. Cập nhật bảng comments (Bình luận)
ALTER TABLE public.comments 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.shiroi_users(id),
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- 2. Cập nhật bảng shiroi_history (Lịch sử đọc bộ truyện)
DO $$ 
BEGIN 
    -- Xóa ràng buộc cũ dựa trên username nếu tồn tại
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'shiroi_history_username_manga_id_key') THEN
        ALTER TABLE public.shiroi_history DROP CONSTRAINT shiroi_history_username_manga_id_key;
    END IF;

    -- Thêm ràng buộc mới dựa trên user_id nếu chưa có
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'shiroi_history_user_id_manga_id_key') THEN
        ALTER TABLE public.shiroi_history ADD CONSTRAINT shiroi_history_user_id_manga_id_key UNIQUE (user_id, manga_id);
    END IF;
END $$;

-- 3. Cập nhật bảng shiroi_read_chapters (Chi tiết chương đã đọc)
DO $$ 
BEGIN 
    -- Xóa ràng buộc cũ dựa trên username nếu tồn tại
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'shiroi_read_chapters_username_chapter_id_key') THEN
        ALTER TABLE public.shiroi_read_chapters DROP CONSTRAINT shiroi_read_chapters_username_chapter_id_key;
    END IF;

    -- Thêm ràng buộc mới dựa trên user_id nếu chưa có
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'shiroi_read_chapters_user_id_chapter_id_key') THEN
        ALTER TABLE public.shiroi_read_chapters ADD CONSTRAINT shiroi_read_chapters_user_id_chapter_id_key UNIQUE (user_id, chapter_id);
    END IF;
END $$;

-- 4. Bổ sung RLS (Row Level Security) cho Comments
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cho phép mọi người xem bình luận" ON public.comments;
CREATE POLICY "Cho phép mọi người xem bình luận" ON public.comments 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Cho phép thành viên gửi bình luận" ON public.comments;
CREATE POLICY "Cho phép thành viên gửi bình luận" ON public.comments 
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Cho phép chủ nhân hoặc Admin xóa bình luận" ON public.comments;
CREATE POLICY "Cho phép chủ nhân hoặc Admin xóa bình luận" ON public.comments 
FOR DELETE USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM shiroi_users 
        WHERE id = auth.uid() AND (username ILIKE '%admin%' OR display_name ILIKE '%quản trị%')
    )
);

-- 5. Thông báo hoàn tất
SELECT 'Hệ thống định danh đã được cập nhật an toàn! 🍀' as status;
