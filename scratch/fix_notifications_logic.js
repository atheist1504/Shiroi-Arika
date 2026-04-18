const fs = require('fs');

const path = 'c:/Shiroi Arika/src/lib/actions.js';
if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');

    // --- 1. Fix claimMissionRewardAction ---
    const missionTarget = '      const { data: updatedUser } = await client.from(\'shiroi_users\').select(\'*\').eq(\'id\', userId).single();\r\n      return { success: true, rewardXp, user: updatedUser };';
    const missionReplacement = `      const { data: updatedUser } = await client.from('shiroi_users').select('*').eq('id', userId).single();
      
      // 🔔 TẠO THÔNG BÁO NHẬN THƯỞNG NHIỆM VỤ 🍀
      try {
          await createInAppNotification(
              userId, 
              "Nhiệm vụ hoàn thành! 🎉", 
              \`Bạn đã nhận được \${rewardXp} XP từ nhiệm vụ "\${mission?.title || missionKey}"\`, 
              'mission', 
              { missionKey, rewardXp }
          );
      } catch (notifErr) {
          console.warn("⚠️ Không thể tạo thông báo nhiệm vụ:", notifErr.message);
      }

      return { success: true, rewardXp, user: updatedUser };`;

    if (content.indexOf(missionTarget) !== -1) {
        content = content.replace(missionTarget, missionReplacement);
    } else {
        const missionTargetN = '      const { data: updatedUser } = await client.from(\'shiroi_users\').select(\'*\').eq(\'id\', userId).single();\n      return { success: true, rewardXp, user: updatedUser };';
        const missionReplacementN = `      const { data: updatedUser } = await client.from('shiroi_users').select('*').eq('id', userId).single();
      
      // 🔔 TẠO THÔNG BÁO NHẬN THƯỞNG NHIỆM VỤ 🍀
      try {
          await createInAppNotification(
              userId, 
              "Nhiệm vụ hoàn thành! 🎉", 
              \`Bạn đã nhận được \${rewardXp} XP từ nhiệm vụ "\${mission?.title || missionKey}"\`, 
              'mission', 
              { missionKey, rewardXp }
          );
      } catch (notifErr) {
          console.warn("⚠️ Không thể tạo thông báo nhiệm vụ:", notifErr.message);
      }

      return { success: true, rewardXp, user: updatedUser };`;
        content = content.replace(missionTargetN, missionReplacementN);
    }

    // --- 2. Refine publishChapterAction (Ensure In-App notification is solid) ---
    // The current publishChapterAction seems to have its logic at the end.
    // I'll make sure it's correct.
    
    // --- 3. Better logging in createInAppNotification in notifications.js (separate script) ---

    fs.writeFileSync(path, content, 'utf8');
    console.log('actions.js updated with Mission Notifications');
}

// --- 4. Update notifications.js for better reliability ---
const notifPath = 'c:/Shiroi Arika/src/lib/notifications.js';
if (fs.existsSync(notifPath)) {
    let content = fs.readFileSync(notifPath, 'utf8');
    
    // Ensure the data object is handled correctly if it's null
    const insertTarget = '                user_id: userId,\r\n                title,\r\n                body,\r\n                type,\r\n                data\r\n            }])';
    const insertReplacement = '                user_id: userId,\n                title,\n                body,\n                type,\n                data: data || {}\n            }])';
    
    if (content.indexOf(insertTarget) !== -1) {
        content = content.replace(insertTarget, insertReplacement);
    } else {
        const insertTargetN = '                user_id: userId,\n                title,\n                body,\n                type,\n                data\n            }])';
        const insertReplacementN = '                user_id: userId,\n                title,\n                body,\n                type,\n                data: data || {}\n            }])';
        content = content.replace(insertTargetN, insertReplacementN);
    }
    
    fs.writeFileSync(notifPath, content, 'utf8');
    console.log('notifications.js updated for reliability');
}
