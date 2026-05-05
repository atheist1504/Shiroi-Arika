import { supabase } from "@/lib/supabase";
import HomeClient from "./HomeClient";
import { getCachedData } from "@/lib/redis";

export const revalidate = 3600; // Cache trang chủ trong 1 giờ, tự động làm mới khi có truyện mới 🚀

export const metadata = {
  title: "Shiroi Arika (🍀) - Đọc Truyện Tranh Online Miễn Phí",
  description: "Trang web đọc truyện tranh online miễn phí cập nhật chương mới nhanh nhất, chất lượng hình ảnh sắc nét, không quảng cáo gây khó chịu. Trải nghiệm đọc truyện cao cấp tại Shiroi Arika.",
}

export default async function Home({ searchParams }) {
  const currentPage = parseInt(searchParams?.page || '1') || 1;
  const pageSize = 20;
  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;

  // 1. Lấy danh sách SIÊU PHẨM (Được Ghim) 🍀 - Cache 1 giờ
  const featuredMangas = await getCachedData('home_featured_mangas', async () => {
    const { data } = await supabase
      .from("mangas")
      .select("id, title, cover_image, description, genres, is_featured")
      .eq("is_featured", true)
      .order("created_at", { ascending: false })
      .limit(5);
    return data || [];
  }, 3600);

  // 2. Lấy danh sách TRUYỆN MỚI CẬP NHẬT (Sử dụng Cache) 🕒 - Cache 10 phút (600s) cho trang 1, 1 giờ cho trang khác
  const cacheKey = `home_latest_mangas_p${currentPage}`;
  const ttl = currentPage === 1 ? 600 : 3600;

  const cacheResult = await getCachedData(cacheKey, async () => {
    const { data, error, count } = await supabase
      .from("mangas")
      .select("id, title, cover_image, description, genres, updated_at, total_chapters, latest_chapter_number", { count: 'exact' })
      .order("updated_at", { ascending: false })
      .range(from, to);
    
    if (error) {
      console.error("Lỗi khi tải truyện mới:", error);
      return { data: [], count: 0 };
    }
    return { data: data || [], count: count || 0 };
  }, ttl);

  const latestMangas = cacheResult?.data || [];
  const count = cacheResult?.count || 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Shiroi Arika",
    "alternateName": "Shiroi Arika Manga",
    "url": "https://shiroi-arika.vercel.app",
    "description": "Trang web đọc truyện tranh online miễn phí cập nhật chương mới nhanh nhất.",
    "publisher": {
      "@type": "Organization",
      "name": "Shiroi Arika",
      "logo": {
        "@type": "ImageObject",
        "url": "https://shiroi-arika.vercel.app/og-banner-v8.png"
      }
    },
    "primaryImageOfPage": {
      "@type": "ImageObject",
      "url": "https://shiroi-arika.vercel.app/og-banner-v8.png"
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeClient 
        initialFeatured={featuredMangas || []} 
        initialLatest={latestMangas || []} 
        totalCount={count || 0}
        currentPage={currentPage}
        pageSize={pageSize}
      />
    </>
  );
}
