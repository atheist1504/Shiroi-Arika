-- 🔔 BẢNG THÔNG BÁO TRONG ỨNG DỤNG (IN-APP NOTIFICATIONS) 🍀
CREATE TABLE IF NOT EXISTS public.shiroi_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.shiroi_users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT DEFAULT 'chapter_update', -- 'chapter_update', 'system', 'reply'
    data JSONB DEFAULT '{}', -- Lưu thông tin thêm (mangaId, chapterId, etc.)
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 📱 BẢNG LƯU TRỮ FCM TOKENS (PUSH NOTIFICATIONS) 🚀
CREATE TABLE IF NOT EXISTS public.shiroi_fcm_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.shiroi_users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    platform TEXT DEFAULT 'web', -- 'web', 'android', 'ios'
    last_seen_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tự động cập nhật last_seen_at
CREATE OR REPLACE FUNCTION update_fcm_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_seen_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_fcm_last_seen
BEFORE UPDATE ON public.shiroi_fcm_tokens
FOR EACH ROW EXECUTE FUNCTION update_fcm_last_seen();

-- Cài đặt quyền truy cập (RLS) 🛡️
-- CHÚ Ý: Đã tắt RLS cho shiroi_notifications để hỗ trợ hệ thống Custom Auth của Shiroi Arika
ALTER TABLE public.shiroi_notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shiroi_fcm_tokens ENABLE ROW LEVEL SECURITY;

-- 1. Quyền quản lý FCM Token (chỉ chính chủ)
CREATE POLICY "Quản lý FCM Token cá nhân" ON public.shiroi_fcm_tokens
    FOR ALL USING (auth.uid() = user_id);

-- 4. Cho phép Admin chèn thông báo cho bất kỳ ai (Phục vụ Server Actions)
-- Lưu ý: Server Action dùng Service Role nên thường không bị RLS chặn, nhưng khai báo cho chắc chắn.

SELECT 'Cấu trúc Database Thông báo đã sẵn sàng! 🔔🍀' as status;
