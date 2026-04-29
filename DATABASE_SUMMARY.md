# 🍀 SHIROI ARIKA - CẨM NANG DATABASE (v36) 📜

Bản tóm tắt này giúp Admin nắm rõ cấu trúc "Vương quốc Shiroi" mà không cần đọc code SQL phức tạp.

---

## 🏰 1. CÁC KHU VỰC CHÍNH (TABLES)

### 📚 Kho Lưu Trữ (Content)
*   **mangas**: Trái tim của hệ thống. Lưu tên truyện, ảnh bìa, và các thông số tối ưu (Tổng số chương, Chương mới nhất).
*   **chapters**: Danh sách các chương truyện.
*   **pages**: Link ảnh của từng trang truyện.

### 🧘 Khu Tu Luyện (Users & XP)
*   **shiroi_users**: Hồ sơ tu sĩ (Admin/User). Lưu XP, Cấp độ, Chuỗi điểm danh và Danh hiệu.
*   **shiroi_xp_logs**: Nhật ký tu luyện. Ghi lại mọi hành động nhận điểm XP.
*   **shiroi_monthly_stats**: Bảng vàng theo tháng. Gom điểm XP theo từng tháng để làm BXH nhanh.

### 🧭 Khu Chinh Phục (Interaction)
*   **shiroi_read_chapters**: Đánh dấu những chương đã đọc (Phục vụ La bàn Chinh phục).
*   **shiroi_history**: Lưu lại chương đang đọc dở (Phục vụ nút "Đọc tiếp").
*   **comments**: Nơi thảo luận và nhận phản hồi từ độc giả.

### 🚩 Khu Quản Trị (Admin & Support)
*   **shiroi_reports**: Các báo cáo lỗi từ người dùng.
*   **shiroi_report_messages**: Kênh chat hỗ trợ trong từng báo cáo.
*   **shiroi_notifications**: Hệ thống thông báo Realtime.

---

## 💎 2. CƠ CHẾ THƯỞNG XP (CHẾ ĐỘ MỚI)

Hệ thống Điểm danh hiện tại hoạt động theo cơ chế **Thưởng Mốc (Milestones)**:
*   **Ngày thường**: +100 XP.
*   **Mốc Ngày 3 & 7**: Tổng nhận **500 XP**.
*   **Mốc Ngày 14 & 21**: Tổng nhận **1000 XP**.
*   **Mốc Ngày 30**: Tổng nhận **1500 XP**.

---

## ⚙️ 3. CÁC CỖ MÁY TỰ ĐỘNG (LOGIC)

1.  **Máy Đếm Chương**: Tự động cập nhật tổng số chương và chương mới nhất ngay khi Admin đăng bài.
2.  **Máy Cộng XP**: Tự động cập nhật điểm vào Profile và BXH Tháng ngay khi có hành động phát sinh điểm.
3.  **Máy Bảo Mật (RLS)**: Lá chắn ngăn chặn người lạ can thiệp vào dữ liệu thông qua các công cụ bên ngoài.

---

## 🛡️ 4. QUY TẮC BẢO MẬT
*   **Quyền Xem (Select)**: Công khai cho mọi người (Manga, Chapter, Profile công khai).
*   **Quyền Sửa (Update/Delete)**: Chỉ Admin/Staff mới có quyền thông qua hệ thống quản trị.
*   **Mật khẩu**: Được bảo vệ nghiêm ngặt, không thể xem từ các công cụ bên ngoài.

---
---
*Tài liệu này được soạn thảo để giúp Admin quản lý Shiroi Arika dễ dàng hơn. Chúc dự án thành công rực rỡ!* 💮🚀🏆

> [!TIP]
> Toàn bộ cấu trúc kỹ thuật (SQL Master) đã được hợp nhất tại: [database_master.sql](file:///c:/Shiroi%20Arika/database_master.sql)

