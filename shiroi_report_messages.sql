-- 💬 HỆ THỐNG PHẢN HỒI BÁO CÁO (SUPPORT CHAT SYSTEM) 🍀

CREATE TABLE IF NOT EXISTS public.shiroi_report_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES public.shiroi_reports(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.shiroi_users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    is_admin_reply BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Bật RLS cho bảo mật 🛡️
ALTER TABLE public.shiroi_report_messages ENABLE ROW LEVEL SECURITY;

-- 1. Cho phép User xem tin nhắn của báo cáo CHÍNH MÌNH hoặc nếu là Admin
CREATE POLICY "Xem tin nhắn báo cáo hợp lệ" ON public.shiroi_report_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM shiroi_reports r
            JOIN shiroi_users u ON u.id = auth.uid()
            WHERE r.id = report_id 
            AND (r.user_id = auth.uid() OR u.role = 'admin' OR u.role = 'staff')
        )
    );

-- 2. Cho phép User gửi tin nhắn vào báo cáo CHÍNH MÌNH hoặc Admin gửi
CREATE POLICY "Gửi tin nhắn báo cáo hợp lệ" ON public.shiroi_report_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM shiroi_reports r
            JOIN shiroi_users u ON u.id = auth.uid()
            WHERE r.id = report_id 
            AND (r.user_id = auth.uid() OR u.role = 'admin' OR u.role = 'staff')
        )
    );

-- Index để truy vấn nhanh
CREATE INDEX IF NOT EXISTS idx_report_messages_report_id ON public.shiroi_report_messages(report_id);

SELECT 'Hệ thống Phản hồi Báo cáo đã sẵn sàng! 💬🍀' as status;
