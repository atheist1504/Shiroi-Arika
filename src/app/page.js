import { supabase } from "@/lib/supabase";
import HomeClient from "./HomeClient";

export const revalidate = 0; // Tạm thời tắt cache để bạn thấy thay đổi tức thì 🚀

export const metadata = {
  title: "Shiroi Arika (🍀) - Đọc Truyện Tranh Online Miễn Phí",
  description: "Trang web đọc truyện tranh online miễn phí cập nhật chương mới nhanh nhất, chất lượng hình ảnh sắc nét, không quảng cáo gây khó chịu. Trải nghiệm đọc truyện cao cấp tại Shiroi Arika.",
}

export default async function Home({ searchParams }) {
  const currentPage = parseInt(searchParams?.page || '1') || 1;
  const pageSize = 20;
  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;

  // 1. Lấy danh sách SIÊU PHẨM (Được Ghim) 🍀
  const { data: featuredMangas } = await supabase
    .from("mangas")
    .select("id, title, cover_image, description, genres, is_featured")
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(5);

  // 2. Lấy danh sách TRUYỆN MỚI CẬP NHẬT (Theo updated_at từ Trigger) 🕒
  const { data: latestMangas, error, count } = await supabase
    .from("mangas")
    .select("id, title, cover_image, description, genres, updated_at, chapters(chapter_number, created_at)", { count: 'exact' })
    .order("updated_at", { ascending: false })
    .order("chapter_number", { foreignTable: "chapters", ascending: false })
    .range(from, to)
    .limit(1, { foreignTable: "chapters" });

  if (error) {
    console.error("Lỗi khi tải truyện mới:", error);
  }

  return (
    <HomeClient 
      initialFeatured={featuredMangas || []} 
      initialLatest={latestMangas || []} 
      totalCount={count || 0}
      currentPage={currentPage}
      pageSize={pageSize}
    />
  );
}
