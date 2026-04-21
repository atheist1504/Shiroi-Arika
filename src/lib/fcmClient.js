'use client';

import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { registerFcmTokenAction, subscribeToTopicAction } from './actions';

// 🍀 CẤU HÌNH FIREBASE CLIENT
// Các giá trị này nên được lấy từ biến môi trường NEXT_PUBLIC_
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Khởi tạo Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

/**
 * 🚀 YÊU CẦU QUYỀN THÔNG BÁO & LẤY TOKEN
 */
export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn("Trình duyệt không hỗ trợ thông báo.");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('✅ Quyền thông báo đã được cấp!');
      
      const messaging = getMessaging(app);
      
      // Lấy Token từ Firebase
      // VAPID KEY: Lấy từ Firebase Console -> Project Settings -> Cloud Messaging -> Web Configuration
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
      });

      if (token) {
        console.log('🎫 FCM Token:', token);
        // Lưu token lên Server
        await registerFcmTokenAction(token);
        // Đăng ký Topic để nhận thông báo khi có truyện mới 📚
        await subscribeToTopicAction(token, 'all_manga_updates');
        return token;
      } else {
        console.warn('⚠️ Không thể lấy được FCM Token.');
      }
    } else {
      console.warn('❌ Quyền thông báo bị từ chối.');
    }
  } catch (error) {
    console.error('❌ Lỗi yêu cầu quyền thông báo:', error);
  }
  return null;
}

/**
 * 🔔 LẮNG NGHE THÔNG BÁO KHI ĐANG MỞ WEB (FOREGROUND)
 */
export function onMessageListener() {
  if (typeof window === 'undefined') return;
  
  const messaging = getMessaging(app);
  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log("🔔 Nhận thông báo Foreground:", payload);
      resolve(payload);
    });
  });
}
