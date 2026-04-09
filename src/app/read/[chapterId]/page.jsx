import { supabase } from "@/lib/supabase";
import ReaderClient from "./ReaderClient";
import { notFound } from "next/navigation";

export const revalidate = 0; // Luôn lấy dữ liệu mới nhất để cập nhật ảnh ngay lập tức 🍀

export async function generateMetadata({ params }) {
  const { chapterId } = params;

  const { data: chapter } = await supabase
    .from("chapters")
    .select("chapter_number, manga_id")
    .eq("id", chapterId)
    .single();

  if (!chapter) return { title: "Chương không tồn tại - Shiroi Arika" };

  const { data: manga } = await supabase
    .from("mangas")
    .select("title")
    .eq("id", chapter.manga_id)
    .single();

  const title = `Đọc ${manga?.title} Chương ${chapter.chapter_number} Online Miễn Phí - Shiroi Arika 🍀`;
  const description = `Đọc truyện tranh ${manga?.title} chương ${chapter.chapter_number} bản dịch tiếng Việt mới nhất, chất lượng cao tại Shiroi Arika. Truyện luôn được cập nhật sớm nhất.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
    },
    alternates: {
      canonical: `https://shiroiarika.vercel.app/read/${chapterId}`,
    },
  };
}

export default async function ReaderPage({ params }) {
  const { chapterId } = params;

  // Initial fetch for server-side rendering
  const { data: chapter } = await supabase.from("chapters").select("*").eq("id", chapterId).single();
  if (!chapter) notFound();

  const { data: manga } = await supabase.from("mangas").select("*").eq("id", chapter.manga_id).single();
  const { data: pages } = await supabase.from("pages").select("*").eq("chapter_id", chapterId).order("page_number", { ascending: true });
  const { data: siblings } = await supabase.from("chapters").select("id, chapter_number").eq("manga_id", chapter.manga_id).order("chapter_number", { ascending: true });

  return (
    <ReaderClient 
      chapterId={chapterId}
      initialChapter={chapter}
      initialManga={manga}
      initialPages={pages || []}
      initialSiblings={siblings || []}
    />
  );
}
