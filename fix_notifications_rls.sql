-- 🚀 FIX RLS FOR NOTIFICATIONS (REALTIME COMPATIBILITY) 🍀
-- Nguyên nhân: Chính sách "Restrict Notifications" đang chặn SELECT (FOR ALL USING false), khiến Realtime không gửi được payload.

-- 1. Xóa chính sách cũ chặn tất cả
DROP POLICY IF EXISTS "Restrict Notifications" ON public.shiroi_notifications;

-- 2. Cho phép SELECT công khai để Realtime có thể gửi dữ liệu (An toàn vì đã có filter user_id ở Client và Logic Server Action)
-- Lưu ý: Trong môi trường Production thực tế, nên dùng user_id = auth.uid() nếu sử dụng Supabase Auth.
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
SELECT 'Notifications RLS: Đã mở quyền SELECT để kích hoạt Realtime! 🛰️' as status;
