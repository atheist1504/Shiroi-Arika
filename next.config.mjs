/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true, // 🚀 TẮT TỐI ƯU ẢNH TRÊN VERCEL ĐỂ TIẾT KIỆM CPU
    domains: ["images.unsplash.com", "res.cloudinary.com"],
  },
};

export default nextConfig;
