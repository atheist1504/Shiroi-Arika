import { calculateLevel, calculateProgress, calculateTitle, XP_REWARDS, getStreakBonus, STREAK_BONUSES } from '../src/lib/xp';

describe('Thư viện Logic Cấp độ & Gamification (src/lib/xp.js) 🍀', () => {
  
  describe('Hàm calculateLevel (Tính Cấp độ)', () => {
    it('phải tính toán cấp độ chính xác (mỗi 100 XP tăng 1 cấp)', () => {
      expect(calculateLevel(0)).toBe(1);
      expect(calculateLevel(50)).toBe(1);
      expect(calculateLevel(99)).toBe(1);
      expect(calculateLevel(100)).toBe(2);
      expect(calculateLevel(199)).toBe(2);
      expect(calculateLevel(200)).toBe(3);
      expect(calculateLevel(1000)).toBe(11);
    });

    it('phải xử lý được trường hợp XP bị null hoặc undefined', () => {
      expect(calculateLevel(null)).toBe(1);
      expect(calculateLevel(undefined)).toBe(1);
    });
  });

  describe('Hàm calculateProgress (Tính Tiến trình)', () => {
    it('phải tính toán phần trăm tiến trình đến cấp tiếp theo', () => {
      expect(calculateProgress(0)).toBe(0);
      expect(calculateProgress(50)).toBe(50);
      expect(calculateProgress(150)).toBe(50);
      expect(calculateProgress(200)).toBe(0);
    });
  });

  describe('Hàm calculateTitle (Tính Danh hiệu)', () => {
    it('phải trả về danh hiệu mặc định cho người mới', () => {
      expect(calculateTitle(0).name).toBe('Vô danh tiểu tốt');
    });

    it('phải mở khóa danh hiệu cấp cao khi đạt đủ cấp độ', () => {
      // Cấp 10 (900 XP) -> Tiểu quy đầu
      expect(calculateTitle(900).name).toBe('Tiểu quy đầu');
      // Cấp 31 (3000 XP) -> Hồ ly tinh
      expect(calculateTitle(3000).name).toBe('Hồ ly tinh');
    });

    it('phải ưu tiên danh hiệu được người dùng chọn (Selected Badge)', () => {
      const selectedBadge = 'Vô danh tiểu tốt';
      // Mặc dù cấp cao nhưng vẫn hiện danh hiệu đã chọn nếu nó hợp lệ
      expect(calculateTitle(3000, selectedBadge).name).toBe('Vô danh tiểu tốt');
    });
  });

  describe('Hằng số XP_REWARDS', () => {
    it('phải có các thông số thưởng tiêu chuẩn', () => {
      expect(XP_REWARDS.DAILY_CHECKIN).toBe(100);
      expect(XP_REWARDS.READ_CHAPTER).toBe(20);
      expect(XP_REWARDS.FIRST_COMMENT).toBe(10);
    });
  });

  describe('Hàm getStreakBonus (Thưởng Chuỗi)', () => {
    it('phải tính toán thưởng chuỗi chính xác theo các cột mốc', () => {
      expect(getStreakBonus(3)).toBe(STREAK_BONUSES.DAY_3);
      expect(getStreakBonus(7)).toBe(STREAK_BONUSES.DAY_7);
      expect(getStreakBonus(14)).toBe(STREAK_BONUSES.DAY_14);
      expect(getStreakBonus(21)).toBe(STREAK_BONUSES.DAY_21);
      expect(getStreakBonus(30)).toBe(STREAK_BONUSES.DAY_30);
    });

    it('không thưởng cho các ngày không phải cột mốc', () => {
      expect(getStreakBonus(1)).toBe(0);
      expect(getStreakBonus(5)).toBe(0);
      expect(getStreakBonus(10)).toBe(0);
    });
  });

});
