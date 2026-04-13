
// 🔔 SHIROI NOTIFICATION SERVICE (FCM) 🍀
// Chú ý: Cần cài đặt 'firebase-admin' nếu chưa có.
// Chạy lệnh: npm install firebase-admin

import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    // Ưu tiên dùng Biến môi trường để bảo mật 🛡️
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
    
    if (Object.keys(serviceAccount).length > 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log("🔥 Firebase Admin initialized successfully!");
    } else {
      console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT_KEY is missing. Notifications will be disabled.");
    }
  } catch (error) {
    console.error("❌ Firebase Auth Error:", error.message);
  }
}

/**
 * 🚀 Gửi thông báo đến toàn bộ người dùng quan tâm qua Topic 'all_manga_updates'
 */
export async function sendMangaNotification(title, mangaName, mangaId, coverImage) {
  if (!admin.apps.length) return { success: false, error: 'Firebase not initialized' };

  const message = {
    notification: {
      title: title || 'Có chương mới! 📚',
      body: `Siêu phẩm "${mangaName}" vừa cập nhật chương mới. Đọc ngay tại Shiroi Arika 🍀`,
      image: coverImage
    },
    data: {
      mangaId: mangaId,
      url: `https://shiroiarika.vercel.app/manga/${mangaId}`
    },
    topic: 'all_manga_updates'
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('✅ Successfully sent notification:', response);
    return { success: true, response };
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    return { success: false, error: error.message };
  }
}
