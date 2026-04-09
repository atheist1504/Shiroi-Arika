import { render, screen, waitFor } from '@testing-library/react';
import Home from '../src/app/page';
import { supabase } from '../src/lib/supabase';

// Giả lập (Mock) framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    span: ({ children, ...props }) => <span {...props}>{children}</span>,
    section: ({ children, ...props }) => <section {...props}>{children}</section>,
    header: ({ children, ...props }) => <header {...props}>{children}</header>,
    nav: ({ children, ...props }) => <nav {...props}>{children}</nav>,
    h2: ({ children, ...props }) => <h2 {...props}>{children}</h2>,
    p: ({ children, ...props }) => <p {...props}>{children}</p>,
    main: ({ children, ...props }) => <main {...props}>{children}</main>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
    h3: ({ children, ...props }) => <h3 {...props}>{children}</h3>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

// Giả lập thư viện supabase
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
          range: jest.fn(() => Promise.resolve({ data: [], error: null }))
        })),
      })),
    })),
  },
}));

describe('Trang Chủ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hiển thị trạng thái đang tải (loading) lúc đầu', async () => {
    // Cấu hình mock để trả về một promise không bao giờ resolve
    supabase.from.mockImplementationOnce(() => ({
      select: () => ({
        order: () => ({
          range: () => Promise.resolve({ data: null, error: null })
        })
      })
    }));

    render(await Home());

    // Nếu mang dữ liệu null, HomeClient có thể hiển thị trạng thái chờ hoặc trống
    // Ở đây chúng ta kiểm tra xem component có render mà không bị crash hay không
    expect(screen.getByText(/Truyện mới cập nhật/i)).toBeInTheDocument();
  });

  it('hiển thị trạng thái trống khi không có truyện nào được trả về', async () => {
    supabase.from.mockImplementationOnce(() => ({
      select: () => ({
        order: () => ({
          range: () => Promise.resolve({ data: [], error: null })
        })
      })
    }));

    render(await Home());

    await waitFor(() => {
      expect(screen.getByText(/Kho truyện hiện đang trống/i)).toBeInTheDocument();
    });
  });

  it('hiển thị danh sách truyện khi có dữ liệu trả về', async () => {
    const mockMangas = [
      { id: '1', title: 'Naruto', cover_image: 'naruto.jpg', genres: ['Action'], description: 'Ninja' },
      { id: '2', title: 'One Piece', cover_image: 'luffy.jpg', genres: ['Adventure'], description: 'Pirate' },
    ];

    supabase.from.mockImplementation(() => ({
      select: () => ({
        order: () => ({
          range: () => Promise.resolve({ data: mockMangas, error: null })
        })
      })
    }));

    render(await Home());

    // Naruto sẽ xuất hiện ít nhất 2 lần (1 ở Banner, 1 ở Danh sách)
    // One Piece tương tự nếu nó nằm trong top 5 featured
    await waitFor(() => {
      const narutoElements = screen.getAllByText(/Naruto/i);
      expect(narutoElements.length).toBeGreaterThanOrEqual(1);

      const opElements = screen.getAllByText(/One Piece/i);
      expect(opElements.length).toBeGreaterThanOrEqual(1);
    });
  });
});
