import { recordXpLogAction, performCheckInAction } from '../src/lib/actions';
import { supabase } from '../src/lib/supabase';
import { supabaseAdmin } from '../src/lib/supabaseAdmin';
import { cookies } from 'next/headers';

// Mocking dependencies
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('../src/lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

jest.mock('../src/lib/notifications', () => ({
  sendMangaNotification: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../src/lib/xp', () => ({
  XP_REWARDS: { DAILY_CHECKIN: 100 },
  getStreakBonus: jest.fn(() => 0),
}));

describe('Server Actions Logic Tests', () => {
  let mockSupabaseFrom;
  let mockSupabaseAdminFrom;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseFrom = supabase.from;
    mockSupabaseAdminFrom = supabaseAdmin.from;
  });

  describe('recordXpLogAction', () => {
    it('should return error if userId or amount is missing', async () => {
      const result = await recordXpLogAction(null, 100, 'test');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Thiếu định danh');
    });

    it('should insert log into shiroi_xp_logs', async () => {
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabaseAdminFrom.mockReturnValue({
        insert: mockInsert,
      });

      const result = await recordXpLogAction('user123', 100, 'test_type', 'test_reason');
      
      expect(mockSupabaseAdminFrom).toHaveBeenCalledWith('shiroi_xp_logs');
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user123',
        amount: 100,
        type: 'test_type',
        reason: 'test_reason',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('performCheckInAction', () => {
    it('should return error if user is not authenticated', async () => {
      cookies.mockReturnValue({
        get: jest.fn().mockReturnValue(null),
      });

      const result = await performCheckInAction();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Phiên làm việc lỗi');
    });

    // Add more complex tests for streak calculation if needed
    // But since it depends on many internal helper functions and dates, it's a bit complex for a quick unit test without heavy refactoring.
  });
});
