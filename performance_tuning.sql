-- ⚡ SHIROI PERFORMANCE TUNING: COUNTER CACHE
-- Mục tiêu: Tránh sử dụng COUNT(*) tốn kém trên bảng chapters

-- 1. Thêm các cột counter và cache vào bảng mangas
ALTER TABLE public.mangas 
ADD COLUMN IF NOT EXISTS total_chapters INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS latest_chapter_number NUMERIC,
ADD COLUMN IF NOT EXISTS latest_chapter_id UUID;

-- 2. Cập nhật dữ liệu hiện tại
UPDATE public.mangas m
SET 
    total_chapters = (SELECT COUNT(*) FROM public.chapters c WHERE c.manga_id = m.id),
    latest_chapter_number = (SELECT MAX(chapter_number) FROM public.chapters c WHERE c.manga_id = m.id),
    latest_chapter_id = (SELECT id FROM public.chapters c WHERE c.manga_id = m.id ORDER BY chapter_number DESC LIMIT 1);

-- 3. Tạo hàm cập nhật tự động (Atomic)
CREATE OR REPLACE FUNCTION public.update_manga_stats()
RETURNS TRIGGER AS $$
DECLARE
    latest_chap RECORD;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        -- Tìm chương mới nhất
        SELECT id, chapter_number INTO latest_chap 
        FROM public.chapters 
        WHERE manga_id = NEW.manga_id 
        ORDER BY chapter_number DESC LIMIT 1;

        UPDATE public.mangas
        SET 
            total_chapters = total_chapters + 1,
            latest_chapter_number = latest_chap.chapter_number,
            latest_chapter_id = latest_chap.id,
            updated_at = timezone('utc'::text, now()) -- Cập nhật thời gian mới nhất
        WHERE id = NEW.manga_id;
        
    ELSIF (TG_OP = 'DELETE') THEN
        -- Tìm chương mới nhất còn lại sau khi xóa
        SELECT id, chapter_number INTO latest_chap 
        FROM public.chapters 
        WHERE manga_id = OLD.manga_id 
        ORDER BY chapter_number DESC LIMIT 1;

        UPDATE public.mangas
        SET 
            total_chapters = GREATEST(0, total_chapters - 1),
            latest_chapter_number = latest_chap.chapter_number,
            latest_chapter_id = latest_chap.id
        WHERE id = OLD.manga_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Tạo Trigger trên bảng chapters
DROP TRIGGER IF EXISTS trg_update_manga_stats ON public.chapters;
CREATE TRIGGER trg_update_manga_stats
AFTER INSERT OR DELETE ON public.chapters
FOR EACH ROW
EXECUTE FUNCTION public.update_manga_stats();

-- 5. Note cho Admin
COMMENT ON COLUMN public.mangas.total_chapters IS 'Tổng số chương (Counter Cache)';
COMMENT ON COLUMN public.mangas.latest_chapter_number IS 'Số chương mới nhất (Cache)';
COMMENT ON COLUMN public.mangas.latest_chapter_id IS 'ID chương mới nhất (Cache)';

SELECT 'Performance Tuning: Stats Counter & Cache đã được thiết lập thành công! 🚀' as status;

SELECT 'Performance Tuning: Counter Cache đã được thiết lập thành công! 🚀' as status;
