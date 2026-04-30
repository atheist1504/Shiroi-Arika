'use server';

import { uploadToR2, getPresignedUploadUrl, deleteFolderFromR2 } from './r2';
import { supabase } from './supabase';
import { supabaseAdmin } from './supabaseAdmin';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { sendMangaNotification, createInAppNotification } from './notifications';
import { XP_REWARDS, getStreakBonus, calculateLevel, TITLES } from './xp';
import { getStartOfVNDay } from './missions';
import { hashPassword, verifyPassword } from './crypto';

/**
 * 🛡️ HẰNG SỐ BẢO MẬT: Các trường dữ liệu người dùng an toàn được phép trả về Client 🍀
 * Tuyệt đối không bao gồm cột 'password'.
 */
const SAFE_USER_FIELDS = 'id, username, display_name, avatar_url, bio, role, xp, level, last_check_in, last_lucky_draw, check_in_streak, selected_badge, created_at';

/**
 * 🇻🇳 HÀM HELPER: Lấy thời gian hiện tại theo múi giờ Việt Nam (GMT+7)
 */
const getVietnamTime = () => {
  const now = new Date();
  return new Date(now.getTime() + (7 * 60 * 60 * 1000));
};

/**
 * 🔐 SERVER ACTION: Đăng nhập và tạo Session (Cookie)
 * Thay thế cho việc chỉ dùng LocalStorage 🛡️
 */
