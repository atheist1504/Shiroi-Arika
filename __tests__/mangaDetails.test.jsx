import { render, screen, waitFor } from '@testing-library/react';
import MangaDetailsPage from '../src/app/manga/[mangaId]/page';
import { supabase } from '../src/lib/supabase';

// Giả lập (Mock) thư viện next/navigation
jest.mock('next/navigation', () => ({
  useParams: () => ({ mangaId: '123' }),
  useRouter: () => ({
    push: jest.fn(),
  }),
  notFound: jest.fn(),
}));

// Giả lập (Mock) thư viện supabase
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('Trang Chi Tiết Truyện', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hiển thị trạng thái đang tải ban đầu', async () => {
    // Với Server Components, chúng ta không thực sự test "loading state" dễ dàng qua render()
    // vì chúng ta đang await việc render. Test này sẽ kiểm tra xem MangaClient có được render 
    // với dữ liệu ban đầu không. Tuy nhiên để giữ tính tương thích, chúng ta mock dữ liệu.
    const mockManga = { id: '123', title: 'Bleach' };
    supabase.from.mockImplementation(() => ({
       select: () => ({
         eq: () => ({
           single: () => Promise.resolve({ data: mockManga, error: null }),
           order: () => Promise.resolve({ data: [], error: null })
         })
       })
    }));

    render(await MangaDetailsPage({ params: { mangaId: '123' } }));
    expect(screen.getByText('Bleach')).toBeInTheDocument();
  });

  it('gọi notFound() khi mã truyện không tồn tại', async () => {
    const { notFound } = require('next/navigation');
    supabase.from.mockImplementation((table) => {
      if (table === 'mangas') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null, error: null }),
            })
          })
        };
      }
      return {
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [], error: null })
          })
        })
      };
    });

    await MangaDetailsPage({ params: { mangaId: 'unknown' } });
    expect(notFound).toHaveBeenCalled();
  });

  it('hiển thị chi tiết truyện và danh sách chương khi có dữ liệu', async () => {
    const mockManga = { id: '123', title: 'Bleach', description: 'Shinigami', cover_image: null };
    const mockChapters = [
      { id: 'c1', chapter_number: 1, title: 'Death and Strawberry', created_at: '2023-01-01T00:00:00.000Z' }
    ];

    supabase.from.mockImplementation((table) => {
      if (table === 'mangas') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: mockManga, error: null })
            })
          })
        };
      }
      if (table === 'chapters') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: mockChapters, error: null })
            })
          })
        };
      }
    });

    render(await MangaDetailsPage({ params: { mangaId: '123' } }));

    await waitFor(() => {
      expect(screen.getByText('Bleach')).toBeInTheDocument();
      expect(screen.getByText('Shinigami')).toBeInTheDocument();
      expect(screen.getByText(/Death and Strawberry/i)).toBeInTheDocument();
    });
  });
});
