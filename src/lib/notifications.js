
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
      url: `https://shiroi-arika.vercel.app/manga/${mangaId}`
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
 * 🔗 Đăng ký Token vào một Topic (ví dụ: 'all_manga_updates')
 */
export async function subscribeTokenToTopic(token, topic) {
  if (!admin.apps.length) return { success: false, error: 'Firebase not initialized' };

  try {
    const response = await admin.messaging().subscribeToTopic(token, topic);
    console.log(`✅ Successfully subscribed to topic ${topic}:`, response);
    return { success: true };
  } catch (error) {
    console.error(`❌ Error subscribing to topic ${topic}:`, error);
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
        console.log(`🔔 [Notification] Đang tạo thông báo cho User: ${userId}, Type: ${type}`);
        
        const { data: notification, error } = await supabaseAdmin
            .from('shiroi_notifications')
            .insert([{
                user_id: userId,
                title,
                body,
                type,
                data: data || {}
            }])
            .select()
            .single();

        if (error) {
            console.error("❌ [Notification] Database Error:", {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint
            });
            throw error;
        }
        
        console.log("✅ [Notification] Tạo thông báo thành công:", notification.id);
        return { success: true, notification };
    } catch (err) {
        console.error("❌ [Notification] Critical Exception:", err.message);
        return { success: false, error: err.message };
    }
}
