-- 🏆 SQL BACKFILL: KHÔI PHỤC DỮ LIỆU BXH THÁNG 🍀
-- Chạy lệnh này một lần duy nhất trong Supabase SQL Editor để điền bù điểm XP hiện tại vào nhật ký.

INSERT INTO shiroi_xp_logs (user_id, amount, type, reason, created_at)
SELECT id, xp, 'migration', 'Khôi phục dữ liệu BXH tháng từ tổng XP', now()
FROM shiroi_users
WHERE xp > 0
-- Bảo vệ: Chỉ chạy cho những người chưa có log migration trong tháng này
AND NOT EXISTS (
    SELECT 1 FROM shiroi_xp_logs 
    WHERE shiroi_xp_logs.user_id = shiroi_users.id 
    AND type = 'migration'
    AND created_at >= date_trunc('month', now())
);

-- Thông báo: (Supabase SQL Editor sẽ hiện số dòng đã insert)
-- Dữ liệu này sẽ xuất hiện ngay lập tức trên Bảng xếp hạng tab "Tháng này" 🚀
