import { supabase } from "@/lib/supabase";
import MangaClient from "./MangaClient";
import { notFound } from "next/navigation";

export const revalidate = 3600; // Cache trang chi tiết trong 1 giờ

// CHỈNH SỬA SEO ĐỘNG CHO TỪNG BỘ TRUYỆN
export async function generateMetadata({ params }) {
  const { mangaId } = params;

  const { data: manga } = await supabase
    .from("mangas")
    .select("title, description, cover_image")
    .eq("id", mangaId)
    .single();

  if (!manga) {
    return {
      title: "Không tìm thấy truyện - Shiroi Arika",
    };
  }

  const title = `${manga.title} [Đọc Online Miễn Phí] - Shiroi Arika 🍀`;
  const description = manga.description 
    ? manga.description.substring(0, 160) 
    : `Đọc truyện ${manga.title} online miễn phí bản đẹp, cập nhật sớm nhất tại Shiroi Arika. Trải nghiệm đọc truyện premium không quảng cáo.`;

  const baseUrl = 'https://shiroi-arika.vercel.app';
  const ogImageUrl = `${baseUrl}/api/og/manga?mangaId=${mangaId}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
      url: `${baseUrl}/manga/${mangaId}`,
      type: "book",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
    alternates: {
      canonical: `${baseUrl}/manga/${mangaId}`,
    },
  };
}

export default async function MangaPage({ params }) {
  const { mangaId } = params;

  // Fetch initial data in parallel ⚡
  const [mangaRes, chaptersRes] = await Promise.all([
    supabase.from("mangas").select("*").eq("id", mangaId).single(),
    supabase.from("chapters").select("*").eq("manga_id", mangaId).order("chapter_number", { ascending: false })
  ]);

  if (mangaRes.error || !mangaRes.data) {
    notFound();
  }

  const manga = mangaRes.data;
  const chapters = chaptersRes.data;

  return (
    <MangaClient 
      mangaId={mangaId} 
      initialManga={manga} 
      initialChapters={chapters || []} 
    />
  );
}
