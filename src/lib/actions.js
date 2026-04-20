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
 * đŸ‡»đŸ‡³ HĂ€M HELPER: Láº¥y thá»i gian hiá»‡n táº¡i theo mĂºi giá» Viá»‡t Nam (GMT+7)
 */
const getVietnamTime = () => {
  const now = new Date();
  return new Date(now.getTime() + (7 * 60 * 60 * 1000));
};

/**
 * đŸ“ SERVER ACTION: Láº¥y thĂ´ng tin dung lÆ°á»£ng Ä‘Ă£ sá»­ dá»¥ng
 * TĂ­nh toĂ¡n dá»±a trĂªn cá»™t size_kb trong báº£ng pages vĂ  mangas đŸ€
 */
/**
 * đŸ” SERVER ACTION: ÄÄƒng nháº­p vĂ  táº¡o Session (Cookie)
 * Thay tháº¿ cho viá»‡c chá»‰ dĂ¹ng LocalStorage á»Ÿ Client đŸ€
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

    if (error || !user) throw new Error('KhĂ´ng tĂ¬m tháº¥y tĂ i khoáº£n Shiroi nĂ y!');
    
    if (user.password !== hashed && user.password !== password) {
       throw new Error('Máº­t kháº©u chÆ°a chĂ­nh xĂ¡c! đŸ›¡ï¸');
    }

    // âœ… Táº O SESSION Báº°NG COOKIE (Háº¿t háº¡n sau 7 ngĂ y)
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
 * đŸ” SERVER ACTION: ÄÄƒng kĂ½ tĂ i khoáº£n má»›i vĂ  cáº¥p Session
 * Äá»“ng bá»™ hĂ³a LocalStorage vĂ  Cookie ngay láº­p tá»©c đŸ€
 */
