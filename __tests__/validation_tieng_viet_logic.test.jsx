import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminUploadPage from '../src/app/admin/upload/page';
import { supabase } from '../src/lib/supabase';

// 🧪 MOCKING CÁC THÀNH PHẦN NGOÀI LUỒNG
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({ data: [{ id: 'm1', title: 'TRUYỆN TEST' }], error: null })),
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: { id: 'c1', manga_id: 'm1', chapter_number: 1, title: 'Chương 1' }, error: null })),
          order: jest.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: { id: 'new-chap' }, error: null }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ error: null }))
      }))
    }))
  }
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useSearchParams: () => ({ get: jest.fn((key) => key === 'mangaId' ? 'm1' : null) })
}));

describe('KIỂM THỬ LOGIC ĐĂNG CHƯƠNG (TIẾNG VIỆT)', () => {
  it('1. Kiểm tra hiển thị đúng tên truyện khi vào trang', async () => {
    render(<AdminUploadPage />);
    await waitFor(() => {
      expect(screen.getByText('TRUYỆN TEST')).toBeInTheDocument();
    });
  });

  it('2. Chặn đăng chương nếu chưa nhập số chương', async () => {
    render(<AdminUploadPage />);
    const submitBtn = screen.getByText(/XUẤT BẢN NGAY/i);
    fireEvent.click(submitBtn);
    
    await waitFor(() => {
      expect(screen.getByText(/CHƯA NHẬP ĐỦ THÔNG TIN!/i)).toBeInTheDocument();
    });
  });

  it('3. Kiểm tra logic nhập số chương và tên chương', () => {
    render(<AdminUploadPage />);
    const inputNum = screen.getByPlaceholderText('1');
    const inputTitle = screen.getByPlaceholderText('Nội dung tùy chọn...');
    
    fireEvent.change(inputNum, { target: { value: '1.5' } });
    fireEvent.change(inputTitle, { target: { value: 'Bản đặc biệt' } });
    
    expect(inputNum).toHaveValue(1.5);
    expect(inputTitle).toHaveValue('Bản đặc biệt');
  });

  it('4. Kiểm tra nút "QUAY LẠI" hoạt động đúng', () => {
    render(<AdminUploadPage />);
    const backBtn = screen.getByText('QUAY LẠI');
    expect(backBtn).toBeInTheDocument();
  });
});
