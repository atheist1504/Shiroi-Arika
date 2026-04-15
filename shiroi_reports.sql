-- 🚀 BẢNG BÁO LỖI CHƯƠNG (REPORTS SYSTEM) 🍀

CREATE TABLE IF NOT EXISTS public.shiroi_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manga_id UUID REFERENCES public.mangas(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.shiroi_users(id) ON DELETE SET NULL,
    type TEXT NOT NULL, -- 'image_broken', 'wrong_translation', 'wrong_order', 'other'
    description TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'fixed', 'ignored'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Bật RLS (Mặc dù dự án đang tắt RLS cho manga, nhưng bảng này nên có để bảo mật tương lai)
ALTER TABLE public.shiroi_reports ENABLE ROW LEVEL SECURITY;

-- Quyền lợi:
-- 1. Mọi người đều có thể gửi báo cáo (Insert)
CREATE POLICY "Cho phép mọi người gửi báo cáo" ON public.shiroi_reports
    FOR INSERT WITH CHECK (true);

-- 2. Chỉ Admin mới có thể xem (Select) và sửa (Update/Delete)
CREATE POLICY "Chỉ Admin mới có thể xem báo cáo" ON public.shiroi_reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM shiroi_users 
            WHERE id = auth.uid() AND (role = 'admin' OR username = 'atheist1504')
        )
    );

CREATE POLICY "Chỉ Admin mới có thể sửa báo cáo" ON public.shiroi_reports
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM shiroi_users 
            WHERE id = auth.uid() AND (role = 'admin' OR username = 'atheist1504')
        )
    );
