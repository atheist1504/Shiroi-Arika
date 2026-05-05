import { Redis } from '@upstash/redis';

/**
 * 🚀 REDIS CLIENT (Upstash) 🍀
 * Giúp giảm tải cho Supabase và Vercel Data Cache.
 * Sử dụng giao thức REST để hoạt động ổn định trên Serverless.
 */
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

/**
 * 🛠️ HELPER: Lấy dữ liệu từ Cache hoặc thực thi hàm gốc nếu không có
 * @param {string} key - Khóa duy nhất cho cache
 * @param {Function} fetchFn - Hàm fetch dữ liệu gốc (Promise)
 * @param {number} ttl - Thời gian sống của cache (giây), mặc định 1 giờ (3600s)
 */
export async function getCachedData(key, fetchFn, ttl = 3600) {
  try {
    // 1. Thử lấy từ Redis
    const cached = await redis.get(key);
    if (cached) {
      console.log(`🍀 [Redis] Cache HIT for key: ${key}`);
      return cached;
    }

    // 2. Nếu không có, gọi hàm fetch gốc
    console.log(`🧱 [Redis] Cache MISS for key: ${key}. Fetching from DB...`);
    const data = await fetchFn();

    // 3. Lưu vào Redis (kèm TTL)
    if (data) {
      await redis.set(key, data, { ex: ttl });
    }

    return data;
  } catch (error) {
    console.warn(`⚠️ [Redis] Lỗi khi truy cập Cache (Key: ${key}):`, error.message);
    // Nếu Redis lỗi, fallback về hàm fetch gốc để web không bị chết
    return await fetchFn();
  }
}

/**
 * 🧹 HELPER: Xóa Cache theo Key
 */
export async function invalidateCache(key) {
  try {
    await redis.del(key);
    console.log(`🧹 [Redis] Invalidated cache for key: ${key}`);
  } catch (error) {
    console.warn(`⚠️ [Redis] Lỗi khi xóa Cache (Key: ${key}):`, error.message);
  }
}
