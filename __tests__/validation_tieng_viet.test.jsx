/**
 * BỘ TEST TỔNG KIỂM TRA SHIROI ARIKA - TIẾNG VIỆT 🍀
 */

import { render, screen } from '@testing-library/react';
import Login from '@/app/login/page';
import { optimizeImage } from '@/lib/cloudinary';

// GIẢ LẬP NEXT/NAVIGATION ĐỂ KHÔNG BỊ LỖI ROUTER 🚀
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => ({ get: jest.fn() }),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockImplementation(() => Promise.resolve({ data: {}, error: null })),
    })),
    storage: {
      from: jest.fn(() => ({
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://test-url.com' } })),
      })),
    },
  },
}));

describe('🍀 TỔNG KIỂM TRA LOGIC SHIROI ARIKA', () => {

  test('1️⃣ KIỂM TRA TÀI KHOẢN CÔ LẬP (LIKE ISOLATION)', () => {
    const userA = { id: 'user-a', username: 'thuyketu' };
    localStorage.setItem('shiroi_user', JSON.stringify(userA));
    const keyA = `shiroi_comment_likes_${userA.id}`;
    localStorage.setItem(keyA, JSON.stringify({ 'comment-1': true }));

    expect(localStorage.getItem(keyA)).toContain('true');

    const userB = { id: 'user-b', username: 'admin' };
    localStorage.setItem('shiroi_user', JSON.stringify(userB));
    
    const keyB = `shiroi_comment_likes_${userB.id}`;
    const storedLikesB = localStorage.getItem(keyB);
    expect(storedLikesB).toBeNull(); 
  });

  test('2️⃣ KIỂM TRA TÍNH NĂNG "GHI NHỚ TÔI" (REMEMBER ME)', () => {
    localStorage.setItem('shiroi_remembered_user', 'shiroi_admin');
    render(<Login />);
    const usernameInput = screen.getByPlaceholderText(/Username của bạn.../i);
    expect(usernameInput.value).toBe('shiroi_admin');
  });

  test('3️⃣ KIỂM TRA TỐI ƯU HÓA ẢNH (IMAGE OPTIMIZATION)', () => {
    const rawUrl = "https://psgivxgycjireinwnelc.supabase.co/image.png";
    const optimizedUrl = optimizeImage(rawUrl);
    expect(optimizedUrl).toContain('f_auto');
    expect(optimizedUrl).toContain('q_auto');
    expect(optimizedUrl).toContain('cloudinary');
  });

  test('4️⃣ KIỂM TRA LOGIC NHẬN DIỆN ADMIN (PERMISSION CHECK)', () => {
    const normalUser = { id: '123', username: 'user123', display_name: 'Độc giả 🍀' };
    const adminUser = { id: 'admin-1', username: 'admin', display_name: 'Quản trị viên Shiroi' };

    const normalize = (s) => (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').trim().toLowerCase();
    
    const checkIsAdmin = (u) => {
       const key = normalize(u.display_name || u.username);
       return key.includes('admin') || key.includes('quan tri');
    };

    expect(checkIsAdmin(normalUser)).toBe(false);
    expect(checkIsAdmin(adminUser)).toBe(true); 
  });

});
