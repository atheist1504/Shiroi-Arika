-- 1. CẬP NHẬT BẢNG MANGAS
ALTER TABLE public.mangas ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ONGOING' CHECK (status IN ('ONGOING', 'COMPLETED'));

-- 2. TẠO BẢNG LƯU LỊCH SỬ ĐỌC CHI TIẾT (UNIQUE PER CHAPTER)
CREATE TABLE IF NOT EXISTS public.shiroi_read_chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.shiroi_users(id) ON DELETE CASCADE,
    chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
    manga_id UUID NOT NULL REFERENCES public.mangas(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, chapter_id)
);

-- 3. TẠO BẢNG LƯU LỊCH SỬ NHẬN THƯỞNG NHIỆM VỤ
CREATE TABLE IF NOT EXISTS public.shiroi_mission_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.shiroi_users(id) ON DELETE CASCADE,
    mission_key TEXT NOT NULL, -- Ví dụ: 'daily_read_3', 'total_chapters_100', 'conqueror_manga-uuid'
    manga_id UUID REFERENCES public.mangas(id) ON DELETE CASCADE, -- Null cho nhiệm vụ chung
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    reward_xp INTEGER NOT NULL,
    UNIQUE(user_id, mission_key)
);

-- 4. PHÂN QUYỀN RLS
ALTER TABLE public.shiroi_read_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shiroi_mission_claims ENABLE ROW LEVEL SECURITY;

-- Policy cho shiroi_read_chapters
CREATE POLICY "Cho phép người dùng quản lý lịch sử đọc của mình" 
ON public.shiroi_read_chapters 
FOR ALL 
USING (auth.uid() = user_id);

-- Policy cho shiroi_mission_claims
CREATE POLICY "Cho phép người dùng quản lý lượt nhận thưởng của mình" 
ON public.shiroi_mission_claims 
FOR ALL 
USING (auth.uid() = user_id);

-- Chỉ mục để tăng tốc truy vấn
CREATE INDEX IF NOT EXISTS idx_read_chapters_user_id ON public.shiroi_read_chapters(user_id);
CREATE INDEX IF NOT EXISTS idx_read_chapters_manga_id ON public.shiroi_read_chapters(manga_id);
CREATE INDEX IF NOT EXISTS idx_mission_claims_user_id ON public.shiroi_mission_claims(user_id);

-- 5. THÔNG BÁO THÀNH CÔNG 🚀
SELECT 'Hệ thống Lưu trữ Nhiệm vụ đã sẵn sàng! 💎' as status;
