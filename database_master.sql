-- ==========================================================
-- 🍀 SHIROI ARIKA - MASTER DATABASE SCHEMA (CLEAN CONSOLIDATED)
-- Phiên bản: v36 - Performance & UI Overhaul Optimized
-- ==========================================================

-- 1. CẤU TRÚC BẢNG CỐT LÕI 🏗️
CREATE TABLE IF NOT EXISTS public.mangas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    author TEXT DEFAULT 'Khuyết danh',
    cover_image TEXT,
    genres TEXT[], -- Mảng các thể loại như ['Action', 'Romance', ...]
    status TEXT DEFAULT 'ONGOING' CHECK (status IN ('ONGOING', 'COMPLETED')),
    is_featured BOOLEAN DEFAULT false,
    default_reading_mode TEXT DEFAULT 'scroll',
    size_kb FLOAT DEFAULT 300,
    -- Counter Cache Columns ⚡
    total_chapters INTEGER DEFAULT 0,
    latest_chapter_number NUMERIC,
    latest_chapter_id UUID,
    uploader_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manga_id UUID REFERENCES public.mangas(id) ON DELETE CASCADE,
    chapter_number NUMERIC NOT NULL,
    title TEXT,
    uploader_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(manga_id, chapter_number)
);

CREATE TABLE IF NOT EXISTS public.pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    size_kb FLOAT DEFAULT 150,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(chapter_id, page_number)
);

CREATE TABLE IF NOT EXISTS public.shiroi_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    role TEXT DEFAULT 'user',
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    last_check_in TIMESTAMPTZ,
    last_lucky_draw TIMESTAMPTZ,
    check_in_streak INTEGER DEFAULT 0,
    selected_badge TEXT DEFAULT 'Lữ Khách',
    fcm_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. HỆ THỐNG TƯƠNG TÁC & NHẬT KÝ 💬💎
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manga_id UUID REFERENCES mangas(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
    user_id UUID REFERENCES shiroi_users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shiroi_xp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES shiroi_users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL, -- read / checkin / lucky_draw / comment
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shiroi_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES shiroi_users(id) ON DELETE CASCADE,
    manga_id UUID REFERENCES mangas(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, manga_id)
);

CREATE TABLE IF NOT EXISTS public.shiroi_read_chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.shiroi_users(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
    manga_id UUID REFERENCES public.mangas(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, chapter_id)
);

CREATE TABLE IF NOT EXISTS public.shiroi_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.shiroi_users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT DEFAULT 'chapter_update',
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. CHỨC NĂNG HỆ THỐNG (FUNCTIONS & TRIGGERS) ⚙️
-- [Performance] Tự động cập nhật Stats và Timestamp cho Manga
CREATE OR REPLACE FUNCTION public.update_manga_stats_and_time()
RETURNS TRIGGER AS $$
DECLARE
    latest_chap RECORD;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        SELECT id, chapter_number INTO latest_chap FROM public.chapters 
        WHERE manga_id = NEW.manga_id ORDER BY chapter_number DESC LIMIT 1;

        UPDATE public.mangas SET 
            total_chapters = (SELECT COUNT(*) FROM public.chapters WHERE manga_id = NEW.manga_id),
            latest_chapter_number = latest_chap.chapter_number,
            latest_chapter_id = latest_chap.id,
            updated_at = now()
        WHERE id = NEW.manga_id;
    ELSIF (TG_OP = 'DELETE') THEN
        SELECT id, chapter_number INTO latest_chap FROM public.chapters 
        WHERE manga_id = OLD.manga_id ORDER BY chapter_number DESC LIMIT 1;

        UPDATE public.mangas SET 
            total_chapters = (SELECT COUNT(*) FROM public.chapters WHERE manga_id = OLD.manga_id),
            latest_chapter_number = latest_chap.chapter_number,
            latest_chapter_id = latest_chap.id,
            updated_at = now()
        WHERE id = OLD.manga_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_manga_all IN public.chapters;
CREATE TRIGGER trg_update_manga_all AFTER INSERT OR DELETE ON public.chapters
FOR EACH ROW EXECUTE FUNCTION public.update_manga_stats_and_time();

-- [XP] Đồng bộ XP từ Log vào Profile ngay lập tức
CREATE OR REPLACE FUNCTION fn_sync_user_xp_on_log()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE shiroi_users SET xp = xp + NEW.amount WHERE id = NEW.user_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE shiroi_users SET xp = xp - OLD.amount WHERE id = OLD.user_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_user_xp ON shiroi_xp_logs;
CREATE TRIGGER trg_sync_user_xp AFTER INSERT OR DELETE ON public.shiroi_xp_logs
FOR EACH ROW EXECUTE FUNCTION fn_sync_user_xp_on_log();

-- 4. BẢO MẬT & TRUY CẬP (RLS) 🔓
-- RLS được quản lý thông qua file security_overhaul.sql


-- 5. CHỈ MỤC TỐI ƯU (INDEXES) 🚀
CREATE INDEX IF NOT EXISTS idx_manga_updated ON public.mangas(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_mangas_status ON public.mangas(status);
CREATE INDEX IF NOT EXISTS idx_mangas_genres ON public.mangas USING GIN (genres);
CREATE INDEX IF NOT EXISTS idx_chapters_manga ON public.chapters(manga_id, chapter_number DESC);
CREATE INDEX IF NOT EXISTS idx_pages_chapter ON public.pages(chapter_id, page_number);
CREATE INDEX IF NOT EXISTS idx_users_xp_desc ON public.shiroi_users(xp DESC);
CREATE INDEX IF NOT EXISTS idx_xp_logs_user_date ON public.shiroi_xp_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_logs_created_at ON public.shiroi_xp_logs(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_checkin_per_day ON shiroi_xp_logs (user_id, ((created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)) WHERE type = 'check_in';
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_lucky_draw_per_day ON shiroi_xp_logs (user_id, ((created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)) WHERE type = 'lucky_draw';

-- 6. REAL-TIME TỰ ĐỘNG
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE shiroi_notifications;
ALTER TABLE comments REPLICA IDENTITY FULL;

SELECT 'Shiroi Master Schema v36: Đã hợp nhất và tối ưu thành công! 🍀🟢' as status;
