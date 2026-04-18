
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
      mangaId: mangaId.toString(),
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

/**
 * 🔔 TẠO THÔNG BÁO TRONG ỨNG DỤNG (IN-APP)
 * Dành cho hệ thống Hộp thư thông báo trên Web 🍀
 */
export async function createInAppNotification(userId, title, body, type, data = {}) {
    const { supabaseAdmin } = await import('./supabaseAdmin');
    if (!supabaseAdmin) return { success: false, error: 'Supabase Admin not available' };

    try {
        const { data: notification, error } = await supabaseAdmin
            .from('shiroi_notifications')
            .insert([{
                user_id: userId,
                title,
                body,
                type,
                data
            }])
            .select()
            .single();

        if (error) throw error;
        return { success: true, notification };
    } catch (err) {
        console.error("❌ Error creating in-app notification:", err);
        return { success: false, error: err.message };
    }
}
