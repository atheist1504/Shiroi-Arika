import { createHash } from 'crypto';

/**
 * 🔐 HỆ THỐNG MÃ HÓA MẬT KHẨU MỚI (BẢO MẬT CAO)
 * Sử dụng SHA-256 kết hợp Salt để bảo vệ dữ liệu người dùng.
 */

const SECRET_SALT = process.env.PASSWORD_SALT || "shiroi-arika-eternal-peace-2026";

/**
 * Mã hóa mật khẩu theo chuẩn SHA-256
 */
export function hashPassword(password) {
    if (!password) return "";
    return createHash('sha256')
        .update(password + SECRET_SALT)
        .digest('hex');
}

/**
 * Mã hóa mật khẩu theo kiểu cũ (Dùng để kiểm tra và chuyển đổi)
 * @deprecated Tránh sử dụng cho tài khoản mới
 */
export function legacyHashPassword(password) {
    if (!password) return "";
    try {
        return btoa(password + "shiroi-secret-salt").split('').reverse().join('');
    } catch (e) {
        return password; // Trường hợp lỗi encoding
    }
}

/**
 * Kiểm tra mật khẩu (Hỗ trợ cả cũ và mới)
 */
export function verifyPassword(inputPassword, storedHash) {
    // 1. Kiểm tra theo chuẩn mới
    const newHash = hashPassword(inputPassword);
    if (newHash === storedHash) return { valid: true, version: 'new' };

    // 2. Kiểm tra theo chuẩn cũ (Legacy)
    const oldHash = legacyHashPassword(inputPassword);
    if (oldHash === storedHash) return { valid: true, version: 'legacy' };

    // 3. Kiểm tra văn bản trơn (Cho các tài khoản sơ khai nhất)
    if (inputPassword === storedHash) return { valid: true, version: 'plain' };

    return { valid: false };
}
