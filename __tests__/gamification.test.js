import { calculateLevel, calculateProgress, calculateTitle, XP_REWARDS } from '../src/lib/xp';

describe('Thư viện Logic Cấp độ (src/lib/xp.js)', () => {
  it('phải tính toán cấp độ chính xác (mỗi 100 XP tăng 1 cấp)', () => {
    // 0 -> Lvl 1
    // 99 -> Lvl 1
    // 100 -> Lvl 2
    // 1000 -> Lvl 11
    expect(calculateLevel(0)).toBe(1);
    expect(calculateLevel(50)).toBe(1);
    expect(calculateLevel(99)).toBe(1);
    expect(calculateLevel(100)).toBe(2);
    expect(calculateLevel(199)).toBe(2);
    expect(calculateLevel(200)).toBe(3);
    expect(calculateLevel(1000)).toBe(11);
  });

  it('phải tính toán phần trăm tiến trình đến cấp tiếp theo', () => {
    expect(calculateProgress(50)).toBe(50);
    expect(calculateProgress(150)).toBe(50);
    expect(calculateProgress(200)).toBe(0);
  });

  it('phải trả về danh hiệu chính xác dựa trên cấp độ', () => {
    // 0 XP -> Lvl 1 -> LỮ KHÁCH
    expect(calculateTitle(0).name).toBe('LỮ KHÁCH');
    // 900 XP -> Lvl 10 -> CHIẾN BINH
    expect(calculateTitle(900).name).toBe('CHIẾN BINH');
    // 1900 XP -> Lvl 20 -> HỘ VỆ
    expect(calculateTitle(1900).name).toBe('HỘ VỆ');
    // 3400 XP -> Lvl 35 -> ĐẠI SƯ
    expect(calculateTitle(3400).name).toBe('ĐẠI SƯ');
    // 4900 XP -> Lvl 50 -> HIỀN GIẢ
    expect(calculateTitle(4900).name).toBe('HIỀN GIẢ');
  });

  it('phải có các hằng số phần thưởng tiêu chuẩn', () => {
    expect(XP_REWARDS.DAILY_CHECKIN).toBe(50);
    expect(XP_REWARDS.READ_CHAPTER).toBe(20);
    expect(XP_REWARDS.POST_COMMENT).toBe(5);
  });
});
