import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const script = `
    importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

    const firebaseConfig = ${JSON.stringify(firebaseConfig)};

    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    // 🔔 Xử lý thông báo khi ứng dụng đang chạy ngầm hoặc đóng tab
    messaging.onBackgroundMessage((payload) => {
        console.log('[firebase-messaging-sw.js] Nhận thông báo ngầm:', payload);
        
        const notificationTitle = payload.notification?.title || 'Thông báo mới từ Shiroi Arika';
        const notificationOptions = {
            body: payload.notification?.body || 'Bạn có cập nhật mới!',
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            data: payload.data
        };

        self.registration.showNotification(notificationTitle, notificationOptions);
    });
  `;

  return new NextResponse(script, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
