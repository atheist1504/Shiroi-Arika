// 🍀 FIREBASE SERVICE WORKER - SHIROI ARIKA 🛡️
// File này tự động được Firebase Messaging sử dụng để hiển thị thông báo khi trình duyệt đang đóng.

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// 🔐 KHỞI TẠO FIREBASE TRONG SERVICE WORKER
// Chú ý: Các giá trị này phải khớp với Firebase App của bạn
firebase.initializeApp({
    apiKey: "YOUR_API_KEY",
    authDomain: "shiroi-arika.firebaseapp.com",
    projectId: "shiroi-arika",
    storageBucket: "shiroi-arika.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
});

const messaging = firebase.messaging();

// 🔔 XỬ LÝ THÔNG BÁO KHI WEB ĐANG Ở TRẠNG THÁI NỀN (BACKGROUND)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Đã nhận thông báo Background 🍀:', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/og-banner-v8.png', // Hoặc icon mặc định của bạn
    data: payload.data
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
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
