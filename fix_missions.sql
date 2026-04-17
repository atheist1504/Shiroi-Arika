-- 🛠️ FIX: Gỡ bỏ ràng buộc UNIQUE cũ để cho phép nhận lại nhiệm vụ hàng ngày
-- Chạy lệnh này trong SQL Editor của Supabase 🚀

ALTER TABLE public.shiroi_mission_claims 
DROP CONSTRAINT IF EXISTS shiroi_mission_claims_user_id_mission_key_key;

-- Thông báo hoàn tất
SELECT 'Đã gỡ bỏ ràng buộc UNIQUE thành công! Giờ đây nhiệm vụ hàng ngày sẽ tự động reset. 🍀' as status;
