-- 🚀 OPTIMIZE REWARDS & MISSIONS PERFORMANCE 🍀
-- Thêm các chỉ mục (Indexes) để tăng tốc độ kiểm tra và ghi nhận XP/Nhiệm vụ.

-- 1. Tối ưu hóa bảng nhật ký XP (shiroi_xp_logs)
-- Tăng tốc độ kiểm tra giới hạn XP hàng ngày và hiển thị lịch sử.
CREATE INDEX IF NOT EXISTS idx_xp_logs_user_date ON public.shiroi_xp_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_logs_type_user ON public.shiroi_xp_logs (type, user_id);

-- 2. Tối ưu hóa bảng nhận thưởng nhiệm vụ (shiroi_mission_claims)
-- Tăng tốc độ kiểm tra xem đã nhận thưởng chưa (Tránh double claim).
CREATE INDEX IF NOT EXISTS idx_mission_claims_lookup ON public.shiroi_mission_claims (user_id, mission_key, claimed_at DESC);

-- 3. Tối ưu hóa bảng User (Nếu chưa có)
CREATE INDEX IF NOT EXISTS idx_users_username_low ON public.shiroi_users (LOWER(username));

-- 4. Thông báo hoàn tất
SELECT 'Rewards Performance: Đã thêm các chỉ mục tối ưu hóa! ⚡' as status;
