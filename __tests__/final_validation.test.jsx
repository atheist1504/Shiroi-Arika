'use client';

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Comments from '@/components/Comments';
import { supabase } from '@/lib/supabase';
import '@testing-library/jest-dom';

// MÔ PHỎNG DỮ LIỆU NGƯỜI DÙNG 🚀
const mockUser = {
  id: 'user-123',
  username: 'thuyketu',
  display_name: 'Thủy Kê Tử',
  avatar_url: 'https://example.com/avatar.jpg'
};

const mockAdmin = {
  id: 'admin-999',
  username: 'admin_shiroi',
  display_name: 'BAN QUẢN TRỊ 🍀',
  avatar_url: 'https://psgivxgycjireinwnelc.supabase.co/storage/v1/object/public/avatars/Admin-1775229030334.jpg'
};

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: jest.fn(() => Promise.resolve({ error: null })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null }))
      })),
    })),
  },
}));

describe('Hệ thống Xác thực Cuối cùng Shiroi Arika 🛡️', () => {
  
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('Xác thực: Người dùng gõ bình luận không bị mất con trỏ ✨', async () => {
    localStorage.setItem('shiroi_user', JSON.stringify(mockUser));
    render(<Comments mangaId="manga-1" />);
    
    const textarea = screen.getByPlaceholderText(/Cảm nhận về truyện.../i);
    fireEvent.change(textarea, { target: { value: 'Shiroi Arika mượt mà quá! 🍀' } });
    
    expect(textarea.value).toBe('Shiroi Arika mượt mà quá! 🍀');
  });

  test('Xác thực: Admin có bảng tên BAN QUẢN TRỊ và không hiện Level 🤴', async () => {
    // Giả lập dữ liệu fetch về có Admin
    const mockComments = [{
      id: 'c1',
      user_name: 'BAN QUẢN TRỊ 🍀',
      content: 'Chào các bạn đọc truyện!',
      created_at: new Date().toISOString(),
      user_id: 'admin-999',
      manga_id: 'manga-1'
    }];

    supabase.from.mockImplementation((table) => {
      if (table === 'comments') {
        return {
          select: () => ({
            order: () => Promise.resolve({ data: mockComments, error: null })
          })
        };
      }
      if (table === 'shiroi_users') {
        return {
          select: () => Promise.resolve({ data: [mockAdmin], error: null })
        };
      }
      return {
        select: () => Promise.resolve({ data: [], error: null })
      };
    });

    render(<Comments mangaId="manga-1" />);

    await waitFor(() => {
      const badges = screen.getAllByText(/BAN QUẢN TRỊ 🍀/i);
      expect(badges.length).toBeGreaterThanOrEqual(1);
      // Đảm bảo không hiện LV... cho admin
      const levelDisplay = screen.queryByText(/LV\./i);
      expect(levelDisplay).not.toBeInTheDocument();
    });
  });

  test('Xác thực: Người dùng chỉ xóa được bình luận của mình 🛡️', async () => {
    localStorage.setItem('shiroi_user', JSON.stringify(mockUser));
    
    const mockComments = [
      { id: 'my-c', user_id: 'user-123', user_name: 'Thủy Kê Tử', content: 'Của tôi', created_at: new Date().toISOString(), manga_id: 'manga-1' },
      { id: 'other-c', user_id: 'other-99', user_name: 'Kẻ khác', content: 'Dòng này không xóa được', created_at: new Date().toISOString(), manga_id: 'manga-1' }
    ];

    supabase.from.mockImplementation((table) => {
        if (table === 'comments') {
          return {
            select: () => ({
              order: () => Promise.resolve({ data: mockComments, error: null })
            }),
            delete: () => ({
              eq: () => Promise.resolve({ error: null })
            })
          };
        }
        return {
          select: () => Promise.resolve({ data: [], error: null })
        };
    });

    render(<Comments mangaId="manga-1" />);

    await waitFor(() => {
      const deleteButtons = screen.getAllByText(/\[Xóa\]/i);
      // Chỉ hiện 1 nút xóa cho bình luận 'my-c'
      expect(deleteButtons.length).toBe(1);
    });
  });

  test('Xác thực: Hệ thống Phản hồi (Reply) hoạt động lồng nhau chính xác 🌳', async () => {
    localStorage.setItem('shiroi_user', JSON.stringify(mockUser));
    
    const mockThread = [
      { id: 'parent', parent_id: null, user_name: 'Shiroi', content: 'Bình luận gốc', created_at: new Date().toISOString(), manga_id: 'manga-1' },
      { id: 'child', parent_id: 'parent', user_name: 'Thủy Kê Tử', content: 'Tôi đã trả lời!', created_at: new Date().toISOString(), manga_id: 'manga-1' }
    ];

    supabase.from.mockImplementation((table) => ({
       select: () => ({
         order: () => Promise.resolve({ data: mockThread, error: null })
       })
    }));

    render(<Comments mangaId="manga-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Tôi đã trả lời!/i)).toBeInTheDocument();
      // Kiểm tra xem có viền lề (border-l) cho phản hồi không
      const replyContainer = screen.getByText(/Tôi đã trả lời!/i).closest('.ml-10');
      expect(replyContainer).toBeInTheDocument();
    });
  });

});
