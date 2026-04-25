-- ⚡ SHIROI PERFORMANCE TUNING: REPORTS SYSTEM 🚩
-- Tối ưu hóa tốc độ tải báo cáo cho Admin và User

-- 1. Thêm chỉ mục cho các cột thường xuyên join và filter
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.shiroi_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_manga_id ON public.shiroi_reports(manga_id);
CREATE INDEX IF NOT EXISTS idx_reports_chapter_id ON public.shiroi_reports(chapter_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.shiroi_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.shiroi_reports(status);

-- 2. Thêm chỉ mục cho bảng tin nhắn báo cáo (Chat)
CREATE INDEX IF NOT EXISTS idx_report_messages_report_id ON public.shiroi_report_messages(report_id);
CREATE INDEX IF NOT EXISTS idx_report_messages_created_at ON public.shiroi_report_messages(created_at ASC);

-- 3. Thông báo
SELECT 'Reports Performance: Các chỉ mục đã được thiết lập để tối ưu hóa tốc độ truy vấn! 🚀' as status;
