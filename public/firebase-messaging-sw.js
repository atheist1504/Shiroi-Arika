importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// 🍀 FIREBASE CONFIG (Placeholder - Cần được điền từ môi trường)
const firebaseConfig = {
    apiKey: "AIzaSyBzPZfQdLgWvcNF5Ph63bf7jrTn2vcgWVA",
    authDomain: "shiroi-arika.firebaseapp.com",
    projectId: "shiroi-arika",
    storageBucket: "shiroi-arika.firebasestorage.app",
    messagingSenderId: "101708955054",
    appId: "1:101708955054:web:e6968c5ac2d0d9b6f61c3f"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// 🔔 Xử lý thông báo khi tab đang đóng
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/favicon.ico',
        data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
