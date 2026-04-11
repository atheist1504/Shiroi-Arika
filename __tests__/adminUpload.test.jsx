import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AdminUploadPage from '../src/app/admin/upload/page';
import { supabase } from '../src/lib/supabase';
import { compressImageToWebP } from '../src/lib/imageOptimizer';
import { useSearchParams, useRouter } from 'next/navigation';

// Giả lập (Mock) framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }) => <h1 {...props}>{children}</h1>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

// Giả lập (Mock) next/navigation
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: jest.fn() }),
  useRouter: () => ({ push: jest.fn() }),
}));

// Bỏ qua (Mock) chức năng nén ảnh vì JSDOM không hỗ trợ đầy đủ Canvas HTML5
jest.mock('../src/lib/imageOptimizer', () => ({
  compressImageToWebP: jest.fn(() => Promise.resolve(new File(['(binary)'], 'test.webp', { type: 'image/webp' }))),
}));

// Giả lập (Mock) Supabase
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
  },
}));

describe('Trang Admin Quản Lý Upload - Kiểm Thử Việt Hóa 🍀', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hiển thị danh sách Manga để chọn ban đầu từ Database', async () => {
    const mockMangas = [{ id: 'm1', title: 'Code Geass: Lelouch of the Rebellion' }];

    supabase.from.mockImplementationOnce(() => ({
      select: () => ({
        order: () => Promise.resolve({ data: mockMangas, error: null })
      })
    }));

    render(<AdminUploadPage />);

    // Kiểm tra xem tên truyện có xuất hiện trong danh sách không
    await waitFor(() => {
      expect(screen.getByText('Code Geass: Lelouch of the Rebellion')).toBeInTheDocument();
    });
  });

  it('thông báo lỗi khi nhấn nút xuất bản mà chưa nhập đủ thông tin', async () => {
    // Không có manga nào được chọn mặc định
    supabase.from.mockImplementationOnce(() => ({
      select: () => ({
        order: () => Promise.resolve({ data: [], error: null })
      })
    }));

    render(<AdminUploadPage />);

    // Tìm nút xuất bản theo đúng text mới
    const publishBtn = screen.getByText(/XUẤT BẢN NGAY 🚀/i);
    fireEvent.click(publishBtn);

    await waitFor(() => {
      // Thông báo lỗi phải khớp với logic mới trong page.tsx
      expect(screen.getByText(/CHƯA NHẬP ĐỦ THÔNG TIN! 🍀/i)).toBeInTheDocument();
    });
  });

  it('hiển thị khu vực thêm trang truyện bằng hình ảnh', async () => {
    render(<AdminUploadPage />);
    expect(screen.getByText(/Thêm trang/i)).toBeInTheDocument();
    expect(screen.getByText(/CÁC TRANG TRUYỆN/i)).toBeInTheDocument();
  });
});
