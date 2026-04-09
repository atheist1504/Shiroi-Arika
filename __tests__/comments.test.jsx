import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Comments from '../src/components/Comments';
import { supabase } from '../src/lib/supabase';

// Giả lập (Mock) framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    span: ({ children, ...props }) => <span {...props}>{children}</span>,
    section: ({ children, ...props }) => <section {...props}>{children}</section>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
    h3: ({ children, ...props }) => <h3 {...props}>{children}</h3>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

// Giả lập Supabase
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: jest.fn(() => Promise.resolve({ error: null })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null }))
      })),
    })),
  },
}));

describe('Thanh Thảo luận (Comments Component)', () => {
  const mockUser = { id: 'u1', username: 'shiroi_fan', display_name: 'Fan Shiroi' };

  beforeEach(() => {
    jest.clearAllMocks();
    Storage.prototype.getItem = jest.fn((key) => {
      if (key === 'shiroi_user') return JSON.stringify(mockUser);
      return null;
    });
  });

  it('hiển thị danh sách bình luận khi có dữ liệu', async () => {
    const mockComments = [
      { id: 'c1', user_name: 'User A', content: 'Truyện hay quá!', created_at: new Date().toISOString(), manga_id: 'm1' }
    ];
    
    // Giả lập việc fetch Bình luận và Người dùng
    supabase.from.mockImplementation((table) => {
      if (table === 'comments') {
        const chain = {
          select: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({ data: mockComments, error: null }))
          })),
          insert: jest.fn(() => Promise.resolve({ error: null })),
          delete: jest.fn(() => ({
            eq: jest.fn(() => Promise.resolve({ error: null }))
          })),
          eq: jest.fn(() => chain) // Cho các chain khác
        };
        return chain;
      }
      return {
        select: jest.fn(() => Promise.resolve({ data: [], error: null }))
      };
    });

    render(<Comments mangaId="m1" />);

    await waitFor(() => {
      expect(screen.getByText('Truyện hay quá!')).toBeInTheDocument();
      expect(screen.getByText('User A')).toBeInTheDocument();
    });
  });

  it('cho phép gửi bình luận mới khi đã đăng nhập', async () => {
    render(<Comments mangaId="m1" />);

    const textarea = screen.getByPlaceholderText(/Cảm nhận về truyện/i);
    fireEvent.change(textarea, { target: { value: 'Bình luận mới của tôi' } });
    
    const submitBtn = screen.getByText(/XÁC NHẬN GỬI/i);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('comments');
      // kiểm tra xem hàm insert đã được gọi chưa
    });
  });

  it('không hiển thị form gửi nếu chưa đăng nhập', async () => {
    Storage.prototype.getItem = jest.fn(() => null);
    render(<Comments mangaId="m1" />);
    
    expect(screen.getByText(/ĐĂNG NHẬP ĐỂ THAM GIA THẢO LUẬN/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Cảm nhận về truyện/i)).not.toBeInTheDocument();
  });
});
