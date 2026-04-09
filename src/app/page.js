import { supabase } from "@/lib/supabase";
import HomeClient from "./HomeClient";

export const revalidate = 60; // Cache trang trong 60 giây (ISR) - Giúp giảm tải tối đa cho Supabase

export const metadata = {
  title: "Shiroi Arika (🍀) - Đọc Truyện Tranh Online Miễn Phí",
  description: "Trang web đọc truyện tranh online miễn phí cập nhật chương mới nhanh nhất, chất lượng hình ảnh sắc nét, không quảng cáo gây khó chịu. Trải nghiệm đọc truyện cao cấp tại Shiroi Arika.",
}

export default async function Home() {
  const { data: mangas, error } = await supabase
    .from("mangas")
    .select("id, title, cover_image, description, genres, created_at, chapters(chapter_number, created_at)")
    .order("created_at", { ascending: false })
    .order("chapter_number", { foreignTable: "chapters", ascending: false })
    .limit(15)
    .limit(1, { foreignTable: "chapters" });

  if (error) {
    console.error("Lỗi khi tải truyện:", error);
  }

  return (
    <HomeClient initialMangas={mangas || []} />
  );
}
