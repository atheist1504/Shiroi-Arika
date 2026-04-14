'use server';

import { uploadToR2, getPresignedUploadUrl, deleteFolderFromR2 } from './r2';
import { supabase } from './supabase';
import { supabaseAdmin } from './supabaseAdmin';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { sendMangaNotification } from './notifications';

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
 * 🕵️‍♂️ HÀM HỖ TRỢ: Kiểm tra quyền Admin từ Cookie
 */
async function checkAdminAuth() {
  const sessionData = cookies().get('shiroi_session');
  if (!sessionData) return false;
  try {
    const user = JSON.parse(sessionData.value);
    // 🛡️ BẢO VỆ CHỦ SỞ HỮU: Whitelist tài khoản atheist1504 luôn có quyền admin 🍀
    if (user.username?.toLowerCase() === 'atheist1504') return true;
    return user.role === 'admin';
  } catch {
    return false;
  }
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

    const { data: pagesData, error: pagesError } = await supabaseAdmin.from('pages').select('size_kb').limit(1000);
    
    if (pagesError) {
      console.warn("⚠️ Pages Query Error:", pagesError.message);
      return { success: true, totalGB: 0, totalKB: 0, limitGB: 10, debug: `PAGES_ERR_${pagesError.code}` };
    }
    
    const pagesTotal = (pagesData || []).reduce((sum, p) => sum + (p.size_kb || 150), 0);

    const { data: mangasData, error: mangasError } = await supabaseAdmin.from('mangas').select('size_kb');
    
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
 * 🎫 SERVER ACTION: Lấy vé tải ảnh lên R2
 */
export async function getUploadUrlAction(fileName) {
  try {
    if (!fileName) throw new Error('Thiếu tên tệp!');
    const data = await getPresignedUploadUrl(fileName);
    return { success: true, ...data };
  } catch (error) {
    console.error('Lỗi lấy Signed URL:', error);
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
 */
export async function notifyNewChapterAction(mangaId, mangaName, chapterNumber, coverImage) {
  try {
    // 🔔 Gửi thông báo qua hệ thống (Silent check)
    const title = `${mangaName} vừa có chương ${chapterNumber}! 📚`;
    await sendMangaNotification(title, mangaName, mangaId, coverImage);
    return { success: true };
  } catch (error) {
    console.warn('Lỗi gửi thông báo (không chặn luồng):', error);
    return { success: true }; // Trả về true để không làm hỏng trải nghiệm người dùng
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
        const now = getVietnamTime();
        const startOfDay = new Date(now.setUTCHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(now.setUTCHours(23, 59, 59, 999)).toISOString();

        const { data: todayLogs, error: logError } = await client
            .from('shiroi_xp_logs')
            .select('amount')
            .eq('user_id', userId)
            .in('type', ['comment', 'first_comment'])
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay);

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
    const sessionData = cookies().get('shiroi_session');
    if (!sessionData) throw new Error("Vui lòng đăng nhập lại để nhận XP! 🛡️");

    const session = JSON.parse(sessionData.value);
    const userId = session?.id;

    if (!userId) {
       throw new Error("Phiên làm việc lỗi (Thiếu ID). Vui lòng đăng xuất và đăng nhập lại! 🛡️");
    }

    const client = getDbClient();
    // 1. Kiểm tra xem đã đọc chương này chưa (Tránh spam)
    const { data: alreadyRead } = await client
      .from('shiroi_read_chapters')
      .select('id')
      .eq('user_id', userId)
      .eq('chapter_id', chapterId)
      .single();

    if (alreadyRead) return { success: false, error: 'Đã nhận thưởng cho chương này' };

    // 2. Lấy XP hiện tại
    const { data: user } = await client.from('shiroi_users').select('xp').eq('id', userId).single();
    const newXP = (user?.xp || 0) + 20; // 20 XP cho mỗi chương

    // 3. Cập nhật XP và Ghi log (Atomic-ish)
    await client.from('shiroi_users').update({ xp: newXP }).eq('id', userId);
    await client.from('shiroi_read_chapters').insert({ 
      user_id: userId, 
      username: session.username, 
      chapter_id: chapterId, 
      manga_id: mangaId, 
      read_at: new Date().toISOString() 
    });
    // 4. Ghi log nhật ký
    await recordXpLogAction(userId, 20, 'read', chapterId);

    return { success: true, newXP };
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
    const sessionData = cookies().get('shiroi_session');
    if (!sessionData) throw new Error("Vui lòng đăng nhập lại để điểm danh! 🛡️");

    const session = JSON.parse(sessionData.value);
    const userId = session?.id;

    if (!userId) {
       throw new Error("Phiên làm việc lỗi (Thiếu ID). Vui lòng đăng xuất và đăng nhập lại! 🛡️");
    }

    const client = getDbClient();
    // 1. Lấy trạng thái điểm danh hiện tại từ DB (Tránh hack thời gian ở Client)
    const { data: user, error: fetchError } = await client
      .from('shiroi_users')
      .select('xp, last_check_in, check_in_streak')
      .eq('id', userId)
      .single();

    if (fetchError || !user) throw new Error("Không tìm thấy thông tin người dùng");

    const now = getVietnamTime();
    const lastCheck = user.last_check_in ? new Date(new Date(user.last_check_in).getTime() + (7 * 60 * 60 * 1000)) : null;
    
    // Kiểm tra xem đã điểm danh trong ngày hôm nay chưa (theo giờ Việt Nam)
    const isSameDay = lastCheck && 
      lastCheck.getUTCDate() === now.getUTCDate() &&
      lastCheck.getUTCMonth() === now.getUTCMonth() &&
      lastCheck.getUTCFullYear() === now.getUTCFullYear();

    if (isSameDay) return { success: false, error: 'Bạn đã điểm danh hôm nay rồi!' };

    // 2. Tính toán streak và XP mới
    let newStreak = (user.check_in_streak || 0) + 1;
    
    // 🔄 TỰ ĐỘNG RESET CHUỖI KHI SANG THÁNG MỚI (Đảm bảo công bằng tháng) 🍀
    if (lastCheck && (lastCheck.getUTCMonth() !== now.getUTCMonth() || lastCheck.getUTCFullYear() !== now.getUTCFullYear())) {
        console.log("📅 [Check-in] Phát hiện tháng mới, Reset chuỗi về 1.");
        newStreak = 1;
    }

    const xpGain = 100; // Mặc định 100 XP
    const newXP = (user.xp || 0) + xpGain;

    // 3. Cập nhật Database
    const { data: updatedUser, error: updateError } = await client
      .from('shiroi_users')
      .update({
        xp: newXP,
        last_check_in: now.toISOString(),
        check_in_streak: newStreak
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) throw updateError;
    // 4. Ghi log nhật ký
    await recordXpLogAction(userId, xpGain, 'check_in', `Streak: ${newStreak}`);

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

    // 4. Gửi thông báo tự động (Silent fail - không làm chết luồng upload)
    try {
        const title = `Chương ${chapter.chapter_number} vừa ra mắt! 📚`;
        await sendMangaNotification(title, mangaTitle, mangaId, coverImage);
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
    const sessionData = cookies().get('shiroi_session');
    if (!sessionData) throw new Error("Vui lòng đăng nhập để theo dõi truyện! 🛡️");

    const session = JSON.parse(sessionData.value);
    const userId = session?.id;

    if (!userId) {
       throw new Error("Phiên làm việc lỗi (Thiếu ID). Vui lòng đăng xuất và đăng nhập lại! 🛡️");
    }


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
