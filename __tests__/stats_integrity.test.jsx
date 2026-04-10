import { render, screen, waitFor } from '@testing-library/react';
import ProfilePage from '../src/app/profile/page';
import { supabase } from '../src/lib/supabase';

// Giả lập framer-motion để không lỗi render
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    h2: ({ children, ...props }) => <h2 {...props}>{children}</h2>,
    p: ({ children, ...props }) => <p {...props}>{children}</p>,
    section: ({ children, ...props }) => <section {...props}>{children}</section>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
    span: ({ children, ...props }) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

// Giả lập Supabase
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('🍀 KIỂM THỬ ĐỘ CHÍNH XÁC THỐNG KÊ (STATS INTEGRITY)', () => {
  const mockUser = {
    id: 'user-unique-id-123',
    username: 'thuyketu',
    display_name: 'Thủy Kê Tử',
    xp: 500
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('shiroi_user', JSON.stringify(mockUser));
  });

  it('phải lấy số lượng chương đã đọc dựa trên user_id thay vì username', async () => {
    // Giả lập truy vấn đếm chapter
    supabase.from.mockImplementation((table) => {
        if (table === 'shiroi_read_chapters') {
            return {
                select: () => ({
                    eq: (col, val) => {
                        // KIỂM TRA QUAN TRỌNG: Cột truy vấn phải là user_id
                        expect(col).toBe('user_id');
                        expect(val).toBe(mockUser.id);
                        return {
                            then: (cb) => cb({ count: 42, error: null })
                        };
                    }
                })
            };
        }
        // Cho các bảng khác (users, etc.)
        return {
           select: () => ({
              ilike: () => ({
                 single: () => Promise.resolve({ data: mockUser, error: null })
              }),
              eq: () => ({
                 order: () => Promise.resolve({ data: [], error: null })
              })
           })
        };
    });

    render(<ProfilePage />);

    // Kiểm tra xem con số 42 có xuất hiện trên UI không
    await waitFor(() => {
       const statsElement = screen.getByText('42');
       expect(statsElement).toBeInTheDocument();
    });
  });
});