export async function loginAction(username, password) {
  try {
    const client = getDbClient(); // Sử dụng Admin Client để có quyền xem cột password 🛡️
    const { data: user, error } = await client
      .from('shiroi_users')
      .select(`password, ${SAFE_USER_FIELDS}`)
      .ilike('username', username.trim())
      .single();

    if (error || !user) throw new Error('Không tìm thấy tài khoản Shiroi này!');
    
    // 🛡️ XÁC THỰC MẬT KHẨU (Hỗ trợ đa thế hệ) 🍀
    const authResult = verifyPassword(password, user.password);
    
    if (!authResult.valid) {
       throw new Error('Mật khẩu chưa chính xác! 🔐');
    }

    // 🚀 TỰ ĐỘNG NÂNG CẤP BẢO MẬT (MIGRATION) 🩹
    // Nếu user đang dùng pass cũ hoặc plain, hãy cập nhật lên SHA-256 ngay lập tức
    if (authResult.version !== 'new') {
        console.log(`🛡️ [Security] Đang nâng cấp bảo mật mật mã cho user: ${username}`);
        const newSecureHash = hashPassword(password);
        await supabaseAdmin
            .from('shiroi_users')
            .update({ password: newSecureHash })
            .eq('id', user.id);
    }

    // 🍪 TẠO SESSION BẰNG COOKIE (Hết hạn sau 7 ngày)
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

    // 🛡️ BẢO VỆ: Loại bỏ mật mã trước khi trả về Client
    const { password: _, ...safeUser } = user;

    return { success: true, user: safeUser };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 🚪 SERVER ACTION: Đăng xuất và xóa Session (Cookie) 🛡️
 */
export async function logoutAction() {
  cookies().delete('shiroi_session');
  return { success: true };
}

/**
 * 📝 SERVER ACTION: Đăng ký tài khoản mới và cấp Session
 * Đồng bộ hóa LocalStorage và Cookie ngay lập tức 🚀
 */
export async function signupAction(userData) {
  try {
    const { username, password } = userData;
    const hashed = hashPassword(password);

    const client = getDbClient();

    // 1. Kiểm tra trùng lặp
    const { data: existing } = await client
      .from('shiroi_users')
      .select('username')
      .ilike('username', username.trim())
      .maybeSingle();
    
    if (existing) throw new Error('Tên này đã có chủ nhân sở hữu rồi! 👤');

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
      .select(SAFE_USER_FIELDS)
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
 * 🔐 HELPER: Lấy thông tin người dùng đang đăng nhập (Auto-healing) 🛡️
 */
export async function getAuthenticatedUser() {
  const sessionData = cookies().get('shiroi_session');
  if (!sessionData) return null;

  try {
    let user = JSON.parse(sessionData.value);
    
    // 🔍 CƠ CHẾ TỰ KHÔI PHỤC (AUTO-HEALING) 🩹
    if (!user.id && user.username?.toLowerCase() === 'atheist1504') {
      console.log(`⚠️ [Auth] Phát hiện session thiếu ID cho Admin ${user.username}, đang khôi phục...`);
      const client = getDbClient();
      const { data, error } = await client
        .from('shiroi_users')
        .select('id, username, role')
        .eq('username', user.username)  
        .single();
      
      if (!error && data) {
        user.id = data.id;
        user.role = data.role || 'user';
      }
    }

    // 🔍 LUÔN CẬP NHẬT ROLE TỪ DB: Đảm bảo phân quyền chính xác nhất (Tránh session stale khi vừa được nâng cấp) 🩹
    if (user.id) {
        const client = getDbClient();
        const { data } = await client.from('shiroi_users').select('role').eq('id', user.id).single();
        if (data) user.role = data.role;
    }

    return user.id ? user : null;
  } catch (err) {
    console.error("❌ Lỗi giải mã Session:", err.message);
    return null;
  }
}

/**
 * 🛡️ HELPER: Kiểm tra quyền Admin từ Cookie
 */
async function checkAdminAuth() {
  const user = await getAuthenticatedUser();
  if (!user) return false;
  
  if (user.username?.toLowerCase() === 'atheist1504') return true;
  return user.role === 'admin';
}

/**
 * 🛠️ HELPER: Kiểm tra quyền Staff (Cộng tác viên hoặc Admin)
 */
async function checkStaffAuth() {
  const user = await getAuthenticatedUser();
  if (!user) return false;
  
  if (user.role === 'admin' || user.role === 'staff') return true;
  if (user.username?.toLowerCase() === 'atheist1504') return true;
  return false;
}

/**
 * 🛡️ HELPER: Kiểm tra quyền sở hữu bài đăng (Sửa bài)
 */
async function checkResourceOwnership(table, id) {
  const user = await getAuthenticatedUser();
  if (!user) return false;
  
  // Admin được sửa tất cả 👑
  if (user.role === 'admin' || user.username?.toLowerCase() === 'atheist1504') return true;
  
  // Staff chỉ sửa được của mình 🛡️
  const client = getDbClient();
  const { data, error } = await client
    .from(table)
    .select('uploader_id')
    .eq('id', id)
    .single();
  
  if (error || !data) return false;
  return data.uploader_id === user.id;
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
    const isAdmin = await checkAdminAuth();
    const canDelete = isAdmin || (await checkResourceOwnership('mangas', mangaId));

    if (!canDelete) throw new Error("Bạn không có quyền xóa bộ truyện này! 🛡️");
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

    // 🚀 XÓA CACHE ĐỂ CẬP NHẬT TRUYỆN ĐÃ XÓA KHỎI TRANG CHỦ & DANH SÁCH ⚡
    revalidatePath('/');
    revalidatePath('/latest');
    revalidatePath(`/manga/${mangaId}`);

    return { success: true };
  } catch (error) {
    console.error("❌ Lỗi deleteMangaAction:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 🗑️ SERVER ACTION: Xóa chương truyện (Data + R2) 🛡️
 */
export async function deleteChapterAction(chapterId) {
  try {
    const isAdmin = await checkAdminAuth();
    const canDelete = isAdmin || (await checkResourceOwnership('chapters', chapterId));

    if (!canDelete) throw new Error("Bạn không có quyền xóa chương này! 🛡️");

    const client = getDbClient();
    
    // 1. Lấy thông tin chương để dọn dẹp và revalidate
    const { data: chapter } = await client.from('chapters').select('manga_id, chapter_number').eq('id', chapterId).single();

    // 2. Xóa folder ảnh trên R2 🧹
    // Thử xóa folder theo chuẩn mới (UUID)
    await deleteFolderFromR2(`chapters/${chapterId}/`);
    
    // Thử xóa folder theo chuẩn cũ (mangaId/chapterNumber) - Nếu tồn tại
    if (chapter) {
        await deleteFolderFromR2(`chapters/${chapter.manga_id}/${chapter.chapter_number}/`);
    }

    // 3. Xóa dữ liệu trong DB (Pages sẽ tự xóa do ON DELETE CASCADE)
    const { error } = await client.from('chapters').delete().eq('id', chapterId);
    if (error) throw error;

    // 4. Refresh cache
    if (chapter) {
      revalidatePath(`/manga/${chapter.manga_id}`);
      revalidatePath('/');
    }

    return { success: true };
  } catch (error) {
    console.error("❌ Lỗi deleteChapterAction:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 🎫 SERVER ACTION: Lấy vé tải ảnh lên R2 (Dành cho các file lớn hoặc hạ tầng có CORS)
 */
export async function getUploadUrlAction(fileName) {
  try {
    if (!(await checkStaffAuth())) throw new Error("Quyền hạn không đủ! 🛡️");
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
    if (!(await checkStaffAuth())) throw new Error("Quyền hạn không đủ! 🛡️");

    const file = formData.get('file');
    const fileName = formData.get('fileName');

    if (!file || !fileName) throw new Error("Thiếu dữ liệu upload!");

    const result = await uploadToR2(file, fileName);

    return { success: true, url: result };
  } catch (error) {
    console.error('❌ [Server] Lỗi uploadChapterPageAction:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 🕵️‍♂️ SERVER ACTION: Triệu hồi truyện (Leech Chapter Images) 🚀
 * Trích xuất danh sách ảnh từ Link web khác mà không cần tải về máy.
 */
export async function leechChapterAction(url) {
  try {
    if (!(await checkStaffAuth())) throw new Error("Quyền hạn không đủ! 🛡️");
    if (!url) throw new Error("Vui lòng cung cấp Link chương truyện! 🔗");

    // 🚀 CHẾ ĐỘ MỚI: NHẬN DIỆN DANH SÁCH LINK ẢNH DÁN TRỰC TIẾP 🚀
    const urlPattern = /https?:\/\/[^\s"'<>]+?\.(?:jpg|jpeg|png|webp|gif|bmp)[^\s"'<>]*/gi;
    const directLinks = url.match(urlPattern);
    if (directLinks && (directLinks.length > 1 || (directLinks.length === 1 && url.trim() === directLinks[0]))) {
        console.log(`🎯 [Leecher] Phát hiện ${directLinks.length} link ảnh dán trực tiếp.`);
        return { success: true, images: [...new Set(directLinks)], source: 'Direct-Paste' };
    }

    console.log(`🔍 [Leecher] Đang thám thính: ${url}`);
    
    // 🌟 LOGIC UNIFIED: MANGADEX & TRUYENDEX (Dùng chung MangaDex API)
    if (url.includes('mangadex.org') || url.includes('truyendex')) {
        try {
            const uuidMatch = url.match(/([a-f0-9-]{36})/i);
            const uuid = uuidMatch ? uuidMatch[1] : null;
            if (!uuid) throw new Error("Không tìm thấy mã chương (UUID) trong Link này! 🛡️");

            console.log(`🎯 [Leecher] Triệu hồi từ MangaDex Source (ID: ${uuid})`);
            const res = await fetch(`https://api.mangadex.org/at-home/server/${uuid}`);
            if (!res.ok) throw new Error("MangaDex API từ chối truy cập! 📉");
            const data = await res.json();
            if (data.result !== 'ok') throw new Error("Dữ liệu chương không hợp lệ! 🧱");

            const hash = data.chapter.hash;
            const baseUrl = data.baseUrl || 'https://uploads.mangadex.org';
            const images = data.chapter.dataSaver.map(filename => 
                `${baseUrl}/data-saver/${hash}/${filename}`
            );

            return { success: true, images, source: 'MangaDex-Core' };
        } catch (err) {
            console.error("❌ [Leecher] Lỗi MangaDex Source:", err.message);
            if (url.includes('mangadex.org')) throw err;
        }
    }



    // --- KHU VỰC DỰ PHÒNG: CÀO HTML NẾU KHÔNG PHẢI MANGADEX/TRUYENDEX ---
    let html = "";
    const images = [];

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': url
            }
        });
        if (response.ok) {
            html = await response.text();
        }
    } catch (e) {
        console.warn("⚠️ [Leecher] Không thể lấy HTML dự phòng:", e.message);
    }

    // LOGIC CHUNG CHO CÁC TRANG KHÁC 🛠️
    // Quét cả src và các thuộc tính data- phổ biến
    const genericRegex = /(?:src|data-src|data-original|data-url|data-cdn)=["'](https?:\/\/[^"'\s<>]+?\.(?:jpg|jpeg|png|webp|gif|bmp)[^"'\s<>]*?)["']/gi;
    let match;
    while ((match = genericRegex.exec(html)) !== null) {
        let imgUrl = match[1];
        // Xử lý các link tương đối hoặc bị escape
        imgUrl = imgUrl.replace(/&amp;/g, '&');
        
        if (!imgUrl.includes('logo') && !imgUrl.includes('icon') && !imgUrl.includes('ads') && !imgUrl.includes('banner')) {
            images.push(imgUrl);
        }
    }

    // Lọc trùng lặp
    const uniqueImages = [...new Set(images)];

    if (uniqueImages.length === 0) {
        throw new Error("Không tìm thấy ảnh nào trong chương này! Web gốc có thể đã chặn truy cập ngầm. 🛡️");
    }

    console.log(`✅ [Leecher] Triệu hồi thành công ${uniqueImages.length} ảnh từ ${url}`);
    return { success: true, images: uniqueImages, source: 'HTML-Scraper' };

  } catch (error) {
    console.error('❌ [Leecher] Lỗi:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 🌩️ SERVER ACTION: Tải ảnh từ URL lên R2 (Atomic Transfer) 🚀
 * Giúp vượt qua CORS khi cào truyện từ web khác.
 */
export async function uploadFromUrlAction(url, fileName) {
    try {
        if (!(await checkStaffAuth())) throw new Error("Quyền hạn không đủ! 🛡️");

        console.log(`🌩️ [Transfer] Đang kéo ảnh: ${url}`);
        
        // Tải ảnh về server RAM 🛡️
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Referer': new URL(url).origin
        };

        // Ưu tiên Referer của MangaDex nếu là link từ họ 🕵️‍♂️
        if (url.includes('mangadex') || url.includes('mangadex.org')) {
            headers['Referer'] = 'https://mangadex.org/';
        } else {
            headers['Referer'] = new URL(url).origin;
        }

        const response = await fetch(url, { headers });

        if (!response.ok) throw new Error(`Web gốc chặn tải ảnh! (Status: ${response.status})`);
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        // Tạo File object giả để dùng với uploadToR2
        const file = new File([buffer], fileName, { type: contentType });

        const result = await uploadToR2(file, fileName);

        return { success: true, url: result, size_kb: Math.round(buffer.length / 1024) };
    } catch (error) {
        console.error(`❌ [Transfer] Lỗi tại ${url}:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * 🌩️ SERVER ACTION: Upload Image to R2
 */
export async function uploadImageAction(formData) {
  try {
    if (!(await checkStaffAuth())) throw new Error("Quyền hạn không đủ! 🛡️");
    const file = formData.get('file');
    if (!file) throw new Error("Không tìm thấy file ảnh!");
    
    const fileName = `covers/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const result = await uploadToR2(file, fileName);
    
    return { success: true, url: result };
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
export async function recordXpLogAction(amount, type, reason = null, targetUserId = null) {
  try {
    const user = await getAuthenticatedUser();
    if (!user && !targetUserId) {
        return { success: false, error: 'Cần đăng nhập để thực hiện hành động này! 🛡️' };
    }

    // Nếu không có targetUserId, mặc định là người dùng hiện tại
    // Nếu có targetUserId, yêu cầu quyền Admin/Staff để ghi log cho người khác
    let finalUserId = targetUserId || user?.id;

    if (targetUserId && user?.id !== targetUserId) {
        const isAdmin = await checkAdminAuth();
        const isStaff = await checkStaffAuth();
        if (!isAdmin && !isStaff) throw new Error("Bạn không có quyền ghi nhật ký cho người khác! 🛡️");
    }

    if (!finalUserId || !amount) {
      return { success: false, error: 'Thiếu định danh người dùng hoặc thông số XP' };
    }
    
    const client = getDbClient();

    // 🛡️ LẤY THÔNG TIN NGƯỜI DÙNG ĐỂ KIỂM TRA LV 🍀
    const { data: userData } = await client
        .from('shiroi_users')
        .select('xp, username')
        .eq('id', finalUserId)
        .single();

    // 🛡️ KIỂM TRA GIỚI HẠN XP HÀNG NGÀY (CHỈ CHO BÌNH LUẬN) 🍀
    if (type === 'comment' || type === 'first_comment') {
        const startOfTodayISO = getStartOfVNDay().toISOString();

        const { data: todayLogs, error: logError } = await client
            .from('shiroi_xp_logs')
            .select('amount')
            .eq('user_id', finalUserId)
            .in('type', ['comment', 'first_comment'])
            .gte('created_at', startOfTodayISO);

        if (!logError && todayLogs) {
            const totalToday = todayLogs.reduce((sum, log) => sum + (log.amount || 0), 0);
            const MAX_COMMENT_XP = 100; 
            
            if (totalToday + amount > MAX_COMMENT_XP) {
                return { success: false, error: 'Đã đạt giới hạn XP bình luận trong ngày (100 XP)! 🛡️' };
            }
        }
    }
    
    const { error } = await client
      .from('shiroi_xp_logs')
      .insert({
        user_id: finalUserId,
        amount,
        type,
        reason,
        created_at: new Date().toISOString()
      });

    if (error) throw error;

    // 🔔 KIỂM TRA ĐẠT DANH HIỆU MỚI (TITLE UNLOCK) 🏆
    if (userData) {
      try {
        const oldLevel = calculateLevel(userData.xp || 0);
        const newXp = (userData.xp || 0) + amount;
        const newLevel = calculateLevel(newXp);

        if (newLevel > oldLevel) {
            const newTitle = TITLES.find(t => newLevel >= t.lv && oldLevel < t.lv);
            if (newTitle) {
                await createInAppNotification(finalUserId, `Danh hiệu mới được khai phá! 🏆`, `Chúc mừng! Bạn đã đạt danh hiệu cao quý: "${newTitle.name}". Hãy tiếp tục tu luyện nhé! 🍀`, 'system', { titleName: newTitle.name });
            }
        }
      } catch (e) {
        console.warn("⚠️ [LevelUp] Lỗi kiểm tra thăng cấp:", e.message);
      }
    }

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
    // 1. Kiểm tra xem đã đọc chương này chưa (Tránh spam/double claim)
    const { data: alreadyRead } = await client
      .from('shiroi_read_chapters')
      .select('id')
      .eq('user_id', userId)
      .eq('chapter_id', chapterId)
      .maybeSingle();

    if (alreadyRead) return { success: false, error: 'Bạn đã nhận thưởng đọc chương này trước đó rồi! 🛡️' };

    // 3. Ghi log và nhận XP TRƯỚC 💎
    // Nếu ghi log thất bại, hệ thống sẽ dừng lại ở đây (User có thể thử lại). 🛡️
    const resLog = await recordXpLogAction(20, 'read', chapterId);
    if (!resLog.success) return resLog;

    // 4. Đánh dấu đã đọc chương này (Chỉ ghi sau khi đã có XP) ✅
    const { error: readError } = await client.from('shiroi_read_chapters').insert({ 
      user_id: userId, 
      username: user.username, 
      chapter_id: chapterId, 
      manga_id: mangaId, 
      read_at: new Date().toISOString() 
    });

    if (readError) {
        console.error("❌ Lỗi đánh dấu đã đọc (nhưng đã có XP):", readError.message);
        // Lưu ý: User đã có XP nhưng DB chưa hiện đã đọc -> Có thể bị lợi dụng để cày? 
        // Tuy nhiên recordXpLogAction đã có Unique Index hoặc CHECK logic? 
        // Thực tế recordXpLogAction cho 'read' chưa có Index unique cho chapterId.
    }

    const { data: updatedUser } = await client.from('shiroi_users').select(SAFE_USER_FIELDS).eq('id', userId).single();

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

        // 6. Tự động đánh dấu đã đọc cho thông báo chương mới của bộ này 📚
        await supabaseAdmin
            .from('shiroi_notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('type', 'chapter_update')
            .eq('is_read', false)
            .contains('data', { mangaId: mangaId });

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
       throw new Error("Phiên làm việc lỗi. Vui lòng đăng nhập lại! 🛡️");
    }

    const client = getDbClient();
    const { data, error } = await client.rpc('rpc_perform_check_in', { p_user_id: user.id });

    if (error) throw error;
    if (!data.success) throw new Error(data.error);

    // Lấy thông tin user đã cập nhật để trả về Client 🍀
    const { data: updatedUser } = await client
      .from('shiroi_users')
      .select(SAFE_USER_FIELDS)
      .eq('id', user.id)
      .single();

    return { success: true, xpGain: data.xpGain, streak: data.streak, user: updatedUser };
  } catch (error) {
    console.error('❌ Lỗi performCheckInAction (RPC):', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 📣 SERVER ACTION: Đăng chương mới (Atomic operation)
 */
export async function publishChapterAction(mangaId, mangaTitle, chapterData, pagesData, coverImage) {
  try {
    const isAdmin = await checkAdminAuth();
    const isStaff = await checkStaffAuth();
    if (!isAdmin && !isStaff) throw new Error("Quyền hạn không đủ! 🛡️");

    const user = await getAuthenticatedUser();
    const client = getDbClient();
    const { data: chapter, error: chapterError } = await client
      .from('chapters')
      .insert([{ ...chapterData, uploader_id: user.id }])
      .select()
      .single();

    if (chapterError) throw chapterError;

    const pagesWithChapterId = pagesData.map(page => ({
        ...page,
        chapter_id: chapter.id
    }));

    const { error: pagesError } = await client.from('pages').insert(pagesWithChapterId);
    if (pagesError) throw pagesError;

    // Gửi thông báo ngầm
    notifyNewChapterAction(mangaId, mangaTitle, chapter.chapter_number, coverImage).catch(() => {});

    // 🚀 XÓA CACHE ĐỂ CẬP NHẬT CHƯƠNG MỚI LÊN TRANG CHỦ & TRANG CHI TIẾT ⚡
    revalidatePath('/');
    revalidatePath('/latest');
    revalidatePath(`/manga/${mangaId}`);
    revalidatePath(`/read/${chapter.id}`);

    return { success: true, chapterId: chapter.id };
  } catch (error) {
    console.error('❌ Lỗi publishChapterAction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * ⚡ SERVER ACTION: Lưu dữ liệu chương mới và các trang (Admin Only) 🍀
 */
export async function saveChapterDataAction(chapterPayload, pagesData, isEditing, existingChapterId = null) {
  console.log(`⚡ [Server] Bắt đầu lưu chương - Chỉnh sửa: ${isEditing}, ID hiện tại: ${existingChapterId}`);
  try {
    const isAdmin = await checkAdminAuth().catch(() => false);
    const isStaff = await checkStaffAuth().catch(() => false);
    if (!isAdmin && !isStaff) throw new Error("Quyền hạn không đủ! 🛡️");

    const user = await getAuthenticatedUser();
    const client = getDbClient();
    let chapId = existingChapterId;

    const chapterToSave = { ...chapterPayload };

    if (!isEditing) {
       const { data: existing } = await client
         .from("chapters")
         .select("id")
         .eq("manga_id", chapterPayload.manga_id)
         .eq("chapter_number", chapterPayload.chapter_number)
         .maybeSingle();
       
       if (existing) {
         chapId = existing.id;
       }
    }

    if (chapId) {
        await client.from("chapters").update(chapterToSave).eq("id", chapId);
    } else {
        const { data: newChap } = await client.from("chapters").insert([{ ...chapterToSave, uploader_id: user.id }]).select().single();
        chapId = newChap.id;
    }

    await client.from("pages").delete().eq("chapter_id", chapId);
    const pagesWithId = pagesData.map(p => ({ ...p, chapter_id: chapId }));
    await client.from("pages").insert(pagesWithId);

    revalidatePath(`/read/${chapId}`);
    revalidatePath(`/manga/${chapterPayload.manga_id}`);
    revalidatePath('/latest');
    revalidatePath('/');

    return { success: true, chapterId: chapId };
  } catch (error) {
    console.error('❌ [Server] LỖI saveChapterDataAction:', error.message);
    return { success: false, error: error.message || "Lỗi Server Action" };
  }
}

/**
 * 🖋️ SERVER ACTION: Lưu hoặc Cập nhật Manga (Bảo mật 🛡️)
 */
export async function saveMangaAction(mangaData, mangaId = null) {
  try {
    const isAdmin = await checkAdminAuth().catch(() => false);
    const isStaff = await checkStaffAuth().catch(() => false);
    
    if (!isAdmin && !isStaff) throw new Error("Quyền hạn không đủ! 🛡️");
    
    // Nếu là sửa bài, kiểm tra quyền sở hữu (Nếu không phải Admin)
    if (mangaId && !isAdmin) {
      const canEdit = await checkResourceOwnership('mangas', mangaId);
      if (!canEdit) throw new Error("Bạn không có quyền chỉnh sửa bộ truyện này! 🛡️");
    }

    const client = getDbClient();
    const user = await getAuthenticatedUser();

    let resultData;

    if (mangaId) {
      const { data, error } = await client
        .from('mangas')
        .update({ ...mangaData })
        .eq('id', mangaId)
        .select()
        .single();
      
      if (error) throw error;
      resultData = data;
    } else {
      const { data, error } = await client
        .from('mangas')
        .insert([{ ...mangaData, uploader_id: user.id }])
        .select()
        .single();
      
      if (error) throw error;
      resultData = data;
    }

    // 🚀 XÓA CACHE ĐỂ CẬP NHẬT TRUYỆN MỚI / CẬP NHẬT ⚡
    revalidatePath('/');
    revalidatePath('/latest');
    if (mangaId || resultData?.id) revalidatePath(`/manga/${mangaId || resultData?.id}`);

    return { success: true, data: resultData };
  } catch (error) {
    console.error('❌ Lỗi saveMangaAction:', error.message);
    return { success: false, error: error.message };
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
       throw new Error("Phiên làm việc lỗi. Vui lòng đăng nhập lại! 🛡️");
    }

    const client = getDbClient();
    const { data, error } = await client.rpc('rpc_perform_lucky_draw', { p_user_id: user.id });

    if (error) throw error;
    if (!data.success) throw new Error(data.error);

    // Lấy thông tin user đã cập nhật để trả về Client 🍀
    const { data: updatedUser } = await client
      .from('shiroi_users')
      .select(SAFE_USER_FIELDS)
      .eq('id', user.id)
      .single();

    return { success: true, xpGain: data.xpGain, user: updatedUser };
  } catch (error) {
    console.error('❌ Lỗi performLuckyDrawAction (RPC):', error.message);
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

    if (user?.id) {
        const startOfTodayISO = getStartOfVNDay().toISOString();
        const { data: logs } = await client
          .from('shiroi_reports')
          .select('created_at')
          .eq('user_id', user.id)
          .gte('created_at', startOfTodayISO)
          .order('created_at', { ascending: false });

        if (logs && logs.length >= 20) {
          return { success: false, error: 'Bạn đã đạt giới hạn 20 báo cáo/ngày. Vui lòng quay lại vào ngày mai!' };
        }
        
        if (logs && logs.length > 0) {
          const lastTime = new Date(logs[0].created_at).getTime();
          if (Date.now() - lastTime < 30000) {
            return { success: false, error: `Vui lòng đợi ${Math.ceil((30000 - (Date.now() - lastTime))/1000)}s nữa để gửi tiếp.` };
          }
        }
    }

    // 🛡️ Tách mangaTitle ra để không gây lỗi DB (vì cột này không có trong bảng)
    const { mangaTitle, ...dbFields } = reportData;

    const { error } = await client
      .from('shiroi_reports')
      .insert([{
        ...dbFields,
        user_id: user?.id || null,
        status: 'pending'
      }]);

    if (error) throw error;

    // 🔔 Thông báo cho Quản trị viên (Admin) 🍀
    try {
        const { data: admins } = await client.from('shiroi_users').select('id').or('role.eq.admin,username.ilike.atheist1504');
        const adminIds = admins?.map(a => a.id) || [];
        
        const title = `Báo cáo mới từ User! 🚩`;
        const body = `Có báo cáo lỗi mới về: "${mangaTitle || 'Hệ thống/Manga'}". Hãy kiểm tra ngay!`;
        
        adminIds.forEach(adminId => {
             createInAppNotification(adminId, title, body, 'system', { reportId: 'new' });
        });
    } catch (e) {
        console.warn("⚠️ Lỗi thông báo Admin:", e.message);
    }

    return { success: true };
  } catch (error) {
    console.error('Lỗi submitReportAction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 🗑️ SERVER ACTION: Dọn dẹp báo cáo đã xử lý (Resolved)
 */
export async function deleteResolvedReportsAction(olderThanDays = null) {
  try {
    if (!(await checkAdminAuth())) throw new Error("Quyền hạn không đủ! 🛡️");
    const client = getDbClient();

    let query = client.from('shiroi_reports').delete().in('status', ['fixed', 'ignored']);
    
    if (olderThanDays !== null) {
      const date = new Date();
      date.setDate(date.getDate() - olderThanDays);
      query = query.lt('created_at', date.toISOString());
    }

    const { error } = await query;
    if (error) throw error;
    
    revalidatePath('/admin/reports');
    return { success: true };
  } catch (error) {
    console.error('Lỗi deleteResolvedReportsAction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 🗑️ SERVER ACTION: Xóa 1 báo cáo đơn lẻ
 */
export async function deleteReportAction(reportId) {
  try {
    if (!(await checkAdminAuth())) throw new Error("Quyền hạn không đủ! 🛡️");
    const client = getDbClient();

    const { error } = await client.from('shiroi_reports').delete().eq('id', reportId);
    if (error) throw error;
    
    revalidatePath('/admin/reports');
    return { success: true };
  } catch (error) {
    console.error('Lỗi deleteReportAction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 🧹 SERVER ACTION: Dọn dẹp hệ thống tự động (Thông báo & Nhật ký XP > 7 ngày) 🍀
 */
export async function cleanupSystemDataAction() {
  try {
    if (!(await checkAdminAuth())) return { success: false, error: "Không có quyền Admin" };
    
    const client = getDbClient();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();

    console.log("🧹 [System] Bắt đầu dọn dẹp dữ liệu cũ hơn 7 ngày...");

    // 1. Xóa thông báo cũ
    const { count: notifCount } = await client
      .from('shiroi_notifications')
      .delete({ count: 'exact' })
      .lt('created_at', sevenDaysAgoISO);

    // 2. Xóa nhật ký XP cũ (Không ảnh hưởng đến số XP hiện tại của User)
    const { count: xpCount } = await client
      .from('shiroi_xp_logs')
      .delete({ count: 'exact' })
      .lt('created_at', sevenDaysAgoISO);

    return { 
      success: true, 
      details: `Đã dọn dẹp ${notifCount || 0} thông báo và ${xpCount || 0} nhật ký XP cũ. 🍀` 
    };
  } catch (error) {
    console.error('❌ Lỗi cleanupSystemDataAction:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 🕵️‍♂️ SERVER ACTION: Lấy danh sách báo cáo (Admin xem hết, User xem của mình) 🍀
 */
export async function getReportsAction(all = false) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Chưa đăng nhập!");

    const isAdmin = user.role === 'admin' || user.username?.toLowerCase() === 'atheist1504';
    const client = getDbClient();

    let selectStr = `
        *,
        mangas(title),
        chapters(chapter_number)
    `;
    
    if (all && isAdmin) {
        selectStr += `, shiroi_users(username)`;
    }

    let query = client
      .from('shiroi_reports')
      .select(selectStr);

    if (!all || !isAdmin) {
        query = query.eq('user_id', user.id);
    }


    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, reports: data };
  } catch (error) {
    console.error('Lỗi getReportsAction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 🕵️‍♂️ SERVER ACTION: Lấy chi tiết một báo cáo 🍀
 */
export async function getReportByIdAction(reportId) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) throw new Error("Chưa đăng nhập!");

        const { data, error } = await supabaseAdmin
            .from('shiroi_reports')
            .select(`
                *,
                mangas(title, cover_url),
                chapters(chapter_number),
                shiroi_users(username, avatar_url)
            `)
            .eq('id', reportId)
            .single();

        if (error) throw error;
        
        const isAdmin = user.role === 'admin' || user.username?.toLowerCase() === 'atheist1504';
        if (!isAdmin && data.user_id !== user.id) {
            throw new Error("Không có quyền xem báo cáo này! 🛡️");
        }

        return { success: true, report: data };
    } catch (error) {
        console.error('❌ Lỗi getReportByIdAction:', error.message);
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

    // 🕵️‍♂️ Lấy thông tin báo cáo trước khi cập nhật
    const { data: report } = await client.from('shiroi_reports').select('user_id, description, status').eq('id', reportId).single();

    const { error } = await client
      .from('shiroi_reports')
      .update({ status })
      .eq('id', reportId);

    if (error) throw error;
    
    // 🔔 Thông báo phản hồi & Cộng điểm thưởng 🍀
    try {
        if (report && report.user_id) {
            // 💎 THƯỞNG 500 XP NẾU BÁO CÁO CHÍNH XÁC (FIXED) 🛡️
            if (status === 'fixed' && report.status !== 'fixed') {
                await recordXpLogAction(500, 'mission', `Báo cáo lỗi chính xác: ${report.description?.substring(0, 30)}...`, report.user_id);
                
                // Thông báo thưởng riêng cho User
                await createInAppNotification(
                    report.user_id, 
                    "Phần thưởng báo cáo lỗi! 💎", 
                    `Báo cáo của bạn đã được xác nhận chính xác. Bạn nhận được +500 XP thưởng! 🍀`,
                    'system'
                );
            }

            const statusLabel = status === 'fixed' ? 'Đã khắc phục' : status === 'ignored' ? 'Đã kiểm tra không lỗi' : status;
            const title = `Cập nhật trạng thái báo cáo! 🛠️`;
            const body = `Báo cáo "${report.description?.substring(0, 20)}..." của bạn đã được chuyển sang: ${statusLabel}. Cảm ơn bạn đã đóng góp! 🍀`;
            await createInAppNotification(report.user_id, title, body, 'system', { reportId });
        }
    } catch (e) {
        console.warn("⚠️ Lỗi hậu xử lý báo cáo:", e.message);
    }
    
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
    
    if (missionKey === 'grand_conquest_all' || missionKey.startsWith('conqueror_')) {
        rewardXp = 10000;
    } else if (missionKey.startsWith('finish_series_')) {
        // Phân loại Tier cho bộ truyện đã hoàn thành
        const mangaIdFromKey = missionKey.replace('finish_series_', '');
        
        // 1 & 2. Chạy song song kiểm tra số chương và thể loại One-shot ⚡
        const [chapterRes, mangaRes] = await Promise.all([
            client.from('chapters').select('id', { count: 'exact', head: true }).eq('manga_id', mangaIdFromKey),
            client.from('mangas').select('genres').eq('id', mangaIdFromKey).single()
        ]);

        const total = chapterRes.count || 0;

        // 3. Kiểm tra số lượng đã đọc thực tế
        const { count: n } = await client.from('shiroi_read_chapters').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('manga_id', mangaIdFromKey);
        
        // Dùng hàm dùng chung từ missions.js
        const { calculateConquestReward } = await import('./missions');
        rewardXp = total === 1 ? 50 : calculateConquestReward(n);

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
        reward_xp: rewardXp,
        claimed_at: new Date().toISOString()
      }]);

    if (claimError) throw claimError;

    // 4. Cộng XP và log nhật ký
    const resLog = await recordXpLogAction(rewardXp, 'mission', missionKey);
    if (!resLog.success) throw new Error(resLog.error);

    const { data: updatedUser } = await client.from('shiroi_users').select(SAFE_USER_FIELDS).eq('id', userId).single();

    // 5. TỰ ĐỘNG ĐÁNH DẤU ĐÃ ĐỌC thông báo nhắc nhở cũ 🧹
    try {
        // Tìm và đánh dấu đã đọc cho thông báo nhắc nhở nhiệm vụ này (để dọn dẹp hộp thư)
        await supabaseAdmin
            .from('shiroi_notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false)
            .contains('data', { missionKey });
            
    } catch (e) {
        console.warn("⚠️ [Notification] Lỗi dọn dẹp thông báo cũ:", e.message);
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
  
      // 🔔 Kiểm tra và cộng điểm XP bình luận 💎
      try {
          const startOfTodayISO = getStartOfVNDay().toISOString();
          const { data: logs } = await supabaseAdmin
              .from('shiroi_xp_logs')
              .select('created_at, type')
              .eq('user_id', userId)
              .in('type', ['comment', 'first_comment'])
              .gte('created_at', startOfTodayISO)
              .order('created_at', { ascending: false });

          let canReceiveXp = true;
          let amount = XP_REWARDS.SUBSEQUENT_COMMENT; // Mặc định 5 XP
          
          if (!logs || logs.length === 0) {
              amount = XP_REWARDS.FIRST_COMMENT; // 10 XP cho lần đầu
          } else {
              // Kiểm tra Cooldown 30s
              const lastLogTime = new Date(logs[0].created_at).getTime();
              const now = new Date().getTime();
              if (now - lastLogTime < XP_REWARDS.COMMENT_COOLDOWN) {
                  canReceiveXp = false;
              }
          }

          if (canReceiveXp) {
              const type = amount === XP_REWARDS.FIRST_COMMENT ? 'first_comment' : 'comment';
              await recordXpLogAction(amount, type, `Bình luận tại chương: ${c_id || 'Manga'}`);
          }

          // 🏆 Kiểm tra nhiệm vụ tuần (Thành tựu)
          const { count: dailyComment } = await client
              .from('comments')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', userId)
              .gte('created_at', startOfTodayISO);
          
          if (dailyComment === 1) {
              await createInAppNotification(userId, `Hoàn thành nhiệm vụ! 🎯`, `Bạn đã xong "Thảo luận viên". Hãy mở Kho thành tựu để nhận thưởng! 🍀`, 'system', { missionKey: 'daily_comment_1' });
          }
      } catch (e) {
          console.warn("⚠️ Lỗi cộng điểm bình luận:", e.message);
      }

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
        console.error('❌ Lỗi saveFcmTokenAction:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 🚀 SERVER ACTION: Tự động xóa thông báo cũ hơn 1 tuần
 */
export async function cleanupNotificationsAction() {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return { success: false, error: 'Chưa đăng nhập' };

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
        console.error('❌ Lỗi cleanupNotificationsAction:', error.message);
        return { success: false, error: error.message };
    }
}
/**
 * 🌩️ SERVER ACTION: Đăng ký FCM Token cho Push Notifications
 */
export async function registerFcmTokenAction(token) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !user.id) return { success: false, error: 'Chưa đăng nhập' };

    const client = getDbClient();
    
    // Cập nhật fcm_token cho người dùng
    const { error } = await client
      .from('shiroi_users')
      .update({ fcm_token: token })
      .eq('id', user.id);

    if (error) {
      // Nếu cột không tồn tại, ta báo lỗi để admin biết cần chạy migration
      console.error("❌ Lỗi lưu FCM Token:", error.message);
      return { success: false, error: error.message };
    }

      return { success: true };
    } catch (error) {
      console.error("❌ Lỗi registerFcmTokenAction:", error.message);
      return { success: false, error: error.message };
    }
}

/**
 * 🌩️ SERVER ACTION: Hủy đăng ký FCM Token (Dừng nhận thông báo) 🚫
 */
export async function unregisterFcmTokenAction() {
    try {
      const user = await getAuthenticatedUser();
      if (!user || !user.id) return { success: false, error: 'Chưa đăng nhập' };
  
      const client = getDbClient();
      
      // Xóa fcm_token của người dùng
      const { error } = await client
        .from('shiroi_users')
        .update({ fcm_token: null })
        .eq('id', user.id);
  
      if (error) {
        console.error("❌ Lỗi xóa FCM Token:", error.message);
        return { success: false, error: error.message };
      }
  
      return { success: true };
    } catch (error) {
      console.error("❌ Lỗi unregisterFcmTokenAction:", error.message);
      return { success: false, error: error.message };
    }
}

/**
 * 🌩️ SERVER ACTION: Đăng ký Topic cho FCM
 */
export async function subscribeToTopicAction(token, topic = 'all_manga_updates') {
  try {
    const { subscribeTokenToTopic } = await import('./notifications');
    return await subscribeTokenToTopic(token, topic);
  } catch (error) {
    console.error("❌ Lỗi subscribeToTopicAction:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 🌩️ SERVER ACTION: Hủy đăng ký Topic cho FCM
 */
export async function unsubscribeFromTopicAction(token, topic = 'all_manga_updates') {
  try {
    const { unsubscribeTokenFromTopic } = await import('./notifications');
    return await unsubscribeTokenFromTopic(token, topic);
  } catch (error) {
    console.error("❌ Lỗi unsubscribeFromTopicAction:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 🔐 SERVER ACTION: Đổi mật khẩu người dùng
 * Yêu cầu xác thực mật khẩu cũ và mã hóa mật khẩu mới 🛡️
 */
export async function changePasswordAction(oldPassword, newPassword) {
  try {
    const userSession = await getAuthenticatedUser();
    if (!userSession || !userSession.id) throw new Error('Cần đăng nhập để đổi mật mã! 🛡️');

    const client = getDbClient();

    // 1. Kiểm tra mật mã cũ có chính xác không
    const { data: user, error: fetchError } = await client
      .from('shiroi_users')
      .select('password')
      .eq('id', userSession.id)
      .single();

    if (fetchError || !user) throw new Error('Không thể xác thực tài khoản! 🆘');

    const authResult = verifyPassword(oldPassword, user.password);
    if (!authResult.valid) {
      throw new Error('Mật khẩu hiện tại chưa chính xác! 🔐');
    }

    // 2. Cập nhật mật mã mới
    const newSecureHash = hashPassword(newPassword);
    const { error: updateError } = await client
      .from('shiroi_users')
      .update({ password: newSecureHash })
      .eq('id', userSession.id);

    if (updateError) throw new Error('Cập nhật mật mã thất bại! 🛡️');

    return { success: true };
  } catch (error) {
    console.error('❌ Lỗi changePasswordAction:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 🕵️‍♂️ SERVER ACTION: Tìm kiếm người dùng (Chỉ dành cho Admin) 🛡️
 */
export async function searchUsersAction(query) {
  try {
    if (!(await checkAdminAuth())) throw new Error("Quyền hạn không đủ! 🛡️");
    const client = getDbClient();
    
    const { data, error } = await client
      .from('shiroi_users')
      .select('id, username, display_name, role, avatar_url, created_at')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(10);
      
    if (error) throw error;
    return { success: true, users: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 👑 SERVER ACTION: Lấy danh sách nhân sự (Staff & Admin) 🛡️
 */
export async function getPersonnelListAction() {
  try {
    if (!(await checkAdminAuth())) throw new Error("Quyền hạn không đủ! 🛡️");
    const client = getDbClient();
    
    const { data, error } = await client
      .from('shiroi_users')
      .select('id, username, display_name, role, avatar_url, created_at')
      .in('role', ['admin', 'staff'])
      .order('role', { ascending: true });
      
    if (error) throw error;
    return { success: true, users: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 👑 SERVER ACTION: Cập nhật chức vụ người dùng (Chỉ dành cho Admin) 🛡️
 */
export async function updateUserRoleAction(targetId, newRole) {
  try {
    if (!(await checkAdminAuth())) throw new Error("Quyền hạn không đủ! 🛡️");
    if (!['admin', 'staff', 'user'].includes(newRole)) throw new Error("Chức vụ không hợp lệ!");
    
    // Bảo vệ: Không thể tự hạ cấp bản thân hoặc hạ cấp chủ sở hữu atheist1504 🛡️
    const user = await getAuthenticatedUser();
    if (user.id === targetId) throw new Error("Bạn không thể tự đổi chức vụ của chính mình! 🛡️");
    
    const client = getDbClient();
    const { data: targetUser } = await client.from('shiroi_users').select('username').eq('id', targetId).single();
    if (targetUser?.username?.toLowerCase() === 'atheist1504') throw new Error("Không thể tác động đến Boss của Thánh địa! 🛡️");

    const { error } = await client
      .from('shiroi_users')
      .update({ role: newRole })
      .eq('id', targetId);
      
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 👤 SERVER ACTION: Cập nhật thông tin hồ sơ người dùng 🍀
 */
export async function updateUserProfileAction(updateData) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Bạn cần đăng nhập để thực hiện việc này! 🛡️");

    const client = getDbClient();
    const { data, error } = await client
      .from('shiroi_users')
      .update({
        display_name: updateData.display_name,
        bio: updateData.bio,
        avatar_url: updateData.avatar_url,
        selected_badge: updateData.selected_badge
      })
      .eq('id', user.id)
      .select(SAFE_USER_FIELDS)
      .single();

    if (error) throw error;

    revalidatePath('/profile');
    revalidatePath(`/user/${user.id}`);
    
    return { success: true, user: data };
  } catch (error) {
    console.error("❌ Lỗi cập nhật hồ sơ:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 💡 SERVER ACTION: Gửi gợi ý danh hiệu mới 🍀
 */
export async function suggestTitleAction(titleName, reason) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) throw new Error("Vui lòng đăng nhập để gửi gợi ý!");
    
    const userId = user.id;

    const { error } = await supabaseAdmin
      .from('shiroi_title_suggestions')
      .insert([
        { 
          user_id: userId, 
          title_name: titleName, 
          reason: reason,
          status: 'pending'
        }
      ]);

    if (error) throw error;
    
    // 🔔 Thông báo cho Quản trị viên (Admin) về đề xuất mới 🍀
    try {
        const { data: admins } = await supabaseAdmin.from('shiroi_users').select('id').or('role.eq.admin,username.ilike.atheist1504');
        const adminIds = admins?.map(a => a.id) || [];
        
        const title = `Gợi ý danh xưng mới! 💡`;
        const body = `${user.display_name || user.username} vừa hiến kế danh hiệu: "${titleName}".`;
        
        const { createInAppNotification } = await import('./notifications');
        adminIds.forEach(adminId => {
             createInAppNotification(adminId, title, body, 'system', { suggestId: 'new' });
        });
    } catch (e) {
        console.warn("⚠️ Lỗi thông báo Admin (Title Suggestion):", e.message);
    }

    return { success: true };
  } catch (error) {
    console.error("❌ Lỗi gửi gợi ý danh hiệu:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 🕵️‍♂️ SERVER ACTION: Lấy danh sách danh hiệu chính thức (Từ Database) 🍀
 */
export async function getOfficialTitlesAction() {
  try {
    const { data, error } = await supabase
      .from('shiroi_titles')
      .select('*')
      .order('lv', { ascending: false });

    if (error) throw error;
    return { success: true, titles: data };
  } catch (error) {
    console.error("❌ Lỗi lấy danh sách danh hiệu:", error);
    return { success: true, titles: [] };
  }
}

/**
 * 🗑️ SERVER ACTION: Xóa danh hiệu chính thức (Chỉ Admin) 🍀
 */
export async function deleteOfficialTitleAction(id) {
  try {
    const sessionCookie = cookies().get('shiroi_session');
    if (!sessionCookie) throw new Error("Chưa đăng nhập!");
    
    const session = JSON.parse(sessionCookie.value);
    if (session.role !== 'admin' && session.username?.toLowerCase() !== 'atheist1504') throw new Error("Không có quyền!");

    const { error } = await supabaseAdmin
      .from('shiroi_titles')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("❌ Lỗi xóa danh hiệu:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 🕵️‍♂️ SERVER ACTION: Lấy danh sách gợi ý danh hiệu (Chỉ Admin/Staff) 🍀
 */
export async function getTitleSuggestionsAction() {
  try {
    const sessionCookie = cookies().get('shiroi_session');
    if (!sessionCookie) throw new Error("Chưa đăng nhập!");
    
    const session = JSON.parse(sessionCookie.value);
    if (session.role !== 'admin' && session.username?.toLowerCase() !== 'atheist1504') throw new Error("Không có quyền!");

    const { data, error } = await supabaseAdmin
      .from('shiroi_title_suggestions')
      .select('*, shiroi_users(username, display_name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return { success: true, suggestions: data };
  } catch (error) {
    console.error("❌ Lỗi lấy gợi ý danh hiệu:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 🛠️ SERVER ACTION: Duyệt/Từ chối gợi ý danh hiệu 🍀
 */
export async function handleTitleSuggestionAction(id, status) {
  try {
    const sessionCookie = cookies().get('shiroi_session');
    if (!sessionCookie) throw new Error("Chưa đăng nhập!");
    
    const session = JSON.parse(sessionCookie.value);
    if (session.role !== 'admin' && session.username?.toLowerCase() !== 'atheist1504') throw new Error("Không có quyền!");

    // 🕵️‍♂️ LẤY THÔNG TIN GỢI Ý TRƯỚC KHI CẬP NHẬT 🍀
    const { data: suggestion, error: fetchError } = await supabaseAdmin
      .from('shiroi_title_suggestions')
      .select('*, shiroi_users(id, username, xp)')
      .eq('id', id)
      .single();

    if (fetchError || !suggestion) throw new Error("Không tìm thấy gợi ý!");

    // 🛑 CHỐNG SPAM: Nếu đã duyệt hoặc từ chối rồi thì không xử lý nữa
    if (suggestion.status !== 'pending') {
        throw new Error("Gợi ý này đã được xử lý trước đó!");
    }

    const { error: updateError } = await supabaseAdmin
      .from('shiroi_title_suggestions')
      .update({ status: status })
      .eq('id', id);

    if (updateError) throw updateError;

    // 💎 NẾU CHẤP THUẬN -> THƯỞNG 500 XP CHO NGƯỜI GỢI Ý 🎁
    if (status === 'approved') {
        const userId = suggestion.user_id;
        const currentXp = suggestion.shiroi_users?.xp || 0;
        const rewardXp = 500;

        // 1. Cập nhật XP 🛡️
        await supabaseAdmin
            .from('shiroi_users')
            .update({ xp: currentXp + rewardXp })
            .eq('id', userId);

        // 2. Ghi nhật ký XP 🕰️
        await supabaseAdmin
            .from('shiroi_xp_logs')
            .insert([{ 
                user_id: userId, 
                amount: rewardXp, 
                type: 'mission', 
                reason: `Được chấp nhận gợi ý danh hiệu: ${suggestion.title_name}` 
            }]);

        // 3. Gửi thông báo cho người dùng 🔔
        await createInAppNotification(userId, "Chúc mừng! Gợi ý danh hiệu đã được duyệt 🏆", `Danh hiệu "${suggestion.title_name}" của bạn đã được Admin chấp thuận. Bạn nhận được +500 XP thưởng! 🍀`);

        // 🚀 4. TỰ ĐỘNG THÊM VÀO DANH SÁCH CHÍNH THỨC ✨
        // Tìm cấp độ cao nhất hiện tại
        const { data: maxLevelTitle } = await supabaseAdmin
            .from('shiroi_titles')
            .select('lv')
            .order('lv', { ascending: false })
            .limit(1)
            .single();
        
        const nextLv = (maxLevelTitle?.lv || 0) + 5;

        await supabaseAdmin
            .from('shiroi_titles')
            .insert([{ name: suggestion.title_name, lv: nextLv }]);
    }
    
    return { success: true };
  } catch (error) {
    console.error("❌ Lỗi xử lý gợi ý danh hiệu:", error);
    return { success: false, error: error.message };
  }
}

/**
 * ✨ SERVER ACTION: Thêm danh hiệu chính thức thủ công (Chỉ Admin) 🍀
 */
export async function createOfficialTitleAction(name, lv) {
  try {
    const sessionCookie = cookies().get('shiroi_session');
    if (!sessionCookie) throw new Error("Chưa đăng nhập!");
    
    const session = JSON.parse(sessionCookie.value);
    if (session.role !== 'admin' && session.username?.toLowerCase() !== 'atheist1504') throw new Error("Không có quyền!");

    const { error } = await supabaseAdmin
      .from('shiroi_titles')
      .insert([{ name, lv }]);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("❌ Lỗi thêm danh hiệu:", error);
    return { success: false, error: error.message };
  }
}

/**
 * 🗑️ SERVER ACTION: Tự động dọn dẹp nhật ký tu luyện cũ (Quá 1 tuần) 🍀
 */
export async function cleanupXpLogsAction() {
    try {
        // 🚨 DỪNG KHẨN CẤP: Không được xóa nhật ký vì Trigger Database sẽ trừ XP của người dùng! 🛡️
        // Chúng ta sẽ tìm giải pháp dọn dẹp mà không ảnh hưởng đến tổng điểm sau.
        return { success: true, message: "Cleanup paused for safety." };
    } catch (error) {
        return { success: false };
    }
}

/**
 * 💬 SERVER ACTION: Lấy lịch sử trao đổi của một báo cáo 🍀
 */
export async function getReportMessagesAction(reportId) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return { success: false, error: 'Chưa đăng nhập' };

        const { data, error } = await supabaseAdmin
            .from('shiroi_report_messages')
            .select(`
                *,
                sender:shiroi_users(username, avatar_url, role)
            `)
            .eq('report_id', reportId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return { success: true, messages: data };
    } catch (error) {
        console.error("❌ Lỗi lấy tin nhắn báo cáo:", error.message);
        return { success: false, error: error.message };
    }
}

/**
 * 💬 SERVER ACTION: Gửi tin nhắn phản hồi báo cáo 🍀
 */
export async function sendReportMessageAction(reportId, message) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return { success: false, error: 'Chưa đăng nhập' };

        const isAdmin = user.role === 'admin' || user.username?.toLowerCase() === 'atheist1504';

        // 1. Lưu tin nhắn
        const { data: newMessage, error } = await supabaseAdmin
            .from('shiroi_report_messages')
            .insert([{
                report_id: reportId,
                sender_id: user.id,
                message,
                is_admin_reply: isAdmin
            }])
            .select()
            .single();

        if (error) throw error;

        // 2. Thông báo cho bên còn lại
        const { data: report } = await supabaseAdmin
            .from('shiroi_reports')
            .select('user_id, description')
            .eq('id', reportId)
            .single();

        if (report) {
            const { createInAppNotification } = await import('./notifications');
            if (isAdmin) {
                // Nếu Admin trả lời -> Thông báo cho User
                await createInAppNotification(
                    report.user_id,
                    'Phản hồi từ Ban quản trị 🛡️',
                    `Admin đã trả lời báo cáo của bạn: "${message.substring(0, 50)}..."`,
                    'system',
                    { reportId: reportId }
                );
            } else {
                // Nếu User trả lời -> Thông báo cho Admin/Staff 🛡️
                try {
                    const { data: admins } = await supabaseAdmin.from('shiroi_users').select('id').or('role.eq.admin,username.ilike.atheist1504');
                    const adminIds = admins?.map(a => a.id) || [];
                    
                    const title = `Tin nhắn báo cáo mới! 💬`;
                    const body = `${user.display_name || user.username} đã phản hồi trong báo cáo: "${message.substring(0, 30)}..."`;
                    
                    adminIds.forEach(adminId => {
                         createInAppNotification(adminId, title, body, 'system', { reportId: reportId });
                    });
                } catch (e) {
                    console.warn("⚠️ Lỗi thông báo Admin (Report Reply):", e.message);
                }
            }
        }

        return { success: true, message: newMessage };
    } catch (error) {
        console.error("❌ Lỗi gửi tin nhắn báo cáo:", error.message);
        return { success: false, error: error.message };
    }
}
/**
 * 🕵️‍♂️ SERVER ACTION: Đồng bộ lịch sử đọc truyện với giới hạn 50 bộ 🛡️
 */
export async function syncHistoryToDBAction(mangaId, chapterId) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Chưa đăng nhập" };

    const userId = user.id;
    const client = getDbClient();

    // 1. Cập nhật hoặc thêm mới lịch sử đọc của bộ truyện này
    await client.from('shiroi_history').upsert({ 
      user_id: userId, 
      username: user.username, 
      manga_id: mangaId, 
      chapter_id: chapterId, 
      last_read_at: new Date().toISOString() 
    }, { onConflict: 'user_id, manga_id' });

    // 2. TỐI ƯU DỮ LIỆU: Giới hạn 50 bộ truyện gần nhất/user 🛡️
    const { data: historyList } = await client
      .from('shiroi_history')
      .select('manga_id, last_read_at')
      .eq('user_id', userId)
      .order('last_read_at', { ascending: false });

    if (historyList && historyList.length > 50) {
      const mangaIdsToDelete = historyList.slice(50).map(h => h.manga_id);
      await client
        .from('shiroi_history')
        .delete()
        .eq('user_id', userId)
        .in('manga_id', mangaIdsToDelete);
      
      console.log(`🧹 [History] Đã xóa ${mangaIdsToDelete.length} bộ truyện cũ để giữ giới hạn 50.`);
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Lỗi syncHistoryToDBAction:', error.message);
    return { success: false, error: error.message };
  }
}