export async function signupAction(userData) {
  try {
    const { username, password } = userData;
    const hashPassword = (pwd) => btoa(pwd + "shiroi-secret-salt").split('').reverse().join('');
    const hashed = hashPassword(password);

    const client = getDbClient();

    // 1. Kiá»ƒm tra trĂ¹ng láº·p
    const { data: existing } = await client
      .from('shiroi_users')
      .select('username')
      .ilike('username', username.trim())
      .single();
    
    if (existing) throw new Error('TĂªn nĂ y Ä‘Ă£ cĂ³ chá»§ nhĂ¢n sá»Ÿ há»¯u rá»“i! đŸ°');

    // 2. Táº¡o tĂ i khoáº£n
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

    // 3. Tá»° Äá»˜NG ÄÄ‚NG NHáº¬P: Táº¡o Session báº±ng Cookie đŸª
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
    console.error('âŒ Lá»—i signupAction:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * đŸ•µï¸â€â™‚ï¸ HĂ€M Há»– TRá»¢: Láº¥y thĂ´ng tin ngÆ°á»i dĂ¹ng Ä‘ang Ä‘Äƒng nháº­p vá»›i kháº£ nÄƒng tá»± khĂ´i phá»¥c (Auto-healing) đŸ›¡ï¸
 */
export async function getAuthenticatedUser() {
  const sessionData = cookies().get('shiroi_session');
  if (!sessionData) return null;

  try {
    let user = JSON.parse(sessionData.value);
    
    // đŸ‘ CÆ  CHáº¾ Tá»° KHĂ”I PHá»¤C (AUTO-HEALING) â¡
    // Chá»‰ truy váº¥n Database náº¿u session thiáº¿u ID quan trá»ng cá»§a Admin whitelist đŸ€
    if (!user.id && user.username?.toLowerCase() === 'atheist1504') {
      console.log(`đŸ‘ [Auth] PhĂ¡t hiá»‡n session thiáº¿u ID cho Admin ${user.username}, Ä‘ang khĂ´i phá»¥c...`);
      const client = getDbClient();
      const { data, error } = await client
        .from('shiroi_users')
        .select('id, username, role')
        .eq('username', user.username)
        .single();
      
      if (!error && data) {
        user.id = data.id;
        user.role = data.role || 'admin';
        console.log(`âœ… [Auth] KhĂ´i phá»¥c ID thĂ nh cĂ´ng: ${user.id}`);
        
        // Cáº­p nháº­t láº¡i Cookie Ä‘á»ƒ láº§n sau khĂ´ng pháº£i query ná»¯a đŸª
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
    console.error("âŒ Lá»—i giáº£i mĂ£ Session:", err.message);
    return null;
  }
}

/**
 * đŸ•µï¸â€â™‚ï¸ HĂ€M Há»– TRá»¢: Kiá»ƒm tra quyá»n Admin tá»« Cookie
 */
async function checkAdminAuth() {
  const user = await getAuthenticatedUser();
  if (!user) return false;
  
  // đŸ›¡ï¸ Báº¢O Vá»† CHá»¦ Sá» Há»®U: Whitelist tĂ i khoáº£n atheist1504 luĂ´n cĂ³ quyá»n admin đŸ€
  if (user.username?.toLowerCase() === 'atheist1504') return true;
  return user.role === 'admin';
}

/**
 * đŸ› ï¸ HĂ€M Há»– TRá»¢: Láº¥y Client DB phĂ¹ há»£p (Admin hoáº·c Anon dá»± phĂ²ng) đŸ›¡ï¸
 */
function getDbClient() {
  if (supabaseAdmin) return supabaseAdmin;
  console.warn("â ï¸ [Auth] KhĂ´ng tĂ¬m tháº¥y Admin Client, sá»­ dá»¥ng Anon Client lĂ m dá»± phĂ²ng.");
  return supabase;
}

/**
 * đŸ“ SERVER ACTION: Láº¥y thĂ´ng tin dung lÆ°á»£ng Ä‘Ă£ sá»­ dá»¥ng
 */
export async function getStorageUsageAction() {
  console.log("đŸ“ [Storage] Báº¯t Ä‘áº§u láº¥y thĂ´ng sá»‘...");
  try {
    // đŸ›¡ï¸ Kiá»ƒm tra quyá»n (Silent check)
    const isAdmin = await checkAdminAuth().catch(err => {
      console.warn("â ï¸ checkAdminAuth sáº­p:", err.message);
      return false;
    });

    if (!isAdmin) {
      return { success: true, totalGB: 0, totalKB: 0, limitGB: 10, debug: "NOT_ADMIN" };
    }
    
    // đŸ›¡ï¸ Kiá»ƒm tra Client
    if (!supabaseAdmin) {
       return { success: true, totalGB: 0, totalKB: 0, limitGB: 10, debug: "NO_ADMIN_CLIENT" };
    }

    // đŸ›¡ï¸ 3. TĂ­nh toĂ¡n dung lÆ°á»£ng (Tá»‘i Æ°u hĂ³a truy váº¥n) â¡
    // Láº¥y toĂ n bá»™ size_kb thay vĂ¬ giá»›i háº¡n 1000 báº£n ghi Ä‘á»ƒ Ä‘áº£m báº£o tĂ­nh chuáº©n xĂ¡c
    const { data: pagesData, error: pagesError } = await supabaseAdmin
      .from('pages')
      .select('size_kb'); 
    
    if (pagesError) {
      console.warn("â ï¸ Pages Query Error:", pagesError.message);
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
    console.error("âŒ Lá»—i náº·ng getStorageUsageAction:", error.message);
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
 * đŸ—‘ï¸ SERVER ACTION: XĂ³a trá»n bá»™ truyá»‡n (Data + R2)
 */
export async function deleteMangaAction(mangaId) {
  try {
    if (!(await checkAdminAuth())) throw new Error("Dá»«ng láº¡i! Chá»‰ quáº£n trá»‹ viĂªn má»›i cĂ³ quyá»n hĂ nh quyáº¿t nĂ y! đŸ›¡ï¸");
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
 * đŸ« SERVER ACTION: Láº¥y vĂ© táº£i áº£nh lĂªn R2 (DĂ nh cho cĂ¡c file lá»›n hoáº·c háº¡ táº§ng cĂ³ CORS)
 */
export async function getUploadUrlAction(fileName) {
  try {
    if (!(await checkAdminAuth())) throw new Error("Quyá»n háº¡n khĂ´ng Ä‘á»§! đŸ›¡ï¸");
    if (!fileName) throw new Error('Thiáº¿u tĂªn tá»‡p!');
    const data = await getPresignedUploadUrl(fileName);
    return { success: true, ...data };
  } catch (error) {
    console.error('Lá»—i láº¥y Signed URL:', error);
    return { success: false, error: error.message };
  }
}

/**
 * đŸŒ©ï¸ SERVER ACTION: Upload Chapter Page (Proxy Mode đŸ€)
 * Kháº¯c phá»¥c triá»‡t Ä‘á»ƒ lá»—i CORS báº±ng cĂ¡ch táº£i lĂªn tá»« mĂ´i trÆ°á»ng Server.
 */
export async function uploadChapterPageAction(formData) {
  try {
    if (!(await checkAdminAuth())) throw new Error("Quyá»n háº¡n khĂ´ng Ä‘á»§! đŸ›¡ï¸");

    const file = formData.get('file');
    const fileName = formData.get('fileName');

    if (!file || !fileName) throw new Error("Thiáº¿u dá»¯ liá»‡u upload!");

    const { uploadToR2 } = await import('./r2');
    const result = await uploadToR2(file, fileName);

    return { success: true, url: result };
  } catch (error) {
    console.error('âŒ [Server] Lá»—i uploadChapterPageAction:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * đŸŒ©ï¸ SERVER ACTION: Upload Image to R2
 */
export async function uploadImageAction(formData) {
  try {
    if (!(await checkAdminAuth())) throw new Error("Quyá»n háº¡n khĂ´ng Ä‘á»§! đŸ›¡ï¸");
    const file = formData.get('file');
    if (!file) throw new Error("KhĂ´ng tĂ¬m tháº¥y file áº£nh!");
    
    // Sá»­ dá»¥ng helper uploadToR2 cĂ³ sáºµn
    const { uploadToR2 } = await import('./r2');
    const fileName = `covers/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const result = await uploadToR2(file, fileName);
    
    if (!result.success) throw new Error(result.error);
    return { success: true, url: result.url };
  } catch (error) {
    console.error('Lá»—i uploadImageAction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * đŸ”” SERVER ACTION: Gá»­i thĂ´ng bĂ¡o chÆ°Æ¡ng má»›i
 * Xá»­ lĂ½ cáº£ Push Notification vĂ  In-app cho ngÆ°á»i theo dĂµi đŸ€
 */
export async function notifyNewChapterAction(mangaId, mangaName, chapterNumber, coverImage) {
  try {
    const client = getDbClient();
    const title = `${mangaName} vá»«a cĂ³ chÆ°Æ¡ng ${chapterNumber}! đŸ“`;
    
    // 1. Gá»­i Push Notification (Topic-based) đŸŒ©ï¸
    await sendMangaNotification(title, mangaName, mangaId, coverImage);

    // 2. Gá»­i In-app Notification cho toĂ n bá»™ ngÆ°á»i theo dĂµi đŸ””
    const { data: followers } = await client
      .from('shiroi_follows')
      .select('user_id')
      .eq('manga_id', mangaId);
    
    if (followers && followers.length > 0) {
        const body = `SiĂªu pháº©m "${mangaName}" vá»«a cáº­p nháº­t chÆ°Æ¡ng ${chapterNumber}. Äá»c ngay nĂ o! đŸ€`;
        const notifType = 'chapter_update';
        const notifData = { mangaId, chapterId: null, mangaName, chapterNumber }; // chapterId null as we might not have it here, but we have mangaId

        // Táº¡o thĂ´ng bĂ¡o trong á»©ng dá»¥ng cho tá»«ng follower (Xá»­ lĂ½ hĂ ng loáº¡t) â¡
        const notificationPromises = followers.map(f => 
            createInAppNotification(f.user_id, title, body, notifType, notifData)
        );
        await Promise.allSettled(notificationPromises);
    }

    return { success: true };
  } catch (error) {
    console.warn('â ï¸ Lá»—i gá»­i thĂ´ng bĂ¡o chÆ°Æ¡ng má»›i:', error);
    return { success: true }; 
  }
}

/**
 * đŸ“ SERVER ACTION: Ghi Log XP Báº£o Máº­t
 */
export async function recordXpLogAction(userId, amount, type, reason = null) {
  try {
    if (!userId || userId === 'undefined' || !amount) {
      return { success: false, error: 'Thiáº¿u Ä‘á»‹nh danh ngÆ°á»i dĂ¹ng (User ID) hoáº·c thĂ´ng sá»‘ XP' };
    }
    
    const client = getDbClient();

    // đŸ›¡ï¸ KIá»‚M TRA GIá»I Háº N XP HĂ€NG NGĂ€Y (CHá»ˆ CHO BĂŒNH LUáº¬N) đŸ€
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
            const MAX_COMMENT_XP = 100; // Khá»›p vá»›i xp.js
            
            if (totalToday + amount > MAX_COMMENT_XP) {
                return { success: false, error: 'ÄĂ£ Ä‘áº¡t giá»›i háº¡n XP bĂ¬nh luáº­n trong ngĂ y (100 XP)! đŸ›¡ï¸' };
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
    console.error('âŒ Lá»—i recordXpLogAction:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * đŸ’ SERVER ACTION: Cá»™ng XP khi Ä‘á»c chÆ°Æ¡ng (Báº£o máº­t đŸ›¡ï¸)
 */
export async function addReadXPAction(mangaId, chapterId) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user || !user.id) {
       throw new Error("PhiĂªn lĂ m viá»‡c lá»—i (Thiáº¿u ID). Vui lĂ²ng Ä‘Äƒng xuáº¥t vĂ  Ä‘Äƒng nháº­p láº¡i! đŸ›¡ï¸");
    }

    const userId = user.id;
    const client = getDbClient();
    // 1. Kiá»ƒm tra xem Ä‘Ă£ Ä‘á»c chÆ°Æ¡ng nĂ y chÆ°a (TrĂ¡nh spam)
    const { data: alreadyRead } = await client
      .from('shiroi_read_chapters')
      .select('id')
      .eq('user_id', userId)
      .eq('chapter_id', chapterId)
      .single();

    if (alreadyRead) return { success: false, error: 'ÄĂ£ nháº­n thÆ°á»Ÿng cho chÆ°Æ¡ng nĂ y' };

    // 3. Ghi log nháº­t kĂ½ (Database Trigger sáº½ tá»± Ä‘á»™ng cá»™ng XP vĂ o báº£ng Users) đŸ›¡ï¸
    await client.from('shiroi_read_chapters').insert({ 
      user_id: userId, 
      username: user.username, 
      chapter_id: chapterId, 
      manga_id: mangaId, 
      read_at: new Date().toISOString() 
    });
    
    // 4. Ghi log vĂ  nháº­n XP đŸ’
    const resLog = await recordXpLogAction(userId, 20, 'read', chapterId);
    if (!resLog.success) return resLog;

    const { data: updatedUser } = await client.from('shiroi_users').select('*').eq('id', userId).single();

    // 5. Kiá»ƒm tra hoĂ n thĂ nh nhiá»‡m vá»¥ Äá»c truyá»‡n (Silent check) đŸ†
    try {
        const { count: dailyRead } = await client
            .from('shiroi_read_chapters')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('read_at', getStartOfVNDay().toISOString());
        
        if (dailyRead === 1 || dailyRead === 3) {
            const mTitle = dailyRead === 1 ? "Äá»™c hĂ nh giáº£ I" : "Äá»™c hĂ nh giáº£ II";
            await createInAppNotification(userId, `HoĂ n thĂ nh nhiá»‡m vá»¥! đŸ¯`, `Báº¡n Ä‘Ă£ xong "${mTitle}". HĂ£y má»Ÿ Kho thĂ nh tá»±u Ä‘á»ƒ nháº­n thÆ°á»Ÿng! đŸ€`, 'system', { missionKey: dailyRead === 1 ? 'daily_read_1' : 'daily_read_3' });
        }
    } catch (e) {}

    return { success: true, xpGain: 20, user: updatedUser };
  } catch (error) {
    console.error('Lá»—i addReadXPAction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * đŸ“… SERVER ACTION: Äiá»ƒm danh hĂ ng ngĂ y (Báº£o máº­t đŸ›¡ï¸)
 */
export async function performCheckInAction() {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user || !user.id) {
       throw new Error("PhiĂªn lĂ m viá»‡c lá»—i (Thiáº¿u ID). Vui lĂ²ng Ä‘Äƒng xuáº¥t vĂ  Ä‘Äƒng nháº­p láº¡i! đŸ›¡ï¸");
    }

    const userId = user.id;
    const client = getDbClient();
    // 1. Láº¥y tráº¡ng thĂ¡i Ä‘iá»ƒm danh hiá»‡n táº¡i tá»« DB (TrĂ¡nh hack thá»i gian á»Ÿ Client)
    const { data: userData, error: fetchError } = await client
      .from('shiroi_users')
      .select('xp, last_check_in, check_in_streak')
      .eq('id', userId)
      .single();

    if (fetchError || !userData) throw new Error("KhĂ´ng tĂ¬m tháº¥y thĂ´ng tin ngÆ°á»i dĂ¹ng");
    
    const startOfToday = getStartOfVNDay();
    const lastCheck = userData.last_check_in ? new Date(userData.last_check_in) : null;
    
    // 1. Kiá»ƒm tra xem Ä‘Ă£ Ä‘iá»ƒm danh trong ngĂ y hĂ´m nay chÆ°a (theo má»‘c 0h Viá»‡t Nam) đŸ‡»đŸ‡³
    const isSameDay = lastCheck && lastCheck >= startOfToday;
 
    if (isSameDay) return { success: false, error: 'Báº¡n Ä‘Ă£ Ä‘iá»ƒm danh hĂ´m nay rá»“i!' };
 
    // 2. TĂNH TOĂN CHUá»–I (STREAK) CHUáº¨N đŸ›¡ï¸
    let newStreak = 1;
    
    if (lastCheck) {
        // TĂ­nh khoáº£ng cĂ¡ch ngĂ y (dá»±a trĂªn má»‘c 00:00:00 giá» VN)
        const lastCheckVnStr = new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Ho_Chi_Minh'}).format(lastCheck);
        const lastCheckDate = new Date(`${lastCheckVnStr}T00:00:00+07:00`);
        
        const nowDate = startOfToday;
        const diffTime = Math.abs(nowDate - lastCheckDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
 
        if (diffDays === 1) {
            // Äiá»ƒm danh liĂªn tiáº¿p -> TÄƒng chuá»—i đŸ€
            newStreak = (userData.check_in_streak || 0) + 1;
        } else if (diffDays > 1) {
            // Nghá»‰ quĂ¡ 1 ngĂ y -> Reset chuá»—i vá» 1 đŸŒµ
            newStreak = 1;
        } else {
            // TrÆ°á»ng há»£p hy há»¯u (lá»‡ch giá») -> Giá»¯ nguyĂªn hoáº·c tÄƒng 1
            newStreak = (userData.check_in_streak || 0) + 1;
        }
    }
 
    // đŸ”„ RESET CHUá»–I KHI SANG THĂNG Má»I (Náº¿u báº¡n muá»‘n chuá»—i reset theo thĂ¡ng Leaderboard)
    // Náº¿u báº¡n muá»‘n chuá»—i lĂ  xuyĂªn suá»‘t Ä‘á»i ngÆ°á»i thĂ¬ cĂ³ thá»ƒ bá» qua bÆ°á»›c nĂ y.
    /*
    if (lastCheck && (lastCheck.getUTCMonth() !== now.getUTCMonth() || lastCheck.getUTCFullYear() !== now.getUTCFullYear())) {
        newStreak = 1;
    }
    */

    // đŸ† TĂNH TOĂN XP THÆ¯á»NG (100 XP Máº¶C Äá»NH + BONUS CHUá»–I) đŸ’
    const xpGain = (XP_REWARDS.DAILY_CHECKIN || 100) + getStreakBonus(newStreak);

    // 3. Ghi log nháº­t kĂ½ ÄIá»‚M DANH (Sá»­ dá»¥ng 'check_in' cĂ³ gáº¡ch dÆ°á»›i chuáº©n hĂ³a) đŸ“…
    const resLog = await recordXpLogAction(userId, xpGain, 'check_in', `Streak: ${newStreak}`);
    
    if (!resLog.success) {
        return { success: false, error: resLog.error || 'Lá»—i Ä‘iá»ƒm danh!' };
    }

    // Cáº­p nháº­t cĂ¡c thĂ´ng tin khĂ¡c (streak, ngĂ y Ä‘iá»ƒm danh) - XP sáº½ do Trigger lo đŸ›¡ï¸
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
    
    // đŸ”” Gá»­i thĂ´ng bĂ¡o trong á»©ng dá»¥ng (Silent fail)
    try {
        const title = `Äiá»ƒm Danh ThĂ nh CĂ´ng! đŸ“…`;
        const body = `Báº¡n vá»«a nháº­n Ä‘Æ°á»£c ${xpGain} XP (Chuá»—i: ${newStreak} ngĂ y). đŸ€`;
        await createInAppNotification(userId, title, body, 'system', { streak: newStreak });
    } catch (e) {}

    return { success: true, user: updatedUser, xpGain };
  } catch (error) {
    console.error('Lá»—i performCheckInAction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * đŸ“ SERVER ACTION: LÆ°u hoáº·c Cáº­p nháº­t Manga (Báº£o máº­t đŸ›¡ï¸)
 */
export async function saveMangaAction(mangaData, mangaId = null) {
  try {
    // 1. Kiá»ƒm tra Admin Auth
    const isAdmin = await checkAdminAuth().catch(() => false);
    if (!isAdmin) throw new Error("Quyá»n háº¡n khĂ´ng Ä‘á»§! đŸ›¡ï¸");
    
    const client = getDbClient();

    if (mangaId) {
      console.log(`[Admin] Cáº­p nháº­t truyá»‡n ID: ${mangaId}`);
      // Cáº­p nháº­t
      const { data, error } = await client
        .from('mangas')
        .update({
          ...mangaData
        })
        .eq('id', mangaId)
        .select()
        .single();
      
      if (error) {
        console.error("âŒ Lá»—i Update Manga:", error);
        throw error;
      }
      return { success: true, data };
    } else {
      console.log(`[Admin] Táº¡o truyá»‡n má»›i: ${mangaData.title}`);
      // ThĂªm má»›i
      const { data, error } = await client
        .from('mangas')
        .insert([{
          ...mangaData
        }])
        .select()
        .single();
      
      if (error) {
        console.error("âŒ Lá»—i Insert Manga:", error);
        throw error;
      }
      return { success: true, data };
    }
  } catch (error) {
    console.error('âŒ Lá»—i saveMangaAction:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * đŸ“¤ SERVER ACTION: ÄÄƒng chÆ°Æ¡ng má»›i (Báº£o máº­t đŸ›¡ï¸)
 * Xá»­ lĂ½: Insert Chapter -> Insert Pages -> Send Notification
 */
export async function publishChapterAction(mangaId, mangaTitle, chapterData, pagesData, coverImage) {
  try {
    // 1. Kiá»ƒm tra quyá»n Admin
    if (!(await checkAdminAuth())) throw new Error("Quyá»n háº¡n khĂ´ng Ä‘á»§! đŸ›¡ï¸");

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

    // 4. Gá»­i thĂ´ng bĂ¡o tá»± Ä‘á»™ng (Silent fail - khĂ´ng lĂ m cháº¿t luá»“ng upload) đŸ””đŸ€
    try {
        const title = `ChÆ°Æ¡ng ${chapter.chapter_number} vá»«a ra máº¯t! đŸ“`;
        
        // A. Gá»­i Push Broadcast (Topic)
        await sendMangaNotification(title, mangaTitle, mangaId, coverImage);

        // B. Gá»­i In-app Notification cho toĂ n bá»™ ngÆ°á»i theo dĂµi
        const { data: followers } = await client
            .from('shiroi_follows')
            .select('user_id')
            .eq('manga_id', mangaId);
        
        if (followers && followers.length > 0) {
            const body = `SiĂªu pháº©m "${mangaTitle}" vá»«a cáº­p nháº­t chÆ°Æ¡ng ${chapter.chapter_number}. Äá»c ngay nĂ o!`;
            const notifType = 'chapter_update';
            const notifData = { mangaId, chapterId: chapter.id, mangaName: mangaTitle, chapterNumber: chapter.chapter_number };

            // Táº¡o thĂ´ng bĂ¡o trong á»©ng dá»¥ng cho tá»«ng follower
            const notificationPromises = followers.map(f => 
                createInAppNotification(f.user_id, title, body, notifType, notifData)
            );
            await Promise.allSettled(notificationPromises);
        }
    } catch (notifyErr) {
        console.warn("Lá»—i gá»­i thĂ´ng bĂ¡o (bá» qua):", notifyErr);
    }

    return { success: true, chapterId: chapter.id };
  } catch (error) {
    console.error('Lá»—i publishChapterAction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * đŸ“ SERVER ACTION: LÆ°u dá»¯ liá»‡u chÆ°Æ¡ng vĂ  cĂ¡c trang (Báº£o máº­t đŸ›¡ï¸)
 */
export async function saveChapterDataAction(chapterPayload, pagesData, isEditing, existingChapterId = null) {
  console.log(`đŸ€ [Server] Báº¯t Ä‘áº§u lÆ°u chÆ°Æ¡ng - Editing: ${isEditing}, ChapID: ${existingChapterId}`);
  try {
    const isAdmin = await checkAdminAuth().catch(() => false);
    if (!isAdmin) throw new Error("Quyá»n háº¡n khĂ´ng Ä‘á»§! đŸ›¡ï¸");

    const client = getDbClient();
    let chapId = existingChapterId;

    // 1. Xá»­ lĂ½ Chapter (DĂ¹ng UPSERT Ä‘á»ƒ an toĂ n tuyá»‡t Ä‘á»‘i) đŸ›¡ï¸
    const chapterToSave = {
      ...chapterPayload
    };

    if (!isEditing) {
       // Náº¿u lĂ  táº¡o má»›i, kiá»ƒm tra trĂ¹ng láº·p theo sá»‘ chÆ°Æ¡ng
       const { data: existing } = await client
         .from("chapters")
         .select("id")
         .eq("manga_id", chapterPayload.manga_id)
         .eq("chapter_number", chapterPayload.chapter_number)
         .maybeSingle();
       
       if (existing) {
         console.log("â™»ï¸ [Server] ÄĂ£ tĂ¬m tháº¥y chÆ°Æ¡ng tÆ°Æ¡ng á»©ng, thá»±c hiá»‡n cáº­p nháº­t ghi Ä‘Ă¨.");
         chapId = existing.id;
       }
    }

    if (chapId) {
        const { error: upError } = await client
          .from("chapters")
          .update(chapterToSave)
          .eq("id", chapId);
        if (upError) throw new Error(`Lá»—i cáº­p nháº­t Chapter: ${upError.message}`);
    } else {
        const { data: newChap, error: inError } = await client
          .from("chapters")
          .insert([chapterToSave])
          .select()
          .single();
        if (inError) throw new Error(`Lá»—i táº¡o má»›i Chapter: ${inError.message}`);
        chapId = newChap.id;
    }

    console.log(`âœ… [Server] Chapter ${chapId} OK. Äang lÆ°u ${pagesData.length} trang truyá»‡n...`);

    // 2. XĂ³a cĂ¡c trang cÅ© (ghi Ä‘Ă¨) đŸ§¹
    await client.from("pages").delete().eq("chapter_id", chapId);

    // 3. ChĂ¨n cĂ¡c trang má»›i (Batch Insert) â¡
    const pagesWithId = pagesData.map(p => ({ 
      ...p, 
      chapter_id: chapId
    }));

    const { error: pagesError } = await client.from("pages").insert(pagesWithId);
    if (pagesError) throw new Error(`Lá»—i lÆ°u Pages: ${pagesError.message}`);

    // â¡ XĂ“A CACHE Äá»‚ ÄÆ¯A DATA Má»I LĂN READER NGAY Láº¬P Tá»¨C đŸ€
    revalidatePath(`/read/${chapId}`);
    revalidatePath(`/manga/${chapterPayload.manga_id}`);
    revalidatePath('/');

    return { success: true, chapterId: chapId };
  } catch (error) {
    console.error('âŒ [Server] Lá»–I saveChapterDataAction:', error.message);
    return { success: false, error: error.message || "Lá»—i Server Action" };
  }
}

/**
 * đŸ’– SERVER ACTION: Theo dĂµi / Bá» theo dĂµi truyá»‡n (Báº£o máº­t đŸ›¡ï¸)
 */
export async function toggleFollowAction(mangaId, isFollowed) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user || !user.id) {
       throw new Error("PhiĂªn lĂ m viá»‡c lá»—i (Thiáº¿u ID). Vui lĂ²ng Ä‘Äƒng xuáº¥t vĂ  Ä‘Äƒng nháº­p láº¡i! đŸ›¡ï¸");
    }

    const userId = user.id;
    const client = getDbClient();

    if (!isFollowed) {
      // Tiáº¿n hĂ nh Follow
      const { error } = await client
        .from('shiroi_follows')
        .insert({ user_id: userId, manga_id: mangaId });
      
      if (error) throw error;
      return { success: true, followed: true };
    } else {
      // Tiáº¿n hĂ nh Unfollow
      const { error } = await client
        .from('shiroi_follows')
        .delete()
        .eq('user_id', userId)
        .eq('manga_id', mangaId);
      
      if (error) throw error;
      return { success: true, followed: false };
    }
  } catch (error) {
    console.error('Lá»—i toggleFollowAction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * đŸ SERVER ACTION: Bá»‘c quĂ  may máº¯n hĂ ng ngĂ y (Báº£o máº­t đŸ›¡ï¸)
 */
export async function performLuckyDrawAction() {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user || !user.id) {
       throw new Error("PhiĂªn lĂ m viá»‡c lá»—i (Thiáº¿u ID). Vui lĂ²ng Ä‘Äƒng xuáº¥t vĂ  Ä‘Äƒng nháº­p láº¡i! đŸ›¡ï¸");
    }

    const userId = user.id;
    const client = getDbClient();

    // 1. TĂ­nh toĂ¡n pháº§n thÆ°á»Ÿng ngáº«u nhiĂªn (Gacha logic)
    const tiers = [10, 20, 30, 40, 50, 100, 500];
    const weights = [40, 30, 15, 8, 4, 2.5, 0.5]; // Tá»•ng = 100%
    
    let randomValue = Math.random() * 100;
    let sum = 0;
    let xpGain = 10; // Máº·c Ä‘á»‹nh

    for (let i = 0; i < tiers.length; i++) {
      sum += weights[i];
      if (randomValue <= sum) {
        xpGain = tiers[i];
        break;
      }
    }

    // 2. Ghi vĂ o Nháº­t kĂ½ (Database Unique Index sáº½ cháº·n náº¿u bá»‘c láº§n 2)
    const resLog = await recordXpLogAction(userId, xpGain, 'lucky_draw', `May máº¯n hĂ ng ngĂ y: +${xpGain} XP`);
    
    if (!resLog.success) {
      if (resLog.error?.includes('duplicate key') || resLog.error?.includes('23505')) {
         return { success: false, error: 'HĂ´m nay váº­n may Ä‘Ă£ cáº¡n, hĂ£y quay láº¡i vĂ o ngĂ y mai! đŸ’®' };
      }
      return { success: false, error: resLog.error || 'Lá»—i bá»‘c quĂ !' };
    }

    // 3. Cáº­p nháº­t thá»i gian bá»‘c quĂ  cuá»‘i cĂ¹ng vĂ o báº£ng Users đŸ›¡ï¸
    const { data: updatedUser, error: upError } = await client
      .from('shiroi_users')
      .update({ last_lucky_draw: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (upError) {
       console.warn("â ï¸ [Server] KhĂ´ng thá»ƒ cáº­p nháº­t last_lucky_draw (váº«n cá»™ng Ä‘iá»ƒm xong):", upError.message);
    }

    // ThĂ nh cĂ´ng! Trigger sáº½ tá»± Ä‘á»™ng cá»™ng Ä‘iá»ƒm vĂ o báº£ng Users.
    // đŸ”” Gá»­i thĂ´ng bĂ¡o trong á»©ng dá»¥ng (Silent fail)
    try {
        const title = `Bá»‘c QuĂ  May Máº¯n! đŸ`;
        const body = `ChĂºc má»«ng! Báº¡n vá»«a nháº­n Ä‘Æ°á»£c ${xpGain} XP tá»« Há»™p QuĂ  Shiroi. đŸ€`;
        await createInAppNotification(userId, title, body, 'system', { xpGain });
    } catch (e) {}

    return { success: true, xpGain, user: updatedUser };
  } catch (error) {
    console.error('Lá»—i performLuckyDrawAction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * đŸ© SERVER ACTION: Gá»­i bĂ¡o cĂ¡o lá»—i chÆ°Æ¡ng
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
    console.error('Lá»—i submitReportAction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * đŸ•µï¸â€â™‚ï¸ SERVER ACTION: Láº¥y danh sĂ¡ch bĂ¡o cĂ¡o (Chá»‰ Admin)
 */
export async function getReportsAction() {
  try {
    if (!(await checkAdminAuth())) throw new Error("Quyá»n háº¡n khĂ´ng Ä‘á»§! đŸ›¡ï¸");
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
    console.error('Lá»—i getReportsAction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * đŸ› ï¸ SERVER ACTION: Cáº­p nháº­t tráº¡ng thĂ¡i bĂ¡o cĂ¡o (Chá»‰ Admin)
 */
export async function updateReportStatusAction(reportId, status) {
  try {
    if (!(await checkAdminAuth())) throw new Error("Quyá»n háº¡n khĂ´ng Ä‘á»§! đŸ›¡ï¸");
    const client = getDbClient();

    const { error } = await client
      .from('shiroi_reports')
      .update({ status })
      .eq('id', reportId);

    if (error) throw error;
    
    revalidatePath('/admin/reports');
    return { success: true };
  } catch (error) {
    console.error('Lá»—i updateReportStatusAction:', error);
    return { success: false, error: error.message };
  }
}
/**
 * đŸ¯ SERVER ACTION: Nháº­n thÆ°á»Ÿng nhiá»‡m vá»¥ (Báº£o máº­t đŸ›¡ï¸)
 */
export async function claimMissionRewardAction(missionKey, mangaId = null) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !user.id) throw new Error("Vui lĂ²ng Ä‘Äƒng nháº­p Ä‘á»ƒ nháº­n thÆ°á»Ÿng! đŸ€");

    const userId = user.id;
    const client = getDbClient();

    // 1. Kiá»ƒm tra xem Ä‘Ă£ nháº­n thÆ°á»Ÿng chÆ°a (TrĂ¡nh double claim)
    const { MISSIONS } = await import('./missions');
    const mission = MISSIONS[missionKey];
    const isDaily = mission?.type === 'daily';

    let query = client
      .from('shiroi_mission_claims')
      .select('id, claimed_at')
      .eq('user_id', userId)
      .eq('mission_key', missionKey);

    if (isDaily) {
        // Náº¿u lĂ  nhiá»‡m vá»¥ hĂ ng ngĂ y: Chá»‰ tĂ­nh lÆ°á»£t nháº­n trong hĂ´m nay (Má»‘c 0h Viá»‡t Nam) đŸ‡»đŸ‡³
        const startOfTodayISO = getStartOfVNDay().toISOString();
        query = query.gte('claimed_at', startOfTodayISO);
    }

    const { data: existing } = await query.maybeSingle();

    if (existing) {
        throw new Error(isDaily ? "HĂ´m nay báº¡n Ä‘Ă£ nháº­n thÆ°á»Ÿng nhiá»‡m vá»¥ nĂ y rá»“i! HĂ£y quay láº¡i vĂ o ngĂ y mai đŸ›¡ï¸" : "Báº¡n Ä‘Ă£ nháº­n pháº§n thÆ°á»Ÿng nĂ y rá»“i! đŸ›¡ï¸");
    }

    // 2. Láº¥y Ä‘á»‹nh nghÄ©a nhiá»‡m vá»¥ Ä‘á»ƒ xĂ¡c Ä‘á»‹nh XP (TrĂ¡nh Client gá»­i XP lĂ¡o)
    let rewardXp = 0;
    
    if (missionKey.startsWith('conqueror_')) {
        rewardXp = 10000;
    } else if (missionKey.startsWith('finish_series_')) {
        // PhĂ¢n loáº¡i Tier cho bá»™ truyá»‡n Ä‘Ă£ hoĂ n thĂ nh
        const mangaIdFromKey = missionKey.replace('finish_series_', '');
        
        // 1. Kiá»ƒm tra sá»‘ chÆ°Æ¡ng thá»±c táº¿
        const { count } = await client.from('chapters').select('id', { count: 'exact', head: true }).eq('manga_id', mangaIdFromKey);
        const total = count || 0;

        // 2. Kiá»ƒm tra thá»ƒ loáº¡i One-shot
        const { data: manga } = await client.from('mangas').select('genres').eq('id', mangaIdFromKey).single();
        const isOneShotGenre = manga?.genres?.some(g => {
            const normalized = g.toLowerCase().replace(/[^a-z]/g, '');
            return normalized.includes('oneshot');
        });

        if (total <= 1 || isOneShotGenre) {
            throw new Error("Truyá»‡n One-shot khĂ´ng Ă¡p dá»¥ng pháº§n thÆ°á»Ÿng Chinh phá»¥c! đŸ›¡ï¸");
        }

        // 3. Kiá»ƒm tra sá»‘ lÆ°á»£ng Ä‘Ă£ Ä‘á»c
        const { count: n } = await client.from('shiroi_read_chapters').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('manga_id', mangaIdFromKey);
        
        if (n < 20) rewardXp = 200;
        else if (n < 50) rewardXp = 500;
        else if (n < 100) rewardXp = 1000;
        else rewardXp = 2000;

    } else {
        const mission = MISSIONS[missionKey];
        if (!mission) throw new Error("Nhiá»‡m vá»¥ khĂ´ng tá»“n táº¡i! đŸ•µï¸â€â™‚ï¸");
        rewardXp = mission.xp;
    }

    // 3. Ghi log nháº­n thÆ°á»Ÿng (Atomic operation)
    const { error: claimError } = await client
      .from('shiroi_mission_claims')
      .insert([{
        user_id: userId,
        mission_key: missionKey,
        manga_id: mangaId,
        reward_xp: rewardXp
      }]);

    if (claimError) throw claimError;

    // 4. Ghi log XP (Trigger sáº½ tá»± cá»™ng cho user)
    const resLog = await recordXpLogAction(userId, rewardXp, 'mission', missionKey);
    if (!resLog.success) throw new Error(resLog.error);

    const { data: updatedUser } = await client.from('shiroi_users').select('*').eq('id', userId).single();

    // 5. Gá»­i thĂ´ng bĂ¡o trong á»©ng dá»¥ng (Silent fail) đŸ””đŸ€
    try {
        const title = `Nháº­n thÆ°á»Ÿng thĂ nh cĂ´ng! đŸ’`;
        const body = `Báº¡n vá»«a nháº­n Ä‘Æ°á»£c ${rewardXp} XP tá»« nhiá»‡m vá»¥ ${mission?.title || 'Chinh phá»¥c'}.`;
        await createInAppNotification(userId, title, body, 'system', { missionKey });
    } catch (e) {
        console.warn("â ï¸ [Notification] Lá»—i gá»­i thĂ´ng bĂ¡o nháº­n thÆ°á»Ÿng:", e.message);
    }

    return { success: true, rewardXp, user: updatedUser };
  } catch (error) {
    console.error('âŒ Lá»—i claimMissionRewardAction:', error.message);
    return { success: false, error: error.message };
  }
}
/**
 * đŸ“ SERVER ACTION: Gá»­i bĂ¬nh luáº­n vĂ  xá»­ lĂ½ thĂ´ng bĂ¡o pháº£n há»“i (Real-time Readiness) đŸ’¬đŸ€
 */
export async function addCommentAction(commentData) {
    try {
      const user = await getAuthenticatedUser();
      if (!user || !user.id) throw new Error("Vui lĂ²ng Ä‘Äƒng nháº­p Ä‘á»ƒ bĂ¬nh luáº­n! đŸ›¡ï¸");
  
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
                  const title = `${user.display_name || user.username} Ä‘Ă£ pháº£n há»“i bĂ¬nh luáº­n cá»§a báº¡n! đŸ’¬`;
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
              console.warn("â ï¸ Lá»—i thĂ´ng bĂ¡o:", notifErr.message);
          }
      }
  
      // đŸ”” Kiá»ƒm tra hoĂ n thĂ nh nhiá»‡m vá»¥ BĂ¬nh luáº­n (Silent check) đŸ†
      try {
          const { count: dailyComment } = await client
              .from('comments')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', userId)
              .gte('created_at', getStartOfVNDay().toISOString());
          
          if (dailyComment === 1) {
              await createInAppNotification(userId, `HoĂ n thĂ nh nhiá»‡m vá»¥! đŸ¯`, `Báº¡n Ä‘Ă£ xong "Tháº£o luáº­n viĂªn". HĂ£y má»Ÿ Kho thĂ nh tá»±u Ä‘á»ƒ nháº­n thÆ°á»Ÿng! đŸ€`, 'system', { missionKey: 'daily_comment_1' });
          }
      } catch (e) {}

      return { success: true, comment: newComment };
    } catch (error) {
      console.error("âŒ Lá»—i addCommentAction:", error.message);
      return { success: false, error: error.message };
    }
}

export async function getNotificationsAction(limit = 20, offset = 0) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return { success: false, error: 'ChÆ°a Ä‘Äƒng nháº­p' };

        // đŸ›¡ï¸ Sá»¬ Dá»¤NG ADMIN CLIENT Äá»‚ BYPASS RLS (Do há»‡ thá»‘ng Custom Auth) đŸ€
        const { data, error } = await supabaseAdmin
            .from('shiroi_notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        return { success: true, notifications: data };
    } catch (error) {
        console.error('âŒ Lá»—i getNotificationsAction:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * đŸ”” SERVER ACTION: ÄĂ¡nh dáº¥u thĂ´ng bĂ¡o Ä‘Ă£ Ä‘á»c
 */
export async function markNotificationAsReadAction(notificationId) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return { success: false, error: 'ChÆ°a Ä‘Äƒng nháº­p' };

        const { error } = await supabaseAdmin
            .from('shiroi_notifications')
            .update({ is_read: true })
            .eq('id', notificationId)
            .eq('user_id', user.id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('âŒ Lá»—i markNotificationAsReadAction:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * đŸ”” SERVER ACTION: ÄĂ¡nh dáº¥u táº¥t cáº£ thĂ´ng bĂ¡o lĂ  Ä‘Ă£ Ä‘á»c
 */
export async function markAllNotificationsAsReadAction() {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return { success: false, error: 'ChÆ°a Ä‘Äƒng nháº­p' };

        const { error } = await supabaseAdmin
            .from('shiroi_notifications')
            .update({ is_read: true })
            .eq('user_id', user.id);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('âŒ Lá»—i markAllNotificationsAsReadAction:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * đŸ“± SERVER ACTION: LÆ°u FCM Token cá»§a thiáº¿t bá»‹
 */
export async function saveFcmTokenAction(token, platform = 'web') {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return { success: false, error: 'ChÆ°a Ä‘Äƒng nháº­p' };

        const client = getDbClient();
        
        // Upsert token: Náº¿u tá»“n táº¡i thĂ¬ cáº­p nháº­t last_seen_at (tá»± Ä‘á»™ng qua trigger)
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
        console.error('Lá»—i saveFcmTokenAction:', error);
        return { success: false, error: error.message };
    }
}

/**
 * ?? SERVER ACTION: T? d?ng xóa thông báo cu hon 1 tu?n
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
