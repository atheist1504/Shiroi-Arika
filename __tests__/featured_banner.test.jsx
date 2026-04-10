import { render, screen, waitFor } from '@testing-library/react';
import Home from '../src/app/page';
import { supabase } from '../src/lib/supabase';

// Giả lập framer-motion để không lỗi render
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

// Giả lập Supabase
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('🍀 KIỂM THỬ LOGIC BANNER & GHIM TRUYỆN', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('phải hiển thị đúng truyện được Ghim trên Banner', async () => {
    const mockFeatured = [
      { id: 'f1', title: 'Truyện Được Ghim', is_featured: true, cover_image: 'f1.jpg' }
    ];
    const mockLatest = [
      { id: 'l1', title: 'Truyện Mới 1', is_featured: false, cover_image: 'l1.jpg', chapters: [] },
      { id: 'l2', title: 'Truyện Mới 2', is_featured: false, cover_image: 'l2.jpg', chapters: [] }
    ];

    supabase.from.mockImplementation((table) => {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: mockFeatured, error: null })
              })
            }),
            order: () => ({
               order: () => ({
                 limit: () => ({
                    limit: () => Promise.resolve({ data: mockLatest, error: null })
                 })
               })
            })
          })
        };
    });

    render(await Home());

    await waitFor(() => {
      // Kiểm tra xem truyện ghim có xuất hiện không
      expect(screen.getByText('Truyện Được Ghim')).toBeInTheDocument();
      // Kiểm tra xem SIÊU PHẨM (Banner) có tách biệt không
      expect(screen.getByText(/SIÊU PHẨM/i)).toBeInTheDocument();
    });
  });

  it('phải tự động dùng truyện mới làm banner nếu không có truyện nào được ghim', async () => {
    supabase.from.mockImplementation(() => ({
       select: () => ({
         eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }),
         order: () => ({ order: () => ({ limit: () => ({ limit: () => Promise.resolve({ data: [{ id: '1', title: 'Truyện Mới Nhất' }], error: null }) }) }) })
       })
    }));

    render(await Home());

    await waitFor(() => {
      // Dù featured trống, nó vẫn lấy truyện mới nhất từ latest làm banner (fallback logic)
      expect(screen.getByText('Truyện Mới Nhất')).toBeInTheDocument();
    });
  });
});
