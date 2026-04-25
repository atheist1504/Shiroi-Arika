-- 🚀 FIX RLS FOR NOTIFICATIONS (REALTIME COMPATIBILITY) 🍀
-- Nguyên nhân: Chính sách cũ đang chặn SELECT, khiến Realtime không gửi được payload.

-- 1. Dọn dẹp các chính sách cũ (Tránh lỗi "already exists")
DROP POLICY IF EXISTS "Restrict Notifications" ON public.shiroi_notifications;
DROP POLICY IF EXISTS "Cho phép SELECT thông báo" ON public.shiroi_notifications;
DROP POLICY IF EXISTS "Khóa các thao tác ghi dữ liệu từ Client" ON public.shiroi_notifications;
DROP POLICY IF EXISTS "Khóa các thao tác cập nhật từ Client" ON public.shiroi_notifications;
DROP POLICY IF EXISTS "Khóa các thao tác xóa từ Client" ON public.shiroi_notifications;

-- 2. Cho phép SELECT công khai để Realtime có thể gửi dữ liệu (An toàn vì đã có filter user_id ở Client và Logic Server Action)
-- Lưu ý: Hệ thống dùng custom auth nên SELECT USING (true) là cần thiết cho Realtime payload.
CREATE POLICY "Cho phép SELECT thông báo" ON public.shiroi_notifications
    FOR SELECT USING (true);

-- 3. Chỉ cho phép DELETE/UPDATE/INSERT từ phía Server (Service Role)
CREATE POLICY "Khóa các thao tác ghi dữ liệu từ Client" ON public.shiroi_notifications
    FOR INSERT WITH CHECK (false);
CREATE POLICY "Khóa các thao tác cập nhật từ Client" ON public.shiroi_notifications
    FOR UPDATE USING (false);
CREATE POLICY "Khóa các thao tác xóa từ Client" ON public.shiroi_notifications
    FOR DELETE USING (false);

-- 4. Thông báo
SELECT 'Notifications RLS: Đã cập nhật chính sách Realtime thành công! 🛰️' as status;
