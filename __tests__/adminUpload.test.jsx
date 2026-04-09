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

describe('Trang Admin Quản Lý Upload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Storage.prototype.getItem = jest.fn((key) => {
      if (key === 'shiroi_user') return JSON.stringify({ username: 'ADMIN' });
      return null;
    });
  });

  it('hiển thị danh sách Manga để chọn ban đầu', async () => {
    const mockMangas = [{ id: 'm1', title: 'Dragon Ball' }];

    supabase.from.mockImplementationOnce(() => ({
      select: () => ({
        order: () => Promise.resolve({ data: mockMangas, error: null })
      })
    }));

    render(<AdminUploadPage />);

    // Giao diện sẽ render thẻ select chứa tên truyện
    await waitFor(() => {
      expect(screen.getByText('Dragon Ball')).toBeInTheDocument();
    });
  });

  it('cảnh báo yêu cầu nhập thông tin khi gửi form trống', async () => {
    // Không có manga nào
    supabase.from.mockImplementationOnce(() => ({
      select: () => ({
        order: () => Promise.resolve({ data: [], error: null })
      })
    }));

    render(<AdminUploadPage />);

    // Tìm form và gọi hàm submit trực tiếp (bỏ qua validation HTML5 của DOM ảo)
    const submitBtn = screen.getByText(/LƯU & ĐĂNG CHƯƠNG/i);
    const form = submitBtn.closest('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/VUI LÒNG NHẬP ĐỦ THÔNG TIN MANGA/i)).toBeInTheDocument();
    });
  });
});
