'use server';

import { uploadToR2, getPresignedUploadUrl, deleteFolderFromR2 } from './r2';
import { supabase } from './supabase';
import { supabaseAdmin } from './supabaseAdmin';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { sendMangaNotification, createInAppNotification } from './notifications';
import { XP_REWARDS, getStreakBonus } from './xp';
import { getStartOfVNDay } from './missions';

/**
 * 🇻🇳 HÀM HELPER: Lấy thời gian hiện tại theo múi giờ Việt Nam (GMT+7)
 */
const getVietnamTime = () => {
  const now = new Date();
  return new Date(now.getTime() + (7 * 60 * 60 * 1000));
};

/**
 * 📊 SERVER ACTION: Lấy thông tin dung lượng đã sử dụng
 * Tính toán dựa trên cột size_kb trong bảng pages và mangas 🍀
 */
/**
 * 🔐 SERVER ACTION: Đăng nhập và tạo Session (Cookie)
 * Thay thế cho việc chỉ dùng LocalStorage ở Client 🍀
 */
export async function loginAction(username, password) {
  try {
    const hashPassword = (pwd) => btoa(pwd + "shiroi-secret-salt").split('').reverse().join('');
    const hashed = hashPassword(password);

    const { data: user, error } = await supabase
      .from('shiroi_users')
      .select('*')
      .ilike('username', username.trim())
      .single();

    if (error || !user) throw new Error('Không tìm thấy tài khoản Shiroi này!');
    
    if (user.password !== hashed && user.password !== password) {
       throw new Error('Mật khẩu chưa chính xác! 🛡️');
    }

    // ✅ TẠO SESSION BẰNG COOKIE (Hết hạn sau 7 ngày)
    cookies().set('shiroi_session', JSON.stringify({
      id: user.id,
      username: user.username,
      role: user.role || 'user'
    }), { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
      sameSite: 'lax'
    });

    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 🔐 SERVER ACTION: Đăng ký tài khoản mới và cấp Session
 * Đồng bộ hóa LocalStorage và Cookie ngay lập tức 🍀
 */
export async function signupAction(userData) {
  try {
    const { username, password } = userData;
    const hashPassword = (pwd) => btoa(pwd + "shiroi-secret-salt").split('').reverse().join('');
    const hashed = hashPassword(password);

    const client = getDbClient();

    // 1. Kiểm tra trùng lặp
    const { data: existing } = await client
      .from('shiroi_users')
      .select('username')
      .ilike('username', username.trim())
      .single();
    
    if (existing) throw new Error('Tên này đã có chủ nhân sở hữu rồi! 🏰');

    // 2. Tạo tài khoản
    const { data: newUser, error: signupError } = await client
      .from('shiroi_users')
      .insert([{
        ...userData,
        username: username.trim(),
        password: hashed,
        display_name: userData.display_name || username.trim(),
        xp: 0,
        level: 1,
        check_in_streak: 0
      }])
      .select()
      .single();

    if (signupError) throw signupError;

    // 3. TỰ ĐỘNG ĐĂNG NHẬP: Tạo Session bằng Cookie 🍪
    cookies().set('shiroi_session', JSON.stringify({
      id: newUser.id,
      username: newUser.username,
      role: newUser.role || 'user'
    }), { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
      sameSite: 'lax'
    });

    return { success: true, user: newUser };
  } catch (error) {
    console.error('❌ Lỗi signupAction:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 🕵️‍♂️ HÀM HỖ TRỢ: Lấy thông tin người dùng đang đăng nhập với khả năng tự khôi phục (Auto-healing) 🛡️
 */
export async function getAuthenticatedUser() {
  const sessionData = cookies().get('shiroi_session');
  if (!sessionData) return null;

  try {
    let user = JSON.parse(sessionData.value);
    
    // 🚑 CƠ CHẾ TỰ KHÔI PHỤC (AUTO-HEALING) ⚡
    // Chỉ truy vấn Database nếu session thiếu ID quan trọng của Admin whitelist 🍀
    if (!user.id && user.username?.toLowerCase() === 'atheist1504') {
      console.log(`🚑 [Auth] Phát hiện session thiếu ID cho Admin ${user.username}, đang khôi phục...`);
      const client = getDbClient();
      const { data, error } = await client
        .from('shiroi_users')
        .select('id, username, role')
        .eq('username', user.username)
        .single();
      
      if (!error && data) {
        user.id = data.id;
        user.role = data.role || 'admin';
        console.log(`✅ [Auth] Khôi phục ID thành công: ${user.id}`);
        
        // Cập nhật lại Cookie để lần sau không phải query nữa 🍪
        cookies().set('shiroi_session', JSON.stringify(user), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
          sameSite: 'lax'
        });
      }
    }

    return user.id ? user : null;
  } catch (err) {
    console.error("❌ Lỗi giải mã Session:", err.message);
    return null;
  }
}

/**
 * 🕵️‍♂️ HÀM HỖ TRỢ: Kiểm tra quyền Admin từ Cookie
 */
async function checkAdminAuth() {
  const user = await getAuthenticatedUser();
  if (!user) return false;
  
  // 🛡️ BẢO VỆ CHỦ SỞ HỮU: Whitelist tài khoản atheist1504 luôn có quyền admin 🍀
  if (user.username?.toLowerCase() === 'atheist1504') return true;
  return user.role === 'admin';
}

/**
 * 🛠️ HÀM HỖ TRỢ: Lấy Client DB phù hợp (Admin hoặc Anon dự phòng) 🛡️
 */
function getDbClient() {
  if (supabaseAdmin) return supabaseAdmin;
  console.warn("⚠️ [Auth] Không tìm thấy Admin Client, sử dụng Anon Client làm dự phòng.");
  return supabase;
}

/**
 * 📊 SERVER ACTION: Lấy thông tin dung lượng đã sử dụng
 */
export async function getStorageUsageAction() {
  console.log("📊 [Storage] Bắt đầu lấy thông số...");
  try {
    // 🛡️ Kiểm tra quyền (Silent check)
    const isAdmin = await checkAdminAuth().catch(err => {
      console.warn("⚠️ checkAdminAuth sập:", err.message);
      return false;
    });

    if (!isAdmin) {
      return { success: true, totalGB: 0, totalKB: 0, limitGB: 10, debug: "NOT_ADMIN" };
    }
    
    // 🛡️ Kiểm tra Client
    if (!supabaseAdmin) {
       return { success: true, totalGB: 0, totalKB: 0, limitGB: 10, debug: "NO_ADMIN_CLIENT" };
    }

    // 🛡️ 3. Tính toán dung lượng (Tối ưu hóa truy vấn) ⚡
    // Lấy toàn bộ size_kb thay vì giới hạn 1000 bản ghi để đảm bảo tính chuẩn xác
    const { data: pagesData, error: pagesError } = await supabaseAdmin
      .from('pages')
      .select('size_kb'); 
    
    if (pagesError) {
      console.warn("⚠️ Pages Query Error:", pagesError.message);
      return { success: true, totalGB: 0, totalKB: 0, limitGB: 10, debug: `PAGES_ERR_${pagesError.code}` };
    }
    
    const pagesTotal = (pagesData || []).reduce((sum, p) => sum + (Number(p.size_kb) || 150), 0);

    const { data: mangasData, error: mangasError } = await supabaseAdmin
      .from('mangas')
      .select('size_kb');
    
    let mangasTotal = 0;
    if (!mangasError && mangasData) {
        mangasTotal = mangasData.reduce((sum, m) => sum + (m.size_kb || 300), 0);
    }
    
    const totalKB = pagesTotal + mangasTotal;
    const totalGB = totalKB / (1024 * 1024);

    return { 
      success: true, 
      totalGB: parseFloat(totalGB.toFixed(3)), 
      totalKB, 
      limitGB: 10,
      debug: "OK"
    };
  } catch (error) {
    console.error("❌ Lỗi nặng getStorageUsageAction:", error.message);
    return { 
      success: true, 
      totalGB: 0, 
      totalKB: 0, 
      limitGB: 10, 
      debug: `CRASH_${error.message.substring(0, 20)}` 
    };
  }
}

/**
 * 🗑️ SERVER ACTION: Xóa trọn bộ truyện (Data + R2)
 */
export async function deleteMangaAction(mangaId) {
  try {
    if (!(await checkAdminAuth())) throw new Error("Dừng lại! Chỉ quản trị viên mới có quyền hành quyết này! 🛡️");
    const client = getDbClient();
    const { data: chapters, error: chapError } = await client.from('chapters').select('id').eq('manga_id', mangaId);
    if (chapError) throw chapError;

    if (chapters && chapters.length > 0) {
      for (const chap of chapters) {
        await deleteFolderFromR2(`chapters/${chap.id}/`);
      }
    }

    const chapterIds = chapters.map(c => c.id);
    if (chapterIds.length > 0) {
      await client.from('pages').delete().in('chapter_id', chapterIds);
      await client.from('chapters').delete().in('id', chapterIds);
    }
    
    const { error: mangaDelError } = await client.from('mangas').delete().eq('id', mangaId);
    if (mangaDelError) throw mangaDelError;

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 🎫 SERVER ACTION: Lấy vé tải ảnh lên R2 (Dành cho các file lớn hoặc hạ tầng có CORS)
 */
export async function getUploadUrlAction(fileName) {
  try {
    if (!(await checkAdminAuth())) throw new Error("Quyền hạn không đủ! 🛡️");
    if (!fileName) throw new Error('Thiếu tên tệp!');
    const data = await getPresignedUploadUrl(fileName);
    return { success: true, ...data };
  } catch (error) {
    console.error('Lỗi lấy Signed URL:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 🌩️ SERVER ACTION: Upload Chapter Page (Proxy Mode 🚀)
 * Khắc phục triệt để lỗi CORS bằng cách tải lên từ môi trường Server.
 */
export async function uploadChapterPageAction(formData) {
  try {
    if (!(await checkAdminAuth())) throw new Error("Quyền hạn không đủ! 🛡️");

    const file = formData.get('file');
    const fileName = formData.get('fileName');

    if (!file || !fileName) throw new Error("Thiếu dữ liệu upload!");

    const { uploadToR2 } = await import('./r2');
    const result = await uploadToR2(file, fileName);

    return { success: true, url: result };
  } catch (error) {
    console.error('❌ [Server] Lỗi uploadChapterPageAction:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 🌩️ SERVER ACTION: Upload Image to R2
 */
export async function uploadImageAction(formData) {
  try {
    if (!(await checkAdminAuth())) throw new Error("Quyền hạn không đủ! 🛡️");
    const file = formData.get('file');
    if (!file) throw new Error("Không tìm thấy file ảnh!");
    
    // Sử dụng helper uploadToR2 có sẵn
    const { uploadToR2 } = await import('./r2');
    const fileName = `covers/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const result = await uploadToR2(file, fileName);
    
    if (!result.success) throw new Error(result.error);
    return { success: true, url: result.url };
  } catch (error) {
    console.error('Lỗi uploadImageAction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 🔔 SERVER ACTION: Gửi thông báo chương mới
 * Xử lý cả Push Notification và In-app cho người theo dõi 🍀
 */
export async function notifyNewChapterAction(mangaId, mangaName, chapterNumber, coverImage) {
  try {
    const client = getDbClient();
    const title = `${mangaName} vừa có chương ${chapterNumber}! 📚`;
    
    // 1. Gửi Push Notification (Topic-based) 🌩️
    await sendMangaNotification(title, mangaName, mangaId, coverImage);

    // 2. Gửi In-app Notification cho toàn bộ người theo dõi 🔔
    const { data: followers } = await client
      .from('shiroi_follows')
      .select('user_id')
      .eq('manga_id', mangaId);
    
    if (followers && followers.length > 0) {
        const body = `Siêu phẩm "${mangaName}" vừa cập nhật chương ${chapterNumber}. Đọc ngay nào! 🚀`;
        const notifType = 'chapter_update';
        const notifData = { mangaId, chapterId: null, mangaName, chapterNumber }; // chapterId null as we might not have it here, but we have mangaId

        // Tạo thông báo trong ứng dụng cho từng follower (Xử lý hàng loạt) ⚡
        const notificationPromises = followers.map(f => 
            createInAppNotification(f.user_id, title, body, notifType, notifData)
        );
        await Promise.allSettled(notificationPromises);
    }

    return { success: true };
  } catch (error) {
    console.warn('⚠️ Lỗi gửi thông báo chương mới:', error);
    return { success: true }; 
  }
}

/**
 * 📊 SERVER ACTION: Ghi Log XP Bảo Mật
 */
export async function recordXpLogAction(userId, amount, type, reason = null) {
  try {
    if (!userId || userId === 'undefined' || !amount) {
      return { success: false, error: 'Thiếu định danh người dùng (User ID) hoặc thông số XP' };
    }
    
    const client = getDbClient();

    // 🛡️ KIỂM TRA GIỚI HẠN XP HÀNG NGÀY (CHỈ CHO BÌNH LUẬN) 🍀
    if (type === 'comment' || type === 'first_comment') {
        const startOfTodayISO = getStartOfVNDay().toISOString();

        const { data: todayLogs, error: logError } = await client
            .from('shiroi_xp_logs')
            .select('amount')
            .eq('user_id', userId)
            .in('type', ['comment', 'first_comment'])
            .gte('created_at', startOfTodayISO);

        if (!logError && todayLogs) {
            const totalToday = todayLogs.reduce((sum, log) => sum + (log.amount || 0), 0);
            const MAX_COMMENT_XP = 100; // Khớp với xp.js
            
            if (totalToday + amount > MAX_COMMENT_XP) {
                return { success: false, error: 'Đã đạt giới hạn XP bình luận trong ngày (100 XP)! 🛡️' };
            }
        }
    }
    
    const { error } = await client
      .from('shiroi_xp_logs')
      .insert({
        user_id: userId,
        amount: amount,
        type: type,
        reason: reason
      });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('❌ Lỗi recordXpLogAction:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 💎 SERVER ACTION: Cộng XP khi đọc chương (Bảo mật 🛡️)
 */
export async function addReadXPAction(mangaId, chapterId) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user || !user.id) {
       throw new Error("Phiên làm việc lỗi (Thiếu ID). Vui lòng đăng xuất và đăng nhập lại! 🛡️");
    }

    const userId = user.id;
    const client = getDbClient();
    // 1. Kiểm tra xem đã đọc chương này chưa (Tránh spam)
    const { data: alreadyRead } = await client
      .from('shiroi_read_chapters')
      .select('id')
      .eq('user_id', userId)
      .eq('chapter_id', chapterId)
      .single();

    if (alreadyRead) return { success: false, error: 'Đã nhận thưởng cho chương này' };

    // 3. Ghi log nhật ký (Database Trigger sẽ tự động cộng XP vào bảng Users) 🛡️
    await client.from('shiroi_read_chapters').insert({ 
      user_id: userId, 
      username: user.username, 
      chapter_id: chapterId, 
      manga_id: mangaId, 
      read_at: new Date().toISOString() 
    });
    
    // 4. Ghi log và nhận XP 💎
    const resLog = await recordXpLogAction(userId, 20, 'read', chapterId);
    if (!resLog.success) return resLog;

    const { data: updatedUser } = await client.from('shiroi_users').select('*').eq('id', userId).single();

    // 5. Kiểm tra hoàn thành nhiệm vụ Đọc truyện (Silent check) 🏆
    try {
        const { count: dailyRead } = await client
            .from('shiroi_read_chapters')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('read_at', getStartOfVNDay().toISOString());
        
        if (dailyRead === 1 || dailyRead === 3) {
            const mTitle = dailyRead === 1 ? "Độc hành giả I" : "Độc hành giả II";
            await createInAppNotification(userId, `Hoàn thành nhiệm vụ! 🎯`, `Bạn đã xong "${mTitle}". Hãy mở Kho thành tựu để nhận thưởng! 🍀`, 'system', { missionKey: dailyRead === 1 ? 'daily_read_1' : 'daily_read_3' });
        }
    } catch (e) {}

    return { success: true, xpGain: 20, user: updatedUser };
  } catch (error) {
    console.error('Lỗi addReadXPAction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 📅 SERVER ACTION: Điểm danh hàng ngày (Bảo mật 🛡️)
 */
export async function performCheckInAction() {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user || !user.id) {
       throw new Error("Phiên làm việc lỗi (Thiếu ID). Vui lòng đăng xuất và đăng nhập lại! 🛡️");
    }

    const userId = user.id;
    const client = getDbClient();
    // 1. Lấy trạng thái điểm danh hiện tại từ DB (Tránh hack thời gian ở Client)
    const { data: userData, error: fetchError } = await client
      .from('shiroi_users')
      .select('xp, last_check_in, check_in_streak')
      .eq('id', userId)
      .single();

    if (fetchError || !userData) throw new Error("Không tìm thấy thông tin người dùng");
    
    const startOfToday = getStartOfVNDay();
    const lastCheck = userData.last_check_in ? new Date(userData.last_check_in) : null;
    
    // 1. Kiểm tra xem đã điểm danh trong ngày hôm nay chưa (theo mốc 0h Việt Nam) 🇻🇳
    const isSameDay = lastCheck && lastCheck >= startOfToday;
 
    if (isSameDay) return { success: false, error: 'Bạn đã điểm danh hôm nay rồi!' };
 
    // 2. TÍNH TOÁN CHUỖI (STREAK) CHUẨN 🛡️
    let newStreak = 1;
    
    if (lastCheck) {
        // Tính khoảng cách ngày (dựa trên mốc 00:00:00 giờ VN)
        const lastCheckVnStr = new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Ho_Chi_Minh'}).format(lastCheck);
        const lastCheckDate = new Date(`${lastCheckVnStr}T00:00:00+07:00`);
        
        const nowDate = startOfToday;
        const diffTime = Math.abs(nowDate - lastCheckDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
 
        if (diffDays === 1) {
            // Điểm danh liên tiếp -> Tăng chuỗi 🍀
            newStreak = (userData.check_in_streak || 0) + 1;
        } else if (diffDays > 1) {
            // Nghỉ quá 1 ngày -> Reset chuỗi về 1 🌵
            newStreak = 1;
        } else {
            // Trường hợp hy hữu (lệch giờ) -> Giữ nguyên hoặc tăng 1
            newStreak = (userData.check_in_streak || 0) + 1;
        }
    }
 
    // 🔄 RESET CHUỖI KHI SANG THÁNG MỚI (Nếu bạn muốn chuỗi reset theo tháng Leaderboard)
    // Nếu bạn muốn chuỗi là xuyên suốt đời người thì có thể bỏ qua bước này.
    /*
    if (lastCheck && (lastCheck.getUTCMonth() !== now.getUTCMonth() || lastCheck.getUTCFullYear() !== now.getUTCFullYear())) {
        newStreak = 1;
    }
    */

    // 🏆 TÍNH TOÁN XP THƯỞNG (100 XP MẶC ĐỊNH + BONUS CHUỖI) 💎
    const xpGain = (XP_REWARDS.DAILY_CHECKIN || 100) + getStreakBonus(newStreak);

    // 3. Ghi log nhật ký ĐIỂM DANH (Sử dụng 'check_in' có gạch dưới chuẩn hóa) 📅
    const resLog = await recordXpLogAction(userId, xpGain, 'check_in', `Streak: ${newStreak}`);
    
    if (!resLog.success) {
        return { success: false, error: resLog.error || 'Lỗi điểm danh!' };
    }

    // Cập nhật các thông tin khác (streak, ngày điểm danh) - XP sẽ do Trigger lo 🛡️
    const { data: updatedUser, error: updateError } = await client
      .from('shiroi_users')
      .update({
        last_check_in: new Date().toISOString(),
        check_in_streak: newStreak
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) throw updateError;
    
    // 🔔 Gửi thông báo trong ứng dụng (Silent fail)
    try {
        const title = `Điểm Danh Thành Công! 📅`;
        const body = `Bạn vừa nhận được ${xpGain} XP (Chuỗi: ${newStreak} ngày). 🍀`;
        await createInAppNotification(userId, title, body, 'system', { streak: newStreak });
    } catch (e) {}

    return { success: true, user: updatedUser, xpGain };
  } catch (error) {
    console.error('Lỗi performCheckInAction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 📚 SERVER ACTION: Lưu hoặc Cập nhật Manga (Bảo mật 🛡️)
 */
export async function saveMangaAction(mangaData, mangaId = null) {
  try {
    // 1. Kiểm tra Admin Auth
    const isAdmin = await checkAdminAuth().catch(() => false);
    if (!isAdmin) throw new Error("Quyền hạn không đủ! 🛡️");
    
    const client = getDbClient();

    if (mangaId) {
      console.log(`[Admin] Cập nhật truyện ID: ${mangaId}`);
      // Cập nhật
      const { data, error } = await client
        .from('mangas')
        .update({
          ...mangaData
        })
        .eq('id', mangaId)
        .select()
        .single();
      
      if (error) {
        console.error("❌ Lỗi Update Manga:", error);
        throw error;
      }
      return { success: true, data };
    } else {
      console.log(`[Admin] Tạo truyện mới: ${mangaData.title}`);
      // Thêm mới
      const { data, error } = await client
        .from('mangas')
        .insert([{
          ...mangaData
        }])
        .select()
        .single();
      
      if (error) {
        console.error("❌ Lỗi Insert Manga:", error);
        throw error;
      }
      return { success: true, data };
    }
  } catch (error) {
    console.error('❌ Lỗi saveMangaAction:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 📤 SERVER ACTION: Đăng chương mới (Bảo mật 🛡️)
 * Xử lý: Insert Chapter -> Insert Pages -> Send Notification
 */
export async function publishChapterAction(mangaId, mangaTitle, chapterData, pagesData, coverImage) {
  try {
    // 1. Kiểm tra quyền Admin
    if (!(await checkAdminAuth())) throw new Error("Quyền hạn không đủ! 🛡️");

    const client = getDbClient();
    // 2. Insert Chapter
    const { data: chapter, error: chapterError } = await client
      .from('chapters')
      .insert([chapterData])
      .select()
      .single();

    if (chapterError) throw chapterError;

    // 3. Insert Pages
    const pagesWithChapterId = pagesData.map(page => ({
        ...page,
        chapter_id: chapter.id
    }));

    const { error: pagesError } = await client
      .from('pages')
      .insert(pagesWithChapterId);

    if (pagesError) throw pagesError;

    // 4. Gửi thông báo tự động (Silent fail - không làm chết luồng upload) 🔔🍀
    try {
        const title = `Chương ${chapter.chapter_number} vừa ra mắt! 📚`;
        
        // A. Gửi Push Broadcast (Topic)
        await sendMangaNotification(title, mangaTitle, mangaId, coverImage);

        // B. Gửi In-app Notification cho toàn bộ người theo dõi
        const { data: followers } = await client
            .from('shiroi_follows')
            .select('user_id')
            .eq('manga_id', mangaId);
        
        if (followers && followers.length > 0) {
            const body = `Siêu phẩm "${mangaTitle}" vừa cập nhật chương ${chapter.chapter_number}. Đọc ngay nào!`;
            const notifType = 'chapter_update';
            const notifData = { mangaId, chapterId: chapter.id, mangaName: mangaTitle, chapterNumber: chapter.chapter_number };

            // Tạo thông báo trong ứng dụng cho từng follower
            const notificationPromises = followers.map(f => 
                createInAppNotification(f.user_id, title, body, notifType, notifData)
            );
            await Promise.allSettled(notificationPromises);
        }
    } catch (notifyErr) {
        console.warn("Lỗi gửi thông báo (bỏ qua):", notifyErr);
    }

    return { success: true, chapterId: chapter.id };
  } catch (error) {
    console.error('Lỗi publishChapterAction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 📝 SERVER ACTION: Lưu dữ liệu chương và các trang (Bảo mật 🛡️)
 */
export async function saveChapterDataAction(chapterPayload, pagesData, isEditing, existingChapterId = null) {
  console.log(`🚀 [Server] Bắt đầu lưu chương - Editing: ${isEditing}, ChapID: ${existingChapterId}`);
  try {
    const isAdmin = await checkAdminAuth().catch(() => false);
    if (!isAdmin) throw new Error("Quyền hạn không đủ! 🛡️");

    const client = getDbClient();
    let chapId = existingChapterId;

    // 1. Xử lý Chapter (Dùng UPSERT để an toàn tuyệt đối) 🛡️
    const chapterToSave = {
      ...chapterPayload
    };

    if (!isEditing) {
       // Nếu là tạo mới, kiểm tra trùng lặp theo số chương
       const { data: existing } = await client
         .from("chapters")
         .select("id")
         .eq("manga_id", chapterPayload.manga_id)
         .eq("chapter_number", chapterPayload.chapter_number)
         .maybeSingle();
       
       if (existing) {
         console.log("♻️ [Server] Đã tìm thấy chương tương ứng, thực hiện cập nhật ghi đè.");
         chapId = existing.id;
       }
    }

    if (chapId) {
        const { error: upError } = await client
          .from("chapters")
          .update(chapterToSave)
          .eq("id", chapId);
        if (upError) throw new Error(`Lỗi cập nhật Chapter: ${upError.message}`);
    } else {
        const { data: newChap, error: inError } = await client
          .from("chapters")
          .insert([chapterToSave])
          .select()
          .single();
        if (inError) throw new Error(`Lỗi tạo mới Chapter: ${inError.message}`);
        chapId = newChap.id;
    }

    console.log(`✅ [Server] Chapter ${chapId} OK. Đang lưu ${pagesData.length} trang truyện...`);

    // 2. Xóa các trang cũ (ghi đè) 🧹
    await client.from("pages").delete().eq("chapter_id", chapId);

    // 3. Chèn các trang mới (Batch Insert) ⚡
    const pagesWithId = pagesData.map(p => ({ 
      ...p, 
      chapter_id: chapId
    }));

    const { error: pagesError } = await client.from("pages").insert(pagesWithId);
    if (pagesError) throw new Error(`Lỗi lưu Pages: ${pagesError.message}`);

    // ⚡ XÓA CACHE ĐỂ ĐƯA DATA MỚI LÊN READER NGAY LẬP TỨC 🍀
    revalidatePath(`/read/${chapId}`);
    revalidatePath(`/manga/${chapterPayload.manga_id}`);
    revalidatePath('/');

    return { success: true, chapterId: chapId };
  } catch (error) {
    console.error('❌ [Server] LỖI saveChapterDataAction:', error.message);
    return { success: false, error: error.message || "Lỗi Server Action" };
  }
}

/**
 * 💖 SERVER ACTION: Theo dõi / Bỏ theo dõi truyện (Bảo mật 🛡️)
 */
export async function toggleFollowAction(mangaId, isFollowed) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user || !user.id) {
       throw new Error("Phiên làm việc lỗi (Thiếu ID). Vui lòng đăng xuất và đăng nhập lại! 🛡️");
    }

    const userId = user.id;
    const client = getDbClient();

    if (!isFollowed) {
      // Tiến hành Follow
      const { error } = await client
        .from('shiroi_follows')
        .insert({ user_id: userId, manga_id: mangaId });
      
      if (error) throw error;
      return { success: true, followed: true };
    } else {
      // Tiến hành Unfollow
      const { error } = await client
        .from('shiroi_follows')
        .delete()
        .eq('user_id', userId)
        .eq('manga_id', mangaId);
      
      if (error) throw error;
      return { success: true, followed: false };
    }
  } catch (error) {
    console.error('Lỗi toggleFollowAction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 🎁 SERVER ACTION: Bốc quà may mắn hàng ngày (Bảo mật 🛡️)
 */
export async function performLuckyDrawAction() {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user || !user.id) {
       throw new Error("Phiên làm việc lỗi (Thiếu ID). Vui lòng đăng xuất và đăng nhập lại! 🛡️");
    }

    const userId = user.id;
    const client = getDbClient();

    // 1. Tính toán phần thưởng ngẫu nhiên (Gacha logic)
    const tiers = [10, 20, 30, 40, 50, 100, 500];
    const weights = [40, 30, 15, 8, 4, 2.5, 0.5]; // Tổng = 100%
    
    let randomValue = Math.random() * 100;
    let sum = 0;
    let xpGain = 10; // Mặc định

    for (let i = 0; i < tiers.length; i++) {
      sum += weights[i];
      if (randomValue <= sum) {
        xpGain = tiers[i];
        break;
      }
    }

    // 2. Ghi vào Nhật ký (Database Unique Index sẽ chặn nếu bốc lần 2)
    const resLog = await recordXpLogAction(userId, xpGain, 'lucky_draw', `May mắn hàng ngày: +${xpGain} XP`);
    
    if (!resLog.success) {
      if (resLog.error?.includes('duplicate key') || resLog.error?.includes('23505')) {
         return { success: false, error: 'Hôm nay vận may đã cạn, hãy quay lại vào ngày mai! 💮' };
      }
      return { success: false, error: resLog.error || 'Lỗi bốc quà!' };
    }

    // 3. Cập nhật thời gian bốc quà cuối cùng vào bảng Users 🛡️
    const { data: updatedUser, error: upError } = await client
      .from('shiroi_users')
      .update({ last_lucky_draw: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (upError) {
       console.warn("⚠️ [Server] Không thể cập nhật last_lucky_draw (vẫn cộng điểm xong):", upError.message);
    }

    // Thành công! Trigger sẽ tự động cộng điểm vào bảng Users.
    // 🔔 Gửi thông báo trong ứng dụng (Silent fail)
    try {
        const title = `Bốc Quà May Mắn! 🎁`;
        const body = `Chúc mừng! Bạn vừa nhận được ${xpGain} XP từ Hộp Quà Shiroi. 🍀`;
        await createInAppNotification(userId, title, body, 'system', { xpGain });
    } catch (e) {}

    return { success: true, xpGain, user: updatedUser };
  } catch (error) {
    console.error('Lỗi performLuckyDrawAction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 🚩 SERVER ACTION: Gửi báo cáo lỗi chương
 */
export async function submitReportAction(reportData) {
  try {
    const user = await getAuthenticatedUser();
    const client = getDbClient();

    const { error } = await client
      .from('shiroi_reports')
      .insert([{
        ...reportData,
        user_id: user?.id || null,
        status: 'pending'
      }]);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Lỗi submitReportAction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 🕵️‍♂️ SERVER ACTION: Lấy danh sách báo cáo (Chỉ Admin)
 */
export async function getReportsAction() {
  try {
    if (!(await checkAdminAuth())) throw new Error("Quyền hạn không đủ! 🛡️");
    const client = getDbClient();

    const { data, error } = await client
      .from('shiroi_reports')
      .select(`
        *,
        mangas(title),
        chapters(chapter_number),
        shiroi_users(username)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, reports: data };
  } catch (error) {
    console.error('Lỗi getReportsAction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 🛠️ SERVER ACTION: Cập nhật trạng thái báo cáo (Chỉ Admin)
 */
export async function updateReportStatusAction(reportId, status) {
  try {
    if (!(await checkAdminAuth())) throw new Error("Quyền hạn không đủ! 🛡️");
    const client = getDbClient();

    const { error } = await client
      .from('shiroi_reports')
      .update({ status })
      .eq('id', reportId);

    if (error) throw error;
    
    revalidatePath('/admin/reports');
    return { success: true };
  } catch (error) {
    console.error('Lỗi updateReportStatusAction:', error);
    return { success: false, error: error.message };
  }
}
/**
 * 🎯 SERVER ACTION: Nhận thưởng nhiệm vụ (Bảo mật 🛡️)
 */
export async function claimMissionRewardAction(missionKey, mangaId = null) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !user.id) throw new Error("Vui lòng đăng nhập để nhận thưởng! 🍀");

    const userId = user.id;
    const client = getDbClient();

    // 1. Kiểm tra xem đã nhận thưởng chưa (Tránh double claim)
    const { MISSIONS } = await import('./missions');
    const mission = MISSIONS[missionKey];
    const isDaily = mission?.type === 'daily';

    let query = client
      .from('shiroi_mission_claims')
      .select('id, claimed_at')
      .eq('user_id', userId)
      .eq('mission_key', missionKey);

    if (isDaily) {
        // Nếu là nhiệm vụ hàng ngày: Chỉ tính lượt nhận trong hôm nay (Mốc 0h Việt Nam) 🇻🇳
        const startOfTodayISO = getStartOfVNDay().toISOString();
        query = query.gte('claimed_at', startOfTodayISO);
    }

    const { data: existing } = await query.maybeSingle();

    if (existing) {
        throw new Error(isDaily ? "Hôm nay bạn đã nhận thưởng nhiệm vụ này rồi! Hãy quay lại vào ngày mai 🛡️" : "Bạn đã nhận phần thưởng này rồi! 🛡️");
    }

    // 2. Lấy định nghĩa nhiệm vụ để xác định XP (Tránh Client gửi XP láo)
    let rewardXp = 0;
    
    if (missionKey.startsWith('conqueror_')) {
        rewardXp = 10000;
    } else if (missionKey.startsWith('finish_series_')) {
        // Phân loại Tier cho bộ truyện đã hoàn thành
        const mangaIdFromKey = missionKey.replace('finish_series_', '');
        
        // 1. Kiểm tra số chương thực tế
        const { count } = await client.from('chapters').select('id', { count: 'exact', head: true }).eq('manga_id', mangaIdFromKey);
        const total = count || 0;

        // 2. Kiểm tra thể loại One-shot
        const { data: manga } = await client.from('mangas').select('genres').eq('id', mangaIdFromKey).single();
        const isOneShotGenre = manga?.genres?.some(g => {
            const normalized = g.toLowerCase().replace(/[^a-z]/g, '');
            return normalized.includes('oneshot');
        });

        if (total <= 1 || isOneShotGenre) {
            throw new Error("Truyện One-shot không áp dụng phần thưởng Chinh phục! 🛡️");
        }

        // 3. Kiểm tra số lượng đã đọc
        const { count: n } = await client.from('shiroi_read_chapters').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('manga_id', mangaIdFromKey);
        
        if (n < 20) rewardXp = 200;
        else if (n < 50) rewardXp = 500;
        else if (n < 100) rewardXp = 1000;
        else rewardXp = 2000;

    } else {
        const mission = MISSIONS[missionKey];
        if (!mission) throw new Error("Nhiệm vụ không tồn tại! 🕵️‍♂️");
        rewardXp = mission.xp;
    }

    // 3. Ghi log nhận thưởng (Atomic operation)
    const { error: claimError } = await client
      .from('shiroi_mission_claims')
      .insert([{
        user_id: userId,
        mission_key: missionKey,
        manga_id: mangaId,
        reward_xp: rewardXp
      }]);

    if (claimError) throw claimError;

    // 4. Ghi log XP (Trigger sẽ tự cộng cho user)
    const resLog = await recordXpLogAction(userId, rewardXp, 'mission', missionKey);
    if (!resLog.success) throw new Error(resLog.error);

    const { data: updatedUser } = await client.from('shiroi_users').select('*').eq('id', userId).single();

    // 5. Gửi thông báo trong ứng dụng (Silent fail) 🔔🍀
    try {
        const title = `Nhận thưởng thành công! 💎`;
        const body = `Bạn vừa nhận được ${rewardXp} XP từ nhiệm vụ ${mission?.title || 'Chinh phục'}.`;
        await createInAppNotification(userId, title, body, 'system', { missionKey });
    } catch (e) {
        console.warn("⚠️ [Notification] Lỗi gửi thông báo nhận thưởng:", e.message);
    }

    return { success: true, rewardXp, user: updatedUser };
  } catch (error) {
    console.error('❌ Lỗi claimMissionRewardAction:', error.message);
    return { success: false, error: error.message };
  }
}
/**
 * 📝 SERVER ACTION: Gửi bình luận và xử lý thông báo phản hồi (Real-time Readiness) 💬🍀
 */
export async function addCommentAction(commentData) {
    try {
      const user = await getAuthenticatedUser();
      if (!user || !user.id) throw new Error("Vui lòng đăng nhập để bình luận! 🛡️");
  
      const client = getDbClient();
      const userId = user.id;

      let m_id = commentData.manga_id || null;
      let c_id = commentData.chapter_id || null;
      const parent_id = commentData.parent_id || null;

      if (parent_id && (!m_id || !c_id)) {
          try {
              const { data: p } = await client.from('comments').select('manga_id, chapter_id').eq('id', parent_id).single();
              if (p) {
                  m_id = m_id || p.manga_id;
                  c_id = c_id || p.chapter_id;
              }
          } catch (e) {}
      }
      
      const { data: insertData, error: commentError } = await client
        .from('comments')
        .insert([{
          manga_id: m_id,
          chapter_id: c_id,
          parent_id: parent_id,
          content: commentData.content,
          user_id: userId,
          user_name: user.display_name || user.username
        }])
        .select();
  
      if (commentError) throw commentError;
      const newComment = insertData && insertData.length > 0 ? insertData[0] : null;
  
      if (parent_id) {
          try {
              const { data: parentComment } = await client.from('comments').select('user_id, user_name').eq('id', parent_id).single();
              if (parentComment && parentComment.user_id !== userId) {
                  const title = `${user.display_name || user.username} đã phản hồi bình luận của bạn! 💬`;
                  const body = `"${commentData.content.substring(0, 50)}${commentData.content.length > 50 ? '...' : ''}"`;
                  const notifType = 'reply';
                  const notifData = { 
                      commentId: newComment?.id || null, 
                      parentId: parent_id,
                      mangaId: m_id,
                      chapterId: c_id
                  };
  
                  await createInAppNotification(parentComment.user_id, title, body, notifType, notifData);
              }
          } catch (notifErr) {
              console.warn("⚠️ Lỗi thông báo:", notifErr.message);
          }
      }
  
      // 🔔 Kiểm tra hoàn thành nhiệm vụ Bình luận (Silent check) 🏆
      try {
          const { count: dailyComment } = await client
              .from('comments')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', userId)
              .gte('created_at', getStartOfVNDay().toISOString());
          
          if (dailyComment === 1) {
              await createInAppNotification(userId, `Hoàn thành nhiệm vụ! 🎯`, `Bạn đã xong "Thảo luận viên". Hãy mở Kho thành tựu để nhận thưởng! 🍀`, 'system', { missionKey: 'daily_comment_1' });
          }
      } catch (e) {}

      return { success: true, comment: newComment };
    } catch (error) {
      console.error("❌ Lỗi addCommentAction:", error.message);
      return { success: false, error: error.message };
    }
}

export async function getNotificationsAction(limit = 20, offset = 0) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return { success: false, error: 'Chưa đăng nhập' };

        // 🛡️ SỬ DỤNG ADMIN CLIENT ĐỂ BYPASS RLS (Do hệ thống Custom Auth) 🍀
        const { data, error } = await supabaseAdmin
            .from('shiroi_notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        return { success: true, notifications: data };
    } catch (error) {
        console.error('❌ Lỗi getNotificationsAction:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * 🔔 SERVER ACTION: Đánh dấu thông báo đã đọc
 */
export async function markNotificationAsReadAction(notificationId) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return { success: false, error: 'Chưa đăng nhập' };

        const { error } = await supabaseAdmin
            .from('shiroi_notifications')
            .update({ is_read: true })
            .eq('id', notificationId)
            .eq('user_id', user.id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('❌ Lỗi markNotificationAsReadAction:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * 🔔 SERVER ACTION: Đánh dấu tất cả thông báo là đã đọc
 */
export async function markAllNotificationsAsReadAction() {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return { success: false, error: 'Chưa đăng nhập' };

        const { error } = await supabaseAdmin
            .from('shiroi_notifications')
            .update({ is_read: true })
            .eq('user_id', user.id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('❌ Lỗi markAllNotificationsAsReadAction:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * 📱 SERVER ACTION: Lưu FCM Token của thiết bị
 */
export async function saveFcmTokenAction(token, platform = 'web') {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return { success: false, error: 'Chưa đăng nhập' };

        const client = getDbClient();
        
        // Upsert token: Nếu tồn tại thì cập nhật last_seen_at (tự động qua trigger)
        const { error } = await client
            .from('shiroi_fcm_tokens')
            .upsert({ 
                user_id: user.id, 
                token: token,
                platform: platform
            }, { onConflict: 'token' });

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Lỗi saveFcmTokenAction:', error);
        return { success: false, error: error.message };
    }
}

/**
 * ?? SERVER ACTION: T? d?ng x�a th�ng b�o cu hon 1 tu?n
 */
export async function cleanupNotificationsAction() {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return { success: false, error: 'Chua dang nh?p' };

        const ONE_WEEK_AGO = new Date();
        ONE_WEEK_AGO.setDate(ONE_WEEK_AGO.getDate() - 7);

        const { error, count } = await supabaseAdmin
            .from('shiroi_notifications')
            .delete({ count: 'exact' })
            .eq('user_id', user.id)
            .lt('created_at', ONE_WEEK_AGO.toISOString());

        if (error) throw error;
        return { success: true, deletedCount: count };
    } catch (error) {
        console.error('? L?i cleanupNotificationsAction:', error.message);
        return { success: false, error: error.message };
    }
}
