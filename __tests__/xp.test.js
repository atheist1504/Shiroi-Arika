import { calculateLevel, calculateProgress, calculateTitle, getStreakBonus, XP_REWARDS, STREAK_BONUSES, TITLES } from '../src/lib/xp';

describe('XP Logic Unit Tests', () => {
  
  describe('calculateLevel', () => {
    it('should return 1 for 0 XP', () => {
      expect(calculateLevel(0)).toBe(1);
    });

    it('should return 2 for 100 XP', () => {
      expect(calculateLevel(100)).toBe(2);
    });

    it('should return 11 for 1050 XP', () => {
      expect(calculateLevel(1050)).toBe(11);
    });

    it('should handle null/undefined XP as 0', () => {
      expect(calculateLevel(null)).toBe(1);
      expect(calculateLevel(undefined)).toBe(1);
    });
  });

  describe('calculateProgress', () => {
    it('should return 0 for 0 XP', () => {
      expect(calculateProgress(0)).toBe(0);
    });

    it('should return 50 for 150 XP', () => {
      expect(calculateProgress(150)).toBe(50);
    });

    it('should return 99 for 99 XP', () => {
      expect(calculateProgress(99)).toBe(99);
    });

    it('should return 0 for 200 XP', () => {
      expect(calculateProgress(200)).toBe(0);
    });
  });

  describe('getStreakBonus', () => {
    it('should return correct bonus for milestones', () => {
      expect(getStreakBonus(3)).toBe(STREAK_BONUSES.DAY_3);
      expect(getStreakBonus(7)).toBe(STREAK_BONUSES.DAY_7);
      expect(getStreakBonus(14)).toBe(STREAK_BONUSES.DAY_14);
      expect(getStreakBonus(21)).toBe(STREAK_BONUSES.DAY_21);
      expect(getStreakBonus(30)).toBe(STREAK_BONUSES.DAY_30);
    });

    it('should return 0 for non-milestone days', () => {
      expect(getStreakBonus(1)).toBe(0);
      expect(getStreakBonus(2)).toBe(0);
      expect(getStreakBonus(4)).toBe(0);
      expect(getStreakBonus(31)).toBe(0);
    });
  });

  describe('calculateTitle', () => {
    it('should return "Vô danh tiểu tốt" for LV 1 (0 XP)', () => {
      const titleObj = calculateTitle(0);
      expect(titleObj.name).toBe('Vô danh tiểu tốt');
    });

    it('should return "Kẻ vô danh" for LV 15 (1400 XP)', () => {
      const titleObj = calculateTitle(1400); // LV 15
      expect(titleObj.name).toBe('Kẻ vô danh');
    });

    it('should return selected badge if unlocked', () => {
      // LV 15 corresponds to 1400 XP. 'Tiểu quy đầu' requires LV 10 (900 XP).
      const titleObj = calculateTitle(1400, 'Tiểu quy đầu');
      expect(titleObj.name).toBe('Tiểu quy đầu');
    });

    it('should return highest unlocked title if selected badge is not unlocked', () => {
      // LV 5 corresponds to 400 XP. 'Tiểu quy đầu' requires LV 10.
      const titleObj = calculateTitle(400, 'Tiểu quy đầu');
      expect(titleObj.name).toBe('Đệ tử tạp dịch');
    });

    it('should return highest unlocked title if no badge selected', () => {
      const titleObj = calculateTitle(10900); // LV 110
      expect(titleObj.name).toBe('Đại sư tỷ');
    });
  });
});
