-- ==========================================================
-- 🍀 SHIROI ARIKA - MIGRATION: TIỂU THUYẾT & AUDIO NOVEL 🎧
-- Hỗ trợ đăng tiểu thuyết / truyện chữ và trình phát Audio
-- ==========================================================

-- 1. Bổ sung trường phân loại hình thức truyện (manga | novel)
ALTER TABLE public.mangas 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'manga';

-- Đảm bảo các truyện hiện tại được đánh dấu là 'manga'
UPDATE public.mangas 
SET type = 'manga' 
WHERE type IS NULL;

-- 2. Bổ sung trường nội dung chữ và audio cho bảng chapters
ALTER TABLE public.chapters 
ADD COLUMN IF NOT EXISTS content TEXT,             -- Văn bản tiểu thuyết (text / markdown / rich-text)
ADD COLUMN IF NOT EXISTS audio_url TEXT,            -- Đường dẫn file âm thanh (.mp3 / .m4a / cdn link)
ADD COLUMN IF NOT EXISTS audio_duration INTEGER;    -- Thời lượng file audio tính theo giây

-- 3. Tạo index tăng tốc lọc theo loại truyện
CREATE INDEX IF NOT EXISTS idx_mangas_type ON public.mangas(type);

-- 4. Thông báo hoàn tất
COMMENT ON COLUMN public.mangas.type IS 'Loại truyện: manga (truyện tranh) hoặc novel (tiểu thuyết/truyện chữ)';
COMMENT ON COLUMN public.chapters.content IS 'Nội dung văn bản chương tiểu thuyết';
COMMENT ON COLUMN public.chapters.audio_url IS 'Đường dẫn file audio diễn đọc của chương';
COMMENT ON COLUMN public.chapters.audio_duration IS 'Thời lượng audio tính bằng giây';
