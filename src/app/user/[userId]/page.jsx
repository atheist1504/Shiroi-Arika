import { supabase } from "@/lib/supabase";
import ProfileClient from "./ProfileClient";
import { notFound } from "next/navigation";

export const revalidate = 0; // Tắt cache để thấy thay đổi ngay lập tức 🍀

// 🚀 TỐI ƯU SEO ĐỘNG CHO TRANG CÁ NHÂN THÀNH VIÊN 🍀
export async function generateMetadata({ params }) {
  const { userId } = params;

  let { data: user } = await supabase
    .from("shiroi_users")
    .select("username, display_name, bio, avatar_url")
    .eq("id", userId.length === 36 ? userId : '00000000-0000-0000-0000-000000000000')
    .maybeSingle();

  if (!user) {
    const { data: byUsername } = await supabase
      .from("shiroi_users")
      .select("username, display_name, bio, avatar_url")
      .eq("username", userId)
      .maybeSingle();
    user = byUsername;
  }

  if (!user) {
    return {
      title: "Không tìm thấy thành viên - Shiroi Arika",
    };
  }

  const name = user.display_name || user.username;
  const title = `Hồ sơ thành viên ${name} - Thánh địa Shiroi Arika 🍀`;
  const description = user.bio 
    ? user.bio.substring(0, 160) 
    : `Xem hồ sơ của ${name} tại Shiroi Arika. Theo dõi tiến trình tu luyện, cấp độ và danh hiệu của thành viên này.`;

  const baseUrl = 'https://shiroi-arika.vercel.app';
  const avatarUrl = user.avatar_url || 'https://psgivxgycjireinwnelc.supabase.co/storage/v1/object/public/avatars/default-avatar.png';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: avatarUrl, width: 400, height: 400 }],
      url: `${baseUrl}/user/${userId}`,
      type: "profile",
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: [avatarUrl],
    },
    alternates: {
      canonical: `${baseUrl}/user/${userId}`,
    },
  };
}

export default async function PublicProfilePage({ params }) {
  const { userId } = params;

  // 1. Fetch User Info (Server-side) - Hỗ trợ cả ID và Username 🍀
  let { data: userData } = await supabase
    .from('shiroi_users')
    .select('*')
    .eq('id', userId.length === 36 ? userId : '00000000-0000-0000-0000-000000000000') // Tránh lỗi type UUID
    .maybeSingle();

  if (!userData) {
    const { data: byUsername } = await supabase
      .from('shiroi_users')
      .select('*')
      .eq('username', userId)
      .maybeSingle();
    userData = byUsername;
  }

  if (!userData) {
    notFound();
  }

  // 2. Fetch Stats
  const { count: mangaCount } = await supabase
    .from('shiroi_history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  const { count: chapterCount } = await supabase
    .from('shiroi_read_chapters')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);


  const initialStats = {
    total_mangas: mangaCount || 0,
    total_chapters: chapterCount || 0
  };

  return (
    <ProfileClient 
      userId={userId}
      initialUser={userData} 
      initialStats={initialStats} 
    />
  );
}
