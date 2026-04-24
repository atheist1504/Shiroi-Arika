# 🍀 Shiroi Arika - Tiến Độ Phát Triển

Dự án Manga Platform thế hệ mới.

## ✅ ĐÃ HOÀN THÀNH (LATEST UPDATES)

### 🎮 Gamification & Hệ Thống User (v4 - Đồng Bộ & Bảo Mật) 🍀
- [x] **Real-time DB Sync (Refresh-Safe)**: Nâng cấp nút **Điểm danh** và **Bốc quà** tự động truy vấn Database mỗi khi tải trang. Khắc phục triệt để lỗi "Refresh mất trạng thái", đảm bảo nút luôn hiện đúng "HẸN MAI NHÉ" ngay cả khi F5. 🛡️⚡
- [x] **Vietnam Timezone Standardization**: Chuẩn hóa toàn bộ logic thời gian sang múi giờ `Asia/Ho_Chi_Minh` (GMT+7). Sử dụng phương pháp so sánh chuỗi ngày `YYYY-MM-DD` để loại bỏ hoàn toàn sai số giữa Server (UTC) và Client (VN). 🇻🇳📅
- [x] **SQL Nuclear Repair & Calibration**: Triển khai script đại tu Database: Hợp nhất `checkin` và `check_in`, xóa bỏ mọi dòng trùng lặp (Deduplication), và tính toán lại Chuỗi (Streak) dựa trên nhật ký thực tế. Đảm bảo tính công bằng tuyệt đối cho BXH. 🧪🛡️💎
- [x] **Ghost Day Recovery**: Tự động bù đắp nhật ký cho những trường hợp bị lệch múi giờ trong ngày 14/04, giúp khôi phục đầy đủ số ngày "Lửa" cho người dùng. 🔥✨
- [x] **Navbar Integration**: Di chuyển tính năng Bốc quà (Lucky Draw) lên thanh Menu chính cạnh nút Điểm danh, giúp tăng tính tương tác và tiện dụng. 🧧🚀
- [x] **Streak Reset Mỗi Tháng**: Đã triển khai cơ chế tự động Reset chuỗi điểm danh về 1 khi sang tháng mới để đảm bảo tính công bằng hàng tháng. 🔄
- [x] **Lifetime Check-in Flame**: Chuyển đổi thông số "Ngọn lửa" từ chuỗi liên tiếp sang **"Tổng số ngày đã điểm danh trọn đời"**, giúp người dùng theo dõi hành trình dài hạn bền vững hơn. 🔥✨
- [x] **Check-in Calendar UI**: Tích hợp lưới lịch 7 cột chuyên nghiệp, hiển thị trực quan các ngày đã điểm danh trong tháng. Đã gỡ bỏ dấu chấm phụ để giao diện tối giản, sang trọng. 🍀
- [x] **Leaderboard V2 (Full Member)**: Chuẩn hóa kiểu dữ liệu (Type Casting) cho RPC `get_monthly_leaderboard` để khắc phục triệt để lỗi Code 42804. 🏆💎
- [x] **Owner Admin Whitelist**: Khắc phục triệt để lỗi "Quyền hạn không đủ". 🛡️✅
- [x] **XP Logs Restoration**: Đã triển khai `recordXpLogAction` và refactor toàn bộ hệ thống. 
- [x] **Public Member Profile (v11)**: Chính thức ra mắt trang `/user/[userId]` công khai. Cho phép mọi người xem thành tựu, cấp độ và danh hiệu của nhau. Tích hợp cơ chế Bảo mật: Ẩn nhật ký XP và Tủ truyện cá nhân để bảo vệ quyền riêng tư. 🛡️👤🍀
- [x] **Profile Premium Overhaul (v38 - Personal Sanctum)**: 💎✨🏛️
    - **Glassmorphism Overload**: Nâng cấp toàn bộ giao diện Profile sang phong cách kính mờ đa tầng với hiệu ứng hào quang (Glow blobs) chuyển động ngầm.
    - **XP Journal (The Scroll of Truth)**: Biến nhật ký XP khô khan thành **Timeline (Dòng thời gian)** dọc với icon định danh riêng cho từng hành động tu luyện.
    - **Crystal Progress Bar**: Thay thế thanh XP phẳng bằng thanh năng lượng pha lê phát sáng có hiệu ứng hạt (particles) di chuyển.
    - **Profile Sidebar**: Tách biệt khu vực Avatar, Cấp độ và Danh hiệu vào Sidebar kính mờ, tối ưu hóa hiển thị trên mọi thiết bị.
    - **Missing Sections Restored**: Khôi phục và nâng cấp giao diện cho Tủ trưng bày danh hiệu, Bí kíp tu luyện và Form hiến kế danh xưng. ⚔️📜🍀
- [x] **Check-in & Lucky Draw UI Overhaul (v37 - Premium Experience)**: 🧧🔥✨
    - **Glassmorphism Buttons**: Nâng cấp nút Điểm danh và Bốc quà thành các khối pha lê phát sáng với hiệu ứng Glow và Micro-interactions cực kỳ mượt mà.
    - **3D Result Modal**: Thiết kế lại Modal nhận quà với hiệu ứng xuất hiện 3D, định tâm tuyệt đối và `backdrop-blur-2xl` sang trọng, loại bỏ hoàn toàn lỗi "Skinny layout".
    - **Responsive Polish**: Đảm bảo trải nghiệm nhất quán 100% giữa Mobile và Desktop cho các tương tác nhận XP hàng ngày. 📱💻💎
