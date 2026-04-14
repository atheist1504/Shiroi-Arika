import { render, screen, waitFor } from '@testing-library/react';
import MangaPage from '../src/app/manga/[mangaId]/page';
import MangaClient from '../src/app/manga/[mangaId]/MangaClient';
import { supabase } from '../src/lib/supabase';

// Giả lập (Mock) các thành phần UI phức tạp
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }) => <h1 {...props}>{children}</h1>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
    span: ({ children, ...props }) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useParams: () => ({ mangaId: 'manga-123' }),
}));

jest.mock('../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('Trang Chi tiết Manga - Kiểm thử Việt hóa 🍀', () => {
  const mockManga = {
    id: 'manga-123',
    title: 'Hồ Sơ Shiroi Arika',
    description: 'Một bản hùng ca về thế giới manga.',
    cover_image: 'https://example.com/cover.jpg',
    author: 'Shiroi Team',
    status: 'Đang tiến hành',
    views: 1200
  };

  const mockChapters = [
    { id: 'c1', chapter_number: 1, title: 'Khởi đầu', created_at: '2026-04-14T00:00:00Z' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('phải hiển thị đầy đủ thông tin cơ bản của bộ truyện', async () => {
    // Giả lập dữ liệu fetch từ MangaClient
    render(<MangaClient 
      manga={mockManga} 
      chapters={mockChapters} 
      user={null} 
      initialIsFollowed={false} 
    />);

    expect(screen.getByText('Hồ Sơ Shiroi Arika')).toBeInTheDocument();
    expect(screen.getByText(/Một bản hùng ca/)).toBeInTheDocument();
    expect(screen.getByText('Shiroi Team')).toBeInTheDocument();
  });

  it('phải hiển thị danh sách chương và nút "ĐỌC NGAY"', async () => {
    render(<MangaClient 
      manga={mockManga} 
      chapters={mockChapters} 
      user={null} 
      initialIsFollowed={false} 
    />);

    expect(screen.getByText(/CHƯƠNG 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Khởi đầu/i)).toBeInTheDocument();
    expect(screen.getByText(/ĐỌC NGAY/i)).toBeInTheDocument();
  });

  it('phải hiển thị trạng thái theo dõi khi người dùng đã đăng nhập', async () => {
    const mockUser = { id: 'u1', username: 'fan' };
    
    render(<MangaClient 
      manga={mockManga} 
      chapters={mockChapters} 
      user={mockUser} 
      initialIsFollowed={true} 
    />);

    expect(screen.getByText(/ĐÃ THEO DÕI/i)).toBeInTheDocument();
  });
});
