-- 📊 HÀM TÍNH TỔNG DUNG LƯỢNG LƯU TRỮ (KB)
-- Cộng dồn từ bảng mangas (ảnh bìa) và bảng pages (nội dung chương)

CREATE OR REPLACE FUNCTION get_total_storage_kb()
RETURNS float AS $$
DECLARE
    total_manga_size float;
    total_pages_size float;
BEGIN
    -- Tính tổng dung lượng ảnh bìa (mangas)
    SELECT COALESCE(SUM(COALESCE(size_kb, 300)), 0) INTO total_manga_size FROM mangas;
    
    -- Tính tổng dung lượng các trang truyện (pages)
    SELECT COALESCE(SUM(COALESCE(size_kb, 150)), 0) INTO total_pages_size FROM pages;
    
    RETURN total_manga_size + total_pages_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