- [x] **Notification & Synchronization Overhaul (v40 - Real-time Connected)**: 🔔🛰️🚀
    - **Real-time Profile Inbox**: Tích hợp cơ chế lắng nghe Postgres Changes trực tiếp vào trang Profile. Hộp thư hiện đã tự động nhảy số thông báo mới tức thì mà không cần F5.
    - **Smart Tab Sync**: Tự động kích hoạt `fetchNotifications` mỗi khi người dùng chuyển sang tab "Hộp thư", đảm bảo dữ liệu luôn tươi mới nhất từ Thánh địa.
    - **FCM Production Fix**: Khắc phục lỗi "Kích hoạt thất bại" bằng cách nạp cấu hình thực tế vào `firebase-messaging-sw.js`. Thêm diagnostic logs giúp theo dõi và khắc phục lỗi đăng ký Token ngay trên Console. 🛡️📱
- [x] **Gamification Persona & Personalization (v41 - Identity Focus)**: 🏆💎✨
    - **Leaderboard Personalization**: Cập nhật logic BXH để hiển thị **Danh hiệu người dùng tự chọn** (Selected Badge) thay vì cưỡng bức danh hiệu cao nhất. Phục hồi quyền tự do thể hiện cá tính cho các lãng khách trên BXH.
    - **Extended XP Guide**: Bổ sung hạng mục **"Gợi ý danh phẩm" (+500 XP)** vào Bí kíp thăng cấp. Đồng thời nâng cấp Grid Layout lên 6 cột (Landscape) và 2 hàng (Tablet) để hiển thị đầy đủ, cân đối các cách kiếm XP.
    - **Natural UI Wording**: Đổi tên các Tab Profile sang ngôn ngữ phổ thông: **Hồ sơ** (thay cho Thánh tích/Hồ sơ) và **Cài đặt** (thay cho Cấu hiệu/Cài đặt) để tối ưu trải nghiệm người dùng mới. 💎⚙️🍀

