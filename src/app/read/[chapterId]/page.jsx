import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import ReaderClient from "./ReaderClient";
import { notFound } from "next/navigation";
import { getCachedData } from "@/lib/redis";

export const revalidate = 0; // Tắt cache trang đọc 🍀
export const dynamic = 'force-dynamic';

// 🕵️‍♂️ HÀM HỖ TRỢ CHỌN CLIENT (Server-side)
const getDbClient = () => supabaseAdmin || supabase;

export async function generateMetadata({ params }) {
  const { chapterId } = params;
  const client = getDbClient();

  const chapter = await getCachedData(`read_meta_chap_${chapterId}`, async () => {
    const { data } = await client
      .from("chapters")
      .select("chapter_number, manga_id")
      .eq("id", chapterId)
      .single();
    return data;
  }, 3600);

  if (!chapter) return { title: "Chương không tồn tại - Shiroi Arika" };

  const manga = await getCachedData(`manga_meta_${chapter.manga_id}`, async () => {
    const { data } = await client
      .from("mangas")
      .select("title")
      .eq("id", chapter.manga_id)
      .single();
    return data;
  }, 3600);

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
  const client = getDbClient();

  // Initial fetch with Redis Cache ⚡ - Cache 1 giờ cho nội dung chương
  const chapter = await getCachedData(`read_chap_detail_${chapterId}`, async () => {
    const { data } = await client.from("chapters").select("*").eq("id", chapterId).single();
    return data;
  }, 3600);

  if (!chapter) notFound();

  const manga = await getCachedData(`manga_detail_${chapter.manga_id}`, async () => {
    const { data } = await client.from("mangas").select("*").eq("id", chapter.manga_id).single();
    return data;
  }, 3600);

  const pages = await getCachedData(`read_chap_pages_${chapterId}`, async () => {
    const { data } = await client.from("pages").select("*").eq("chapter_id", chapterId).order("page_number", { ascending: true });
    return data || [];
  }, 3600);
  
  // Cache danh sách chương anh em (Siblings) - 30 phút
  const siblings = await getCachedData(`manga_siblings_${chapter.manga_id}`, async () => {
    const { data } = await client.from("chapters").select("id, chapter_number").eq("manga_id", chapter.manga_id).order("chapter_number", { ascending: true });
    return data || [];
  }, 1800);

  // 🔍 LOG DEBUG CHO VERCEL
  console.log(`🍀 [Reader-Redis] Chapter: ${chapter.chapter_number} | Manga: ${manga?.title} | Pages: ${pages?.length || 0}`);

  return (
    <ReaderClient 
      key={chapterId}
      chapterId={chapterId}
      initialChapter={chapter}
      initialManga={manga}
      initialPages={pages || []}
      initialSiblings={siblings || []}
    />
  );
}
