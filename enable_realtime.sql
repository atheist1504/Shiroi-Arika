-- 🔔 SHIROI ARIKA - SQL: KÍCH HOẠT REAL-TIME THÔNG BÁO 🚀
-- Hướng dẫn: Chạy đoạn mã này trong SQL Editor của Supabase để hệ thống có thể gửi thông báo tức thời.

BEGIN;
  -- 1. Thêm bảng shiroi_notifications vào publication của Supabase Realtime
  -- Kiểm tra xem bảng đã có trong publication chưa để tránh lỗi
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'shiroi_notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.shiroi_notifications;
    END IF;
  END $$;

  -- 2. Thêm bảng shiroi_fcm_tokens (Nếu dùng Push Notification sau này)
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'shiroi_fcm_tokens'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.shiroi_fcm_tokens;
    END IF;
  END $$;

COMMIT;

-- Kiểm tra trạng thái
SELECT pubname, schemaname, tablename 
FROM pg_publication_tables 
WHERE tablename IN ('shiroi_notifications', 'shiroi_fcm_tokens');

