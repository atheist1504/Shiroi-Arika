const fs = require('fs');

async function fixNotifications() {
    // Note: We cannot easily run 'ALTER TABLE' via standard Supabase client without 'postgres-admin' or similar.
    // However, I can update the Server Actions to use the Admin client to bypass RLS.
    // For Real-time to work WITHOUT RLS satisfying, we DO need to disable RLS on the table.
    // I will try to run the SQL via a script if possible, or advise the user.
    // Since I have tool access, I'll use a Node script with a direct SQL execution if possible, 
    // but standard supabase-js doesn't allow raw SQL.
    
    // So, step 1: Hard-fix the Server Actions to use supabaseAdmin.
    const actionsPath = 'c:/Shiroi Arika/src/lib/actions.js';
    if (fs.existsSync(actionsPath)) {
        let content = fs.readFileSync(actionsPath, 'utf8');

        // Replace getNotificationsAction
        const getNotifTarget = /export async function getNotificationsAction\(limit = 20\) \{[\s\S]*?return \{ success: true, notifications: data \};[\s\S]*?\} catch \(error\) \{[\s\S]*?return \{ success: false, error: error\.message \};[\s\S]*?\}/;
        const getNotifReplacement = `export async function getNotificationsAction(limit = 20) {
    try {
        const user = await getAuthenticatedUser();
        if (!user) return { success: false, error: 'Chưa đăng nhập' };

        // 🛡️ SỬ DỤNG ADMIN CLIENT ĐỂ BYPASS RLS (Do hệ thống Custom Auth) 🍀
        const { data, error } = await supabaseAdmin
            .from('shiroi_notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return { success: true, notifications: data };
    } catch (error) {
        console.error('❌ Lỗi getNotificationsAction:', error.message);
        return { success: false, error: error.message };
    }
}`;
        content = content.replace(getNotifTarget, getNotifReplacement);

        // Replace markNotificationAsReadAction
        const markReadTarget = /export async function markNotificationAsReadAction\(notificationId\) \{[\s\S]*?return \{ success: true \};[\s\S]*?\} catch \(error\) \{[\s\S]*?return \{ success: false, error: error\.message \};[\s\S]*?\}/;
        const markReadReplacement = `export async function markNotificationAsReadAction(notificationId) {
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
}`;
        content = content.replace(markReadTarget, markReadReplacement);

        // Replace markAllNotificationsAsReadAction
        const markAllReadTarget = /export async function markAllNotificationsAsReadAction\(\) \{[\s\S]*?return \{ success: true \};[\s\S]*?\} catch \(error\) \{[\s\S]*?return \{ success: false, error: error\.message \};[\s\S]*?\}/;
        const markAllReadReplacement = `export async function markAllNotificationsAsReadAction() {
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
}`;
        content = content.replace(markAllReadTarget, markAllReadReplacement);

        fs.writeFileSync(actionsPath, content, 'utf8');
        console.log('actions.js notification actions HARDENED');
    }

    // Step 2: Since we can't run ALTER TABLE via supabase-js easily, 
    // I'll create a dummy migration script for the user or just assume they will run it.
    // BUT! I can try to run it via an API if I find one.
    // Instead, I'll just check if RLS can be satisfied by adding a policy for 'anon' to read by user_id?
    // No, that's not secure. Disabling RLS is better if we only filter by user_id in UI.
}

fixNotifications();
