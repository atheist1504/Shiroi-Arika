import { supabase } from "@/lib/supabase";

export default async function sitemap() {
  const baseUrl = "https://shiroi-arika.vercel.app";

  try {
    // 1. Fetch all manga IDs for dynamic routes
    const { data: mangas } = await supabase
      .from("mangas")
      .select("id, updated_at");

    const mangaUrls = (mangas || []).map((manga) => ({
      url: `${baseUrl}/manga/${manga.id}`,
      lastModified: new Date(manga.updated_at || new Date()),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    // 2. Fetch all chapter IDs for the reading routes
    const { data: chapters } = await supabase
      .from("chapters")
      .select("id, created_at");

    const chapterUrls = (chapters || []).map((chapter) => ({
      url: `${baseUrl}/read/${chapter.id}`,
      lastModified: new Date(chapter.created_at || new Date()),
      changeFrequency: 'monthly',
      priority: 0.5,
    }));

    // 3. Static routes
    const staticRoutes = ["", "/latest"].map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    }));

    return [...staticRoutes, ...mangaUrls, ...chapterUrls];
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return [];
  }
}
