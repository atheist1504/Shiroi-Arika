import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AdminUploadPage from '../src/app/admin/upload/page';
import { supabase } from '../src/lib/supabase';
import { useSearchParams, useRouter } from 'next/navigation';

// Giả lập (Mock) framer-motion để tránh lỗi khi chạy test mội trường JSDOM
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }) => <h1 {...props}>{children}</h1>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

// Giả lập (Mock) next/navigation (Next.js components)
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: jest.fn() }),
  useRouter: () => ({ push: jest.fn() }),
}));

// Giả lập (Mock) Supabase Client
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
  },
}));

describe('Trang Admin Quản Lý Upload - Kiểm Thử Việt Hóa & Logic Toàn Diện 🍀', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('phải hiển thị danh sách Manga đã lưu trong hệ thống', async () => {
    const mockMangas = [{ id: 'm1', title: 'Code Geass: Lelouch of the Rebellion' }];

    supabase.from.mockImplementationOnce(() => ({
      select: () => ({
        order: () => Promise.resolve({ data: mockMangas, error: null })
      })
    }));

    render(<AdminUploadPage />);

    // Kiểm tra xem tiêu đề truyện có hiển thị trong danh sách dropdown/list không
    await waitFor(() => {
      expect(screen.getByText('Code Geass: Lelouch of the Rebellion')).toBeInTheDocument();
    });
  });

  it('phải chặn quá trình xuất bản nếu thông tin chương trống', async () => {
    supabase.from.mockImplementationOnce(() => ({
      select: () => ({
        order: () => Promise.resolve({ data: [], error: null })
      })
    }));

    render(<AdminUploadPage />);

    // Tìm nút xuất bản dựa trên Text tiếng Việt chuẩn
    const publishBtn = screen.getByText(/XUẤT BẢN NGAY 🚀/i);
    fireEvent.click(publishBtn);

    await waitFor(() => {
      // Thông báo lỗi phải khớp hoàn toàn với giao diện Admin
      expect(screen.getByText(/CHƯA NHẬP ĐỦ THÔNG TIN! 🍀/i)).toBeInTheDocument();
    });
  });

  it('phải hiển thị nút thêm trang truyện trực quan', async () => {
    render(<AdminUploadPage />);
    expect(screen.getByText(/Thêm trang/i)).toBeInTheDocument();
  });

  it('phải kiểm soát được dung lượng lưu trữ (Storage Meter)', async () => {
    // Giả lập API storage trả về dung lượng
    window.fetch = jest.fn().mockImplementationOnce(() => 
        Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, totalGB: 5, limitGB: 10 })
        })
    );

    render(<AdminUploadPage />);
    
    await waitFor(() => {
        expect(screen.getByText(/DUNG LƯỢNG ĐÃ DÙNG/i)).toBeInTheDocument();
        expect(screen.getByText(/5.00 GB \/ 10 GB/i)).toBeInTheDocument();
    });
  });
});
