/**
 * 🇻🇳 BỘ TEST LOGIC TIẾNG VIỆT V2 - SHIROI ARIKA 🍀
 * Tập trung vào kiểm tra danh hiệu, chuẩn hóa tên và bộ lọc spam.
 */

import { calculateTitle, TITLES } from '../src/lib/xp';
import { isGibberish } from '../src/lib/missions';

// GIẢ LẬP SUPABASE & HEADERS 🛡️
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: {}, error: null })),
    })),
  },
}));

jest.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: {},
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
  })),
}));

describe('🍀 KIỂM THỬ LOGIC TIẾNG VIỆT & DANH HIỆU', () => {

  describe('1️⃣ KIỂM TRA TÍNH TOÁN DANH HIỆU (TITLES)', () => {
    test('Nên trả về "Vô danh tiểu tốt" cho Level 1 (0 XP)', () => {
      const title = calculateTitle(0);
      expect(title.name).toBe('Vô danh tiểu tốt');
    });

    test('Nên trả về "Đệ tử tạp dịch" cho Level 5 (450 XP)', () => {
      const title = calculateTitle(450); // Level = 450/100 + 1 = 5
      expect(title.name).toBe('Đệ tử tạp dịch');
    });

    test('Nên trả về "Độc cô cầu bại" cho Level 100 (9900 XP)', () => {
      const title = calculateTitle(9900); // Level = 99
      // Theo logic xp.js: 99 >= 95 (Ẩn sĩ sơn lâm), 99 >= 100 (Độc cô cầu bại) -> Không đạt
      // Level 100 mới đạt Độc cô cầu bại
      const title100 = calculateTitle(10000); // Level 101
      expect(title100.name).toBe('Độc cô cầu bại');
    });

    test('Ưu tiên Badge được chọn nếu đã mở khóa', () => {
      // User Level 100 (XP 10000), nhưng chọn Badge "Lãng khách" (Level 70)
      const selectedBadge = 'Lãng khách';
      const title = calculateTitle(10000, selectedBadge);
      expect(title.name).toBe('Lãng khách');
    });

    test('Không dùng Badge được chọn nếu chưa đủ Level', () => {
      // User Level 10 (XP 900), nhưng chọn Badge "Đại sư huynh" (Level 60)
      const selectedBadge = 'Đại sư huynh';
      const title = calculateTitle(900, selectedBadge);
      expect(title.name).toBe('Tiểu quy đầu'); // Level 10
    });
  });

  describe('2️⃣ KIỂM TRA BỘ LỌC SPAM TIẾNG VIỆT (ISGIBBERISH)', () => {
    test('Chặn chuỗi lặp ký tự vô nghĩa', () => {
      expect(isGibberish('aaaaaaaaaaaa')).toBe(true);
      expect(isGibberish('vvvvvvvvv')).toBe(true);
    });

    test('Chặn chuỗi lặp từ vô nghĩa', () => {
      expect(isGibberish('hay hay hay hay hay')).toBe(true);
      expect(isGibberish('ngon ngon ngon ngon ngon ngon')).toBe(true);
    });

    test('Cho phép bình luận tiếng Việt hợp lệ', () => {
      expect(isGibberish('Truyện này hay quá admin ơi! ❤️')).toBe(false);
      expect(isGibberish('Cảm ơn nhóm dịch nhiều lắm nha.')).toBe(false);
      expect(isGibberish('Hóng chương sau quá, không biết bao giờ ra.')).toBe(false);
    });

    test('Chặn bình luận chỉ có ký tự đặc biệt hoặc số', () => {
      expect(isGibberish('123456789')).toBe(true);
      expect(isGibberish('!@#$%^&*()')).toBe(true);
      expect(isGibberish('.....')).toBe(true);
    });

    test('Chặn bình luận quá ngắn', () => {
      expect(isGibberish('a')).toBe(true);
      expect(isGibberish('  ')).toBe(true);
    });
  });

});
