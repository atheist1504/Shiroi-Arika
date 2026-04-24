// 🍀 FIREBASE SERVICE WORKER - SHIROI ARIKA 🛡️
// File này tự động được Firebase Messaging sử dụng để hiển thị thông báo khi trình duyệt đang đóng.

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// 🔐 KHỞI TẠO FIREBASE TRONG SERVICE WORKER
// Chú ý: Các giá trị này khớp với cấu hình Firebase (v7+)
firebase.initializeApp({
    apiKey: "AIzaSyBzPZfQdLgWvcNF5Ph63bf7jrTn2vcgWVA",
    authDomain: "shiroi-arika.firebaseapp.com",
    projectId: "shiroi-arika",
    storageBucket: "shiroi-arika.firebasestorage.app",
    messagingSenderId: "101708955054",
    appId: "1:101708955054:web:e6968c5ac2d0d9b6f61c3f"
});

const messaging = firebase.messaging();

// 🔔 XỬ LÝ THÔNG BÁO KHI WEB ĐANG Ở TRẠNG THÁI NỀN (BACKGROUND)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Đã nhận thông báo Background 🍀:', payload);

  const notificationTitle = payload.notification?.title || "Thông báo mới từ Shiroi Arika";
  const notificationOptions = {
    body: payload.notification?.body || "Bạn có tin nhắn mới đang chờ! ✨",
    icon: '/og-banner-v8.png', 
    data: payload.data,
    badge: '/og-banner-v8.png',
    tag: payload.data?.tag || 'shiroi-notification'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 🖱️ XỬ LÝ KHI NGƯỜI DÙNG NHẤN VÀO THÔNG BÁO
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    // Deep-link đến trang cụ thể nếu có data.url
    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                // So sánh URL linh hoạt hơn (loại bỏ query params/hash nếu cần)
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
