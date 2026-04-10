import { supabase } from "@/lib/supabase";
import HomeClient from "./HomeClient";

export const revalidate = 0; // Tạm thời tắt cache để bạn thấy thay đổi tức thì 🚀

export const metadata = {
  title: "Shiroi Arika (🍀) - Đọc Truyện Tranh Online Miễn Phí",
  description: "Trang web đọc truyện tranh online miễn phí cập nhật chương mới nhanh nhất, chất lượng hình ảnh sắc nét, không quảng cáo gây khó chịu. Trải nghiệm đọc truyện cao cấp tại Shiroi Arika.",
}

export default async function Home() {
  // 1. Lấy danh sách SIÊU PHẨM (Được Ghim) 🍀
  const { data: featuredMangas } = await supabase
    .from("mangas")
    .select("id, title, cover_image, description, genres, is_featured")
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(5);

  // 2. Lấy danh sách TRUYỆN MỚI CẬP NHẬT (Theo thời gian) 🕒
  const { data: latestMangas, error } = await supabase
    .from("mangas")
    .select("id, title, cover_image, description, genres, created_at, chapters(chapter_number, created_at)")
    .order("created_at", { ascending: false })
    .order("chapter_number", { foreignTable: "chapters", ascending: false })
    .limit(15)
    .limit(1, { foreignTable: "chapters" });

  if (error) {
    console.error("Lỗi khi tải truyện mới:", error);
  }

  return (
    <HomeClient 
      initialFeatured={featuredMangas || []} 
      initialLatest={latestMangas || []} 
    />
  );
}
