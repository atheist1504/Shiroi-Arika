import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProfilePage from '../src/app/profile/page';
import { supabase } from '../src/lib/supabase';

// Giả lập (Mock) thư viện next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Giả lập (Mock) thư viện supabase
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'mock-url' } }))
      }))
    }
  },
}));

describe('Kiểm tra Tính năng Hồ sơ (Profile Logic)', () => {
  const mockUser = { id: 'user-123', username: 'shiroi_fan', display_name: 'Fan Shiroi', bio: 'Yêu truyện' };

  beforeEach(() => {
    jest.clearAllMocks();
    Storage.prototype.getItem = jest.fn((key) => {
      if (key === 'shiroi_user') return JSON.stringify(mockUser);
      return null;
    });
    Storage.prototype.setItem = jest.fn();
  });

  it('phải đồng bộ dữ liệu từ database khi vừa vào trang', async () => {
    supabase.from.mockImplementation(() => ({
      select: () => ({
        ilike: () => ({
          single: () => Promise.resolve({ data: mockUser, error: null })
        })
      })
    }));

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Fan Shiroi')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Yêu truyện')).toBeInTheDocument();
    });
  });

  it('phải cập nhật thành công và lưu vào localStorage khi nhấn Lưu', async () => {
    const updatedUser = { ...mockUser, display_name: 'Fan Cứng Shiroi' };
    
    supabase.from.mockImplementation(() => ({
      select: () => ({
        ilike: jest.fn(() => ({ single: () => Promise.resolve({ data: mockUser, error: null }) }))
      }),
      update: () => ({
        eq: () => ({
          select: () => Promise.resolve({ data: [updatedUser], error: null })
        })
      })
    }));

    render(<ProfilePage />);

    await waitFor(() => {
      const input = screen.getByLabelText(/Biệt hiệu hiển thị/i);
      fireEvent.change(input, { target: { value: 'Fan Cứng Shiroi' } });
    });

    const saveButton = screen.getByText(/XÁC NHẬN LƯU/i);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/THÀNH CÔNG! HỒ SƠ ĐÃ ĐƯỢC CHỨNG THỰC!/i)).toBeInTheDocument();
      expect(localStorage.setItem).toHaveBeenCalledWith('shiroi_user', JSON.stringify(updatedUser));
    });
  });
});
