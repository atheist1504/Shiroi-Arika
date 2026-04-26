-- 🛡️ FIX PROFILE VIEW PERMISSIONS (COMPREHENSIVE)
-- Bổ sung đầy đủ quyền SELECT cho các cột cần thiết cho trang Profile công khai

-- 1. Cấp quyền cho anon (khách)
GRANT SELECT (id, username, display_name, avatar_url, bio, role, xp, level, last_check_in, last_lucky_draw, check_in_streak, selected_badge, created_at) ON public.shiroi_users TO anon;

-- 2. Cấp quyền cho authenticated (người dùng đã đăng nhập)
GRANT SELECT (id, username, display_name, avatar_url, bio, role, xp, level, last_check_in, last_lucky_draw, check_in_streak, selected_badge, created_at) ON public.shiroi_users TO authenticated;

SELECT 'Quyền xem hồ sơ đã được cập nhật đầy đủ! 🍀 Profile sẽ hoạt động ổn định.' as status;
