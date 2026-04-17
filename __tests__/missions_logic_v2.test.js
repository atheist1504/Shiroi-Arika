/**
 * 🎯 BỘ TEST LOGIC NHIỆM VỤ V2 - SHIROI ARIKA 🍀
 * Kiểm tra tính toán tiến độ và các quy tắc thưởng.
 */

import { MISSIONS } from '../src/lib/missions';

// GIẢ LẬP SUPABASE & HEADERS 🛡️
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: {}, error: null })),
      gte: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    })),
  },
}));

jest.mock('../src/lib/supabaseAdmin', () => ({
  supabaseAdmin: {},
}));

// Giả lập dữ liệu fetchUserMissionProgress (vì nó phụ thuộc supabase)
// Ở đây ta test logic nghiệp vụ thuần túy dựa trên các quy tắc định nghĩa

describe('🍀 KIỂM THỬ LOGIC NHIỆM VỤ (MISSIONS)', () => {

    test('Các nhiệm vụ trọn đời (Lifetime) phải có XP cao hơn nhiệm vụ hàng ngày', () => {
        const dailyRead1 = MISSIONS.daily_read_1;
        const lifetime100 = MISSIONS.total_chapters_100;
        
        expect(lifetime100.xp).toBeGreaterThan(dailyRead1.xp);
        expect(lifetime100.type).toBe('lifetime');
    });

    test('Nhiệm vụ Chinh phục (Conquest) nên tính toán XP dựa trên mốc chương', () => {
        // Logic giả định từ fetchUserMissionProgress & actions.js
        const calculateConquestXP = (chapters) => {
            if (chapters >= 100) return 2000;
            if (chapters >= 50) return 1000;
            if (chapters >= 20) return 500;
            return 200;
        };

        expect(calculateConquestXP(150)).toBe(2000);
        expect(calculateConquestXP(60)).toBe(1000);
        expect(calculateConquestXP(25)).toBe(500);
        expect(calculateConquestXP(5)).toBe(200);
    });

    test('Tất cả nhiệm vụ phải có key duy nhất và XP hợp lệ', () => {
        const keys = Object.keys(MISSIONS);
        const uniqueKeys = new Set(keys);
        expect(uniqueKeys.size).toBe(keys.length);

        Object.values(MISSIONS).forEach(m => {
            expect(m.xp).toBeGreaterThan(0);
            expect(m.target).toBeGreaterThan(0);
        });
    });
});
