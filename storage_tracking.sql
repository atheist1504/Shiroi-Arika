-- 📊 SHIROI STORAGE TRACKING SYSTEM
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Add size_kb column to pages table
ALTER TABLE public.pages 
ADD COLUMN IF NOT EXISTS size_kb INTEGER DEFAULT 150; 

-- 2. Add size_kb column to mangas table (for covers)
ALTER TABLE public.mangas 
ADD COLUMN IF NOT EXISTS size_kb INTEGER DEFAULT 300;

-- 3. Note: Existing records are defaulted to an average estimate (150KB per page, 300KB per cover).
-- New uploads will record precise sizes.

COMMENT ON COLUMN public.pages.size_kb IS 'Dung lượng file tính bằng KB';
COMMENT ON COLUMN public.mangas.size_kb IS 'Dung lượng ảnh bìa tính bằng KB';