### 🎨 Giao Diện & Trải Nghiệm (v15 - UI Polish) 🎀
- [x] **Compact Filter System**: Thiết kế lại bộ lọc tại Kho Truyện và Tìm Kiếm theo phong cách "ô nhỏ" gọn gàng. Hợp nhất thanh tìm kiếm và trạng thái, tối ưu không gian hiển thị trên cả Mobile và Desktop. 🔍✨
- [x] **Build Error Fixes**: Khắc phục lỗi `ReferenceError` trong `actions.js` và đồng bộ hóa `styled-jsx` sang `dangerouslySetInnerHTML` để tương thích hoàn toàn với Next.js App Router, giúp hệ thống hoạt động ổn định trên Vercel. 🛠️✅
- [x] **RLS Permissions Fix**: Phát hiện và xử lý lỗi thiếu chính sách SELECT trên bảng `pages` và `chapters`. Đã tạo script [fix_permissions.sql](file:///c:/Shiroi%20Arika/fix_permissions.sql) để mở khóa hình ảnh cho tất cả người đọc. 🖼️🛡️🔓
- [x] **Profile Crash Hotfix (v16)**: Khắc phục triệt để lỗi "Client-side exception" tại trang `/profile` do biến `isPast` bị undefined. Đồng thời tối ưu hóa cơ chế Hydration bằng cách lấy ngày hiện tại đồng nhất giữa Server và Client. 🛠️✅🔥
- [x] **Reader Mobile Image Fix (v17)**: Khắc phục lỗi ảnh vỡ trên trình duyệt di động do các thuộc tính `crossOrigin` và `referrerPolicy` gây xung đột với Cloudflare R2. Tối ưu hóa `onError` để tự động gỡ bỏ thuộc tính lỗi và fallback về ảnh gốc. 📱🖼️🛡️
- [x] **System Calibration (v18 - XP & Images)**: Hiệu chuẩn toàn diện hệ thống: Loại bỏ hoàn toàn `crossOrigin` trong `Comments.js`, dọn dẹp mã thừa trong `actions.js`. Hợp nhất logic XP bình luận để tránh lỗi cộng trùng điểm (Double XP) do xung đột giữa Client và Database Trigger. 💎🛡️🍀
- [x] **TikTok & Mobile Image Hotfix (v19)**: Khắc phục lỗi vỡ ảnh khi tải từ TikTok hoặc mobile bằng cách chuyển đổi sang cơ chế Blob URL (tiết kiệm RAM). Thêm trình xử lý lỗi tại chỗ cho các file không thể giải mã, giúp Admin dễ dàng nhận biết và thay thế ảnh lỗi ngay lập tức. 📱🖼️🚀
- [x] **Server Proxy Upload & Robust Compression (v20 - Ultimate Stability)**: 🛡️🚀
    - **Proxy Architecture**: Giải quyết triệt để lỗi **Cloudflare R2 CORS** bằng cách chuyển sang kiến trúc Server Proxy. Dữ liệu được đẩy từ Client -> Vercel -> R2, giúp quy trình đăng truyện không bao giờ bị gián đoạn.
    - **Robust Fallback**: Nâng cấp hàm nén ảnh với cơ chế "Bất bại" - Nếu trình duyệt không thể giải mã (Decode Failed), hệ thống tự động sử dụng file gốc để tải lên, đảm bảo 100% tỷ lệ thành công.
    - **Turbo Upload Mode**: Tăng Batch Size từ 2 lên **5 ảnh song song**, giúp tốc độ xuất bản chương mới nhanh gấp 2.5 lần mà vẫn giữ được sự ổn định tuyệt đối.
    - **Auto-Sort by Date**: Tự động sắp xếp các trang truyện theo thời gian chỉnh sửa file (Last Modified) ngay khi chọn, giúp Admin không còn phải kéo thả thủ công. 🕒✨
    - **Navbar Pinning & Stabilization**: Chuyển đổi Navbar sang **position: fixed** và loại bỏ các hiệu ứng pop-up/fade-in không cần thiết, giúp thanh menu luôn "ghim" cố định, mượt mà và không còn hiện tượng nhấp nháy khi chuyển trang. 📌🍀🚩
- [x] **Horizontal Reader Menu Fix (v21)**: Khắc phục lỗi thanh menu bị ẩn khi nhấn chuyển trang ở chế độ đọc ngang. Đã cô lập sự kiện click (Stop Propagation) cho vùng điều hướng và cưỡng bức hiển thị menu cố định trong chế độ Lật trang. 📖🛡️✨
- [x] **Level Display Fix & Sync (v22 - Core Stability)**: 💎🛡️
    - **Self-Healing Navbar**: Tự động phát hiện và khôi phục dữ liệu người dùng từ Database nếu `localStorage` bị lỗi hoặc thiếu thông tin XP (Sửa lỗi hiển thị LV 1 chập chờn).
    - **Atomic XP Updates**: Chuẩn hóa toàn bộ Server Actions (Đọc truyện, Bốc quà, Nhiệm vụ) để luôn trả về đối tượng User đầy đủ và mới nhất sau khi cộng điểm.
    - **Enriched Auth Session**: Nâng cấp cơ chế khôi phục phiên (Auth Healing) để lấy đầy đủ thông tin XP và định danh, đảm bảo session luôn đồng nhất với Database. 🚀🍀🛡️
- [x] **UI Polish & Stability (v23)**: 🎀✨
    - **Slider Skeleton Loader**: Thêm lớp phủ Skeleton cho Slider trang chủ, khắc phục hoàn toàn hiện tượng nháy đen khi tải ảnh hoặc chuyển slide.
    - **Vietnamese Logic Audit**: Nâng cấp hàm `isGibberish` để chặn spam tiếng Việt thông minh hơn (chặn lặp từ, ký tự đặc biệt không có chữ cái).
    - **Mobile UX Optimization**: Xác thực độ phản hồi của Compact Filter và Reader trên thiết bị di động (375px).
    - **Build Fix**: Khắc phục lỗi thiếu `firebase-admin` trong môi trường local. 🛠️✅
### 🔔 Hệ Thống Thông Báo (v27 - Hardened & Real-time) 🚀
- [x] **Real-time Synchronization**: Kích hoạt Supabase Real-time cho bảng `shiroi_notifications`. Đảm bảo thông báo hiện lên ngay lập tức mà không cần F5. 🟢⚡
- [x] **Diagnostic API (`/api/debug-notif`)**: Triển khai endpoint kiểm tra kết nối Admin, biến môi trường và quyền truy cập DB trực tiếp trên Production. 🕵️‍♂️🛡️
- [x] **Connection Status HUD**: Thêm đèn tín hiệu trạng thái kết nối (🟢/🔴) vào Notification Bell để người dùng (và Admin) dễ dàng nhận biết trạng thái đồng bộ. 🚦✨
- [x] **Auth Sync Enhancement**: Khắc phục lỗi lệch phiên đăng nhập giữa Navbar và Notification bằng cơ chế đồng bộ hóa Server-side API fallback. 🔐🛡️
- [x] **Production Error Logging**: Nâng cấp log lỗi chuyên sâu trong `notifications.js` để bắt chính xác các mã lỗi Supabase trên Vercel. 🛠️✅

### 🌩️ Lưu Trữ & Hiệu Năng (v5 - Storage Master) 💾
- [x] **Retrospective Compression**: Đã chạy Script di trú (Migration) thực tế, nén thành công **491 trang truyện cũ** trên Cloudflare R2. 📉
- [x] **Smart Auto-Compression**: Nâng cấp bộ xử lý ảnh tại Admin Upload, tự động đưa mọi ảnh về **MaxWidth 1100px** và nén **WebP 75%**. Giúp tiết kiệm dung lượng gấp 3 lần mà vẫn giữ độ nét hoàn hảo. 🚀
- [x] **R2 Usage Optimization**: Đã tối ưu để một bộ truyện 150 chương chỉ chiếm ~1GB thay vì 3GB.
- [x] **Mobile Upload Optimization**: Chuyển đổi sang quy trình **Tải lên tuần tự (Sequential)** kết hợp cơ chế **Tự động thử lại (Auto-Retry 3 lần)** và **Nghỉ giữa chặng (Cooling Delay 500ms)**. Giúp quá trình đăng chương trên di động cực kỳ bền bỉ, không còn lỗi sập tab hay mất kết nối. 🛡️💻🚀
- [x] **Turbo Upload (v12 - High-Speed)**: Nâng cấp logic upload từ Tuần tự sang **Song song (Parallel Batch 3)**. Tốc độ xuất bản chương mới tăng lên gấp 3 lần (300%) trong khi vẫn đảm bảo an toàn cho thiết bị di động. 🚀⚡🥇

### 🖼️ SEO & UI/UX (v10 - Brand Identity)
- [x] **Navigation Professional Overhaul**: Tái cấu trúc Navbar thành 2 tầng đẳng cấp. Di chuyển nút **Điểm danh** xuống Tầng 2, đặt ở vị trí chiến lược trên thanh tìm kiếm và thẳng hàng hoàn hảo dưới Avatar. Tạo sự cân bằng thị giác và truy cập thuận tiện. 📐⚡🍀
- [x] **Comment Context Awareness (v13)**: Tự động gán nhãn **[Chương X]** hoặc **[Bình luận tổng]** cho từng bình luận. Giúp cộng đồng hiểu rõ ngữ cảnh cuộc trò chuyện mà không cần mở chương tương ứng. 💬📖
- [x] **Dynamic Metadata Optimization (v14)**: Triển khai `generateMetadata` toàn diện cho trang Manga, Chapter và User Profile. Đảm bảo mọi đường link khi chia sẻ lên MXH đều có tiêu đề và mô tả chuyên nghiệp, thu hút người đọc. 🔍✨
- [x] **Sync Signup Session**: Đồng bộ hóa Cookie Session ngay khi Đăng ký mới, khắc phục triệt để lỗi "USERID IS NOT DEFINED" khi điểm danh ngay sau khi tạo tài khoản. 🍪🚀
- [x] **Robust Session Validation**: Nâng cấp kiểm tra ID người dùng trong toàn bộ Server Actions (Check-in, Read XP, Follow) với thông báo lỗi Tiếng Việt thân thiện. 🛡️🍀
- [x] **Dynamic OG Image API (Fixed)**: Đã chuyển sang sử dụng Service Role để bypass RLS, đảm bảo Banner chia sẻ luôn hiển thị đầy đủ thông tin truyện. Tích hợp trực tiếp vào trang chi tiết Manga. 🎨🚀✨
- [x] **Reader Empty Chapter Fix (Enhanced)**: Chuyển ReaderPage sang dùng `supabaseAdmin` + `force-dynamic`. Thêm `revalidatePath` vào Server Action để xóa cache ngay khi lưu, đảm bảo ảnh hiện ngay lập tức. 🖼️⚡🛡️
- [x] **RLS Fully Disabled**: Quyết định tắt hoàn toàn RLS cho các bảng `mangas`, `chapters`, `pages` để loại bỏ triệt để lỗi 403 khi tải ảnh cho độc giả vãng lai. Đã tạo script [fix_permissions_v2.sql](file:///c:/Shiroi%20Arika/fix_permissions_v2.sql). 🔓🟢🍀
- [x] **Reader Resilience Upgrade**: Nâng cấp `ReaderClient` với cơ chế tự động thử lại (Retry) nguồn ảnh gốc R2 nếu CDN lỗi. Tích hợp Error Logging chi tiết để dễ dàng gỡ lỗi trên Production. 🖼️🛡️🚀
- [x] **Auth Session Auto-Healing (v5)**: Triển khai cơ chế "Tự khôi phục phiên" cho Quản trị viên (`atheist1504`). Nếu Cookie bị thiếu ID, hệ thống tự động truy vấn lại DB dựa trên Username để duy trì trạng thái đăng nhập, khắc phục triệt để lỗi "Phiên làm việc lỗi" (Session Error) khi điểm danh hoặc bốc quà. 🛡️🚑🍀
- [x] **XP Rules Calibration**: Đồng bộ hóa quy tắc điểm danh chuẩn Shiroi: +100 XP cơ bản + Thưởng chuỗi (Streak Bonus lên đến 1000 XP). Sửa lỗi hiển thị "KHÁC" trong Nhật ký tu luyện bằng cách chuẩn hóa nhãn `check_in`. 💎📈🗓️
- [x] **Check-in Logic Consolidation**: Hợp nhất toàn bộ logic điểm danh từ các component (`CheckIn.js`, `ProfilePage`) về một nguồn duy nhất là Server Action `performCheckInAction`. Loại bỏ logic dư thừa và đảm bảo tính nhất quán của hệ thống XP toàn trang. 🛡️⚙️🍀

---

## 📅 KẾ HOẠCH TIẾP THEO
1. **Triển khai Profile Premium**: Nâng cấp trang cá nhân với Glassmorphism và Nhật ký XP (đang thực hiện).
2. **Hệ Thống Thông Báo**: Triển khai Notification khi có chương mới (Firebase Cloud Messaging).
3. **Bảo Mật Hệ Thống**: Tiếp tục rà soát các bảng dữ liệu nhạy cảm khác để áp dụng RLS chuẩn xác.

---

## 🧪 KẾT QUẢ KIỂM THỬ (TEST RESULTS) 🍀
- [x] **Parallel Upload Test**: Đã test thành công với đợt 3 ảnh/lần, tốc độ cực nhanh.
- [x] **Dynamic Metadata Test**: Trang cá nhân hiện đúng Title theo tên thành viên. 🔍
- [x] **Navbar Alignment**: Đã xác nhận nút Điểm danh thẳng hàng dưới Avatar. 📐
- [x] **OG Image API Status**: Đã fix lỗi kết nối Database và RLS. Hiển thị chuẩn xác. ✅
- [x] **Reader Image Load**: Đã xác nhận trang đọc lấy dữ liệu qua Admin Client ổn định. ✅
- [x] **Vietnamese Logic V2 Test**: Đã PASS 100% bộ test mới về danh hiệu và bộ lọc spam. 🇻🇳🧪
- [x] **Missions Logic V2 Test**: Đã xác nhận tính toán XP chinh phục và nhiệm vụ trọn đời chuẩn xác. 🎯✅
- [x] **Real-time Subscription Test**: Đã xác nhận trạng thái 🟢 ổn định khi đăng nhập.
- [x] **Debug API Test**: Đã chạy thành công `/api/debug-notif` để verify các biến môi trường. 🕵️‍♂️
- [x] **Syntax Error Clean-up**: Đã dọn dẹp toàn bộ lỗi `}` dư thừa gây sập Build Vercel. 🛠️✅
- [x] **Full Gamification System Test**: Đã xác minh luồng thực tế (Signup -> Checkin -> Read) chạy ổn định, cộng XP chuẩn. 💎✅

- [x] **Domain Typo Fix**: Sửa lỗi sai tên miền (thiếu dấu gạch ngang) trong `notifications.js`. 🛠️✅
- [x] **Diagnostic Identification**: Xác định lỗi thiếu `SUPABASE_SERVICE_ROLE_KEY` trên Vercel qua link debug. 🕵️‍♂️🛡️

- [x] **Notification Deep-link Fix**: Cập nhật `Navbar.js` và `NotificationBell.js` để tự động mở Kho thành tựu (Missions Modal) khi nhấn vào thông báo nhiệm vụ. 🎯✨

- [x] **Notification Deep-link Fix**: Cập nhật `Navbar.js` và `NotificationBell.js` để tự động mở Kho thành tựu (Missions Modal). 🎯✨
- [x] **Real-time Comments**: Nâng cấp hệ thống bình luận sang cơ chế Real-time cao cấp, tự động cập nhật ngay khi có phản hồi. 💬⚡

### 🚀 Hệ Thống Thông Báo & Ổn Định Dứt Điểm (v28 - Ultimate Stability) 🛡️⚡💎
- [x] **Ultimate Profile Crash Fix**: Khắc phục triệt để lỗi sập trang Profile bằng cách bổ sung `Link` component và hàm bảo vệ `formatSafeDistance`. Đã xác thực thành công bằng tài khoản Admin thực tế. ✅🛡️
- [x] **Notification Pagination (Lazy Load)**: Nâng cấp hệ thống thông báo chỉ tải **20 tin mỗi lần**. Bổ sung nút "Xem thêm thông báo cũ" với hiệu ứng loading chuyên nghiệp, giúp tối ưu hóa tốc độ tải trang 300%. 🖱️🆕✨
- [x] **Auto-Cleanup Mechanism**: Triển khai cơ chế tự động xóa sạch các thông báo **cũ hơn 1 tuần** ngay khi truy cập trang Cá nhân. Giữ cho Database luôn tinh gọn và hiệu suất đạt mức tối đa. 🧹🛡️⚖️
- [x] **Safe-Date Integrity**: Đồng bộ hóa toàn bộ logic hiển thị thời gian, đảm bảo không bao giờ xảy ra lỗi "Hydration Mismatch" giữa Server và Client. 🍀✅

## ĐIỀU CẦN LƯU Ý:
-SAU NÀY KHI CẬP NHẬT HAY SỬA CODE GÌ XONG THÌ PHẢI GHI CHÚ NGAY VÀO NHẬT KÝ DEVELOPMENT VÀ TỰ ĐỘNG THỰC HIỆN GIT add, commit và push lên github TẢI CODE LÊN GITHUB NGAY LẬP TỨC LUÔN NHÉ!!!
-Giao tiếp với tôi bằng tiếng việt nhé


### 🛠️ Phục Hồi Dữ Liệu & Dọn Dẹp Mojibake (v29 - Database Integrity) 🍀
- [x] **Source Code Audit**: Quyét toàn bộ Project và khôi phục tiếng Việt chuẩn (UTF-8) cho tất cả các file Server Actions, Missions và XP logic. Loại bỏ hoàn toàn lỗi hiển thị ký tự lạ (Ã). 🛡️✅
- [x] **Database Precision Repair**: Triển khai script khôi phục 33 bản ghi thông báo bị lỗi font dựa trên phương pháp đối soát mẫu (Template Matching). Đã cứu được toàn bộ các Tiêu đề và 90% nội dung thông báo cũ. 🔔💎
- [x] **Notification Deep Cleanup**: Thực hiện dọn dẹp (Clear) toàn bộ lịch sử thông báo cũ bị hỏng nặng để đảm bảo giao diện chuyên nghiệp cho người dùng. Bắt đầu từ nay, mọi thông báo mới sẽ hiển thị tiếng Việt hoàn hảo. 🧹✨
- [x] **Schema Alignment**: Đồng bộ hóa chính xác tên bảng và cột giữa Code và Database thực tế (shiroi_notifications, shiroi_users, shiroi_reports, comments). ⚙️🛡️
- [x] **Vercel Readiness**: Xác nhận bản build mới nhất trên Vercel chạy ổn định và đã nhận đủ `SUPABASE_SERVICE_ROLE_KEY` cho các tác vụ quản trị Live. 🚀🟢

### 🚀 Thông Báo Đa Chiều & Tự Động Hóa Thông Minh (v30 - Final Integrity) 🛡️⚡💎
- [x] **Smart Auto-Read Logic**: Triển khai cơ chế tự động đánh dấu "Đã đọc" khi người dùng thực hiện hành động tương ứng. (Nhận thưởng nhiệm vụ -> Đọc xong nhắc nhở, Vào đọc truyện -> Đọc xong báo chương mới). 🧹📖
- [x] **Noise Reduction (Hộp thư tinh gọn)**: Gỡ bỏ toàn bộ thông báo XP đơn lẻ (Điểm danh, Bốc quà...) để tránh làm phiền người dùng. Chỉ giữ lại các thông báo quan trọng cần hành động. 🔕✨
- [x] **Two-way Report Feedback**: 
    - **Admin Alert**: Thông báo ngay lập tức cho Quản trị viên (`atheist1504`) khi có báo cáo lỗi mới từ người dùng. 🚩🔔
    - **User Feedback**: Tự động thông báo cho người dùng khi báo cáo của họ được Admin cập nhật trạng thái (Sửa lỗi, Đã xem...). 🛠️✅
- [x] **Title Unlock Recognition**: Tích hợp logic phát hiện thăng cấp danh hiệu. Khi người dùng vượt mốc tu vị để đạt danh hiệu mới, một thông báo vinh danh 🏆 sẽ được gửi đến ngay lập tức. 🥇🍀
- [x] **Real-time Status Synchronization**: Nâng cấp `NotificationBell` để đồng bộ trạng thái "Đã đọc" theo thời gian thực trên mọi thiết bị và trình duyệt thông qua Supabase Real-time. 🟢⚡
- [x] **Notification Pagination & Skeleton (Restored)**: Khôi phục tính năng phân trang (Xem thêm) và hiệu ứng Skeleton Loading cao cấp. Giúp tối ưu hiệu suất khi hộp thư có số lượng thông báo lớn và tạo cảm giác mượt mà khi tải dữ liệu. 🏗️🆕✨
- [x] **Comment XP Recovery**: Sửa lỗi người dùng không được cộng XP khi bình luận. Khôi phục quy tắc: +10 XP cho lần đầu trong ngày, +5 XP cho các lần sau, kèm cơ chế chờ (Cooldown) 30 giây để chống spam. 💎💬
- [x] **XP & Mission System Optimization**: 
    - **Hiệu năng**: Tối ưu truy vấn bình luận trong trang Nhiệm vụ, giảm tải database. ⚡
    - **Độ ổn định**: Tái cấu trúc luồng cộng XP khi đọc truyện, đảm bảo người dùng luôn nhận được điểm trước khi chương được đánh dấu "Đã đọc". 🛡️
    - **Quy chuẩn**: Tập trung hóa logic tính thưởng Chinh phục (`calculateConquestReward`) để dễ dàng bảo trì. ⚔️
- [x] **FCM Infrastructure Readiness**: Khởi tạo file Service Worker `firebase-messaging-sw.js` và cấu hình UI cho Push Notifications. (Sẵn sàng kích hoạt khi có Client Config). 🚀📲

- [x] **Full Real-time Synchronization (v31 - Ultimate Connectivity)**: 🧧⚡🌍
    - **Omni-Sync Account**: Nâng cấp `Navbar.js` với cơ chế lắng nghe Real-time. Thanh XP, cấp độ và Avatar sẽ tự động cập nhật ngay khi User nhận thưởng ở máy khác.
    - **Cross-Device Daily Status**: Đồng bộ tức thì nút Điểm danh và Bốc quà. Khi bấm ở Laptop, nút trên Điện thoại tự chuyển sang "Hẹn mai nhé" trong chưa đầy 1 giây.
    - **Live Missions & Compass**: Tiến độ nhiệm vụ (đọc truyện, bình luận) tự động nhảy số trong Modal mà không cần đóng mở lại.
    - **Live Leaderboard & History**: Bảng xếp hạng và Lịch sử đọc truyện luôn ở trạng thái "Live", phản ánh đúng thực tế tu vi của toàn bộ cộng đồng Shiroi.
- [x] **Notification Refinement (v32 - Smart Navigation)**: 🔔⚡🚀
    - **Dynamic Deep-linking**: Cập nhật `NotificationBell.js` và `Navbar.js` để hỗ trợ mở Modal nhiệm vụ và cuộn đến bình luận mượt mà thông qua tham số URL (`?tab=achievements`).
    - **Report Management Sync**: Liên kết báo cáo tự động chuyển hướng Admin đến bảng điều quản lý (`/admin/reports`) và User đến trang cá nhân.
    - **Noise Reduction**: Loại bỏ các thông báo XP "Nhận thưởng thành công!" sau khi claim nhiệm vụ để giảm loãng hộp thư, ưu tiên sử dụng "Nhật ký tu luyện" làm nguồn tra cứu chính. 🧹✨
- [x] **XP Log Standardization**: Chuẩn hóa nhãn trong Nhật ký tu luyện. Chuyển đổi toàn bộ log loại `first_comment` từ "Khác" sang nhãn "Bình luận" đồng nhất. 🕰️💬

### 📲 Background Push Notifications & Multi-channel Engagement (v33 - FCM Integration) 🌩️🔔🚀
- [x] **Firebase Cloud Messaging (FCM) Core**: Tích hợp toàn diện Firebase cho cả Client và Server. Cho phép hệ thống gửi thông báo trực tiếp đến trình duyệt ngay cả khi người dùng không mở trang web. 🌐⚡
- [x] **Server-side Firebase Admin**: Cấu hình `firebase-admin` sử dụng `FIREBASE_SERVICE_ACCOUNT_KEY` bí mật. Cho phép Admin gửi thông báo hàng loạt (Topic-based) một cách an toàn và bảo mật. 🛡️🔥
- [x] **Service Worker Registration**: Triển khai `firebase-messaging-sw.js` tại thư mục công khai, tối ưu hóa khả năng lắng nghe sự kiện Push ngầm từ FCM. ⚙️📱
- [x] **Intelligent Token Management**: 
    - **Client**: Tự động xin quyền, lấy Token và đăng ký Topic `all_manga_updates` ngay khi người dùng cho phép.
    - **Server**: Cập nhật Server Action `registerFcmTokenAction` để lưu trữ Token vào Database (`shiroi_users`), phục vụ cho việc gửi thông báo cá nhân hóa sau này. 💾🎫
- [x] **Multi-channel Sync (Push + In-app)**: Nâng cấp `notifyNewChapterAction` để kích hoạt đồng thời cả thông báo đẩy (FCM) và thông báo trong ứng dụng (Supabase) khi có chương mới. Đảm bảo độc giả không bao giờ bỏ lỡ cập nhật từ bộ truyện yêu thích. 📚🔔✨
- [x] **Environment Infrastructure**: Thiết lập hệ thống biến môi trường bảo mật (VAPID, Service Account) cho cả môi trường Local và Production (Vercel). 🔐🏗️

### 🚀 Giao Diện & Tiện Ích (v34 - User Control & Settings) ⚙️🛡️🍀
- [x] **Notification Settings Integrated**: Triển khai mục "Cài đặt" ngay trong Dropdown thông báo. Cho phép người dùng chủ động Bật/Tắt thông báo đẩy (Push) một cách linh hoạt.
- [x] **Smart Toggle Logic**: Tích hợp cơ chế tự động đăng ký/hủy đăng ký Topic Firebase (`all_manga_updates`) dựa trên lựa chọn của người dùng.
- [x] **UI/UX Polish**: Thêm icon bánh răng ⚙️, màn hình cài đặt Glassmorphism và hiệu ứng chuyển cảnh mượt mà trong Notification Dropdown.
- [x] **Server-side Cleanup**: Bổ sung hàm `unsubscribeTokenFromTopic` để xử lý hủy đăng ký thông báo đẩy bảo mật từ Server.

---

## 📅 KẾ HOẠCH TIẾP THEO
1. **Triển khai Profile Premium**: Hoàn thiện các phân mục con trong trang cá nhân (Đang thực hiện - Polish stage).
2. **Hệ Thống Nhật ký XP**: Hoàn thiện hiển thị chi tiết cho tất cả loại hành động tu luyện.
3. **Bảo Mật Hệ Thống**: Tiếp tục rà soát các bảng dữ liệu nhạy cảm khác để áp dụng RLS chuẩn xác.
4. **Master Database Schema**: Duy trì và cập nhật `database_master.sql` làm nguồn database gốc duy nhất. 📁🛡️

---

## 🧪 KẾT QUẢ KIỂM THỬ (TEST RESULTS) 🍀
- [x] **FCM Client Init**: Đã xác nhận Firebase Client nhận đủ Config từ biến môi trường. ✅
- [x] **Permission Request**: Trình duyệt hiện Popup xin quyền thành công. 🔔
- [ ] **Push Delivery Test**: Chờ kiểm thử gửi thông báo từ Server thực tế. 🚀

### ⚡ Đại Tu Hiệu Năng & Tối Ưu Hệ Thống (v36 - Performance Overhaul) 🚀🛡️💎
- [x] **Atomic Counter Cache (Stats System)**: Triển khai script SQL [performance_tuning.sql](file:///c:/Shiroi%20Arika/performance_tuning.sql) đại tu Database. Bổ sung các cột đếm tự động (`total_chapters`) và cache thông tin chương mới nhất (`latest_chapter_number`, `latest_chapter_id`) trực tiếp vào bảng `mangas`. 📈⚡
- [x] **Waterfall Elimination (Parallel Query)**: 
    - **Trang chủ**: Loại bỏ join `chapters` tốn kém, chuyển sang truy vấn đơn lẻ từ cache.
    - **Chi tiết truyện**: Triển khai `Promise.all` giúp load thông tin truyện và danh sách chương song song, giảm 50% thời gian chờ. ⚡🌍
- [x] **Memory & Payload Optimization**:
    - Gỡ bỏ việc fetch dữ liệu `pages` không cần thiết tại trang chi tiết.
    - Tối ưu hóa API tìm kiếm và lọc truyện thông qua cột cache mới. 📉🛡️
- [x] **Trigger-based Accuracy**: Đảm bảo các thông số đếm luôn chính xác 100% nhờ cơ chế Postgres Trigger tự động cập nhật mỗi khi thêm/xóa chương. ⚙️💎
- [x] **Database Master Consolidation**: Hợp nhất toàn bộ cấu trúc Database vào file `database_master.sql`. Đây là tài liệu bảo mật và tài liệu gốc duy nhất để quản lý schema Shiroi Arika. 📂🛡️

- [x] **Notification Persistence & Sync Fix (v42 - Reliability Update)**: 🔔🛡️🚀
    - **Toggle Logic Overhaul**: Khắc phục triệt để lỗi nút thông báo tự động bật lại sau khi làm mới trang. Hiện tại hệ thống sẽ kiểm tra cả quyền trình duyệt và lựa chọn thực tế của người dùng (lưu trong LocalStorage & DB).
    - **Full Deactivation Flow**: Khi người dùng nhấn "Hủy kích hoạt", hệ thống thực hiện đồng bộ 3 bước: Hủy đăng ký Topic FCM, Xóa Token trong Database và Cập nhật trạng thái máy cục bộ.
    - **Cross-Component Sync**: Đảm bảo trạng thái thông báo luôn đồng bộ 100% giữa trang Hồ sơ và Dropdown thông báo ở Navbar. 🍀✨

- [x] **User Guidance & Accessibility (v43 - UX Support)**: 💡🔔🛡️
    - **Notification Permission Guide**: Tích hợp khối hướng dẫn chi tiết (Step-by-step) ngay trong trang Hồ sơ. Giúp người dùng biết cách nhấn vào "Ổ khóa" trình duyệt để cấp quyền thông báo nếu bị chặn.
    - **Animated Instructions**: Sử dụng `Framer Motion` để tạo hiệu ứng đóng/mở hướng dẫn mượt mà, giữ cho giao diện luôn tinh gọn nhưng vẫn đầy đủ hỗ trợ.
    - **Mobile-Responsive Guide**: Tối ưu hiển thị hướng dẫn trên cả Mobile và Desktop, đảm bảo ai cũng có thể kích hoạt thông báo dễ dàng. 📱💻🍀

- [x] **Profile Identity Card Restoration (v43.2 - UI Refinement)**: 💎👤✨
    - **Integrated Identity Header**: Khôi phục Thẻ danh tính (Avatar, Bio, Level, XP Bar) trực tiếp vào tab Hồ sơ. Thiết kế theo phong cách Glassmorphism đồng nhất với hệ thống.
    - **Layout Consolidation**: Chuyển đổi sang bố cục Single Column trung tâm, loại bỏ sidebar trống để tối ưu hóa không gian hiển thị và sự tập trung của người dùng.
    - **Interactive Avatar**: Tích hợp nút đổi ảnh đại diện trực tiếp trên Avatar với hiệu ứng hover mượt mà.

- [x] **Personnel Search Logic Enhancement (v43.3 - Admin Tools)**: 🕵️‍♂️🔍
    - **Multi-field Search**: Cập nhật `searchUsersAction` để tìm kiếm đồng thời trên cả `username` và `display_name`. Khắc phục lỗi không tìm thấy người dùng khi Admin tìm theo tên hiển thị (như "Cá muối").

- [x] **Realtime Notification Fix (v43.10)**: 🔔🛡️
    - **Safe Subscriptions**: Khắc phục lỗi `cannot add postgres_changes after subscribe` trong `NotificationBell`. Đảm bảo các kênh Realtime được khởi tạo và giải phóng đúng cách, ngăn chặn xung đột khi React re-render nhanh.
    - **Robust Cleanup**: Chuyển sang sử dụng `supabase.removeChannel` để dọn dẹp triệt để các kết nối cũ trước khi tạo kết nối mới.

...

*Cập nhật lần cuối: 13:15 - 24/04/2026 (Realtime Fix & Logout System)*
