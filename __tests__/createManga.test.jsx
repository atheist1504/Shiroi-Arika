import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import CreateMangaPage from '../src/app/admin/create-manga/page';
import { supabase } from '../src/lib/supabase';
import { compressImageToWebP } from '../src/lib/imageOptimizer';

// Mock các thư viện chức năng nặng 
jest.mock('../src/lib/imageOptimizer', () => ({
  compressImageToWebP: jest.fn(() => Promise.resolve(new File(['(binary)'], 'test_cover.webp', { type: 'image/webp' }))),
}));

// Xoá bỏ lỗi "URL.createObjectURL is not a function" khi test với file trong nodejs/JSDOM
if (typeof window.URL.createObjectURL === 'undefined') {
  Object.defineProperty(window.URL, 'createObjectURL', { value: jest.fn() });
}

// Giả lập Supabase
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
  },
}));

describe('Trang Khởi Tạo Manga (Admin)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('báo lỗi khi gửi form không có Tên Truyện', async () => {
    render(<CreateMangaPage />);
    
    // Tìm form và nện sự kiện submit
    const submitBtn = screen.getByText(/Khởi Tạo Manga Này/i);
    const form = submitBtn.closest('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/Vui lòng nhập Tên Truyện/i)).toBeInTheDocument();
    });
  });

  it('tạo Manga thành công khi nhập tên (không có ảnh bìa)', async () => {
    supabase.from.mockImplementation(() => ({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: { id: 'manga_001', title: 'Siêu Anh Hùng' }, error: null })
        })
      })
    }));

    render(<CreateMangaPage />);

    // Điền text vào input Tên Truyện
    const titleInput = screen.getByPlaceholderText(/VD: One Piece, Mê Cung.../i);
    fireEvent.change(titleInput, { target: { value: 'Siêu Anh Hùng' } });

    // Click chọn một thể loại bất kỳ (ví dụ Action)
    const genreBtn = screen.getByText('Action');
    fireEvent.click(genreBtn);

    const submitBtn = screen.getByText(/Khởi Tạo Manga Này/i);
    const form = submitBtn.closest('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/Tạo Truyện Thành Công/i)).toBeInTheDocument();
    });
  });
});
