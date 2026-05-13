import { supabase } from "@/lib/supabase";
import Link from 'next/link';

export const revalidate = 0; // Tắt cache tự động ⚡
export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Truyện Mới Cập Nhật - Shiroi Arika 🍀",
  description: "Danh sách những chap truyện mới nhất vừa được đăng tải trên Shiroi Arika. Đọc ngay hôm nay!",
}

export default async function LatestPage() {
  const { data: updates, error } = await supabase
    .from('chapters')
    .select(`
      id,
      chapter_number,
      created_at,
      mangas (
        id,
        title,
        cover_image
      )
    `)
    .order('created_at', { ascending: false })
    .limit(48); // Tăng lên 48 bộ cho trải nghiệm phong phú hơn

  if (error) {
    console.error('Lỗi tải cập nhật mới:', error);
  }

  return (
    <div className="min-h-screen bg-[#0a0c0a] text-white p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-10 pt-20">
          <div className="w-2 h-8 bg-[#4caf50] rounded-full shadow-[0_0_15px_rgba(76,175,80,0.5)]"></div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Mới Cập Nhật 🍀</h1>
        </div>

        {!updates || updates.length === 0 ? (
          <div className="text-center py-20 text-gray-500 glass rounded-2xl border-dashed border-2 border-[#2a332a]">
            Hiện chưa có cập nhật nào mới. Quay lại sớm nhé!
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {updates.map((upd) => (
              <Link 
                key={upd.id} 
                href={`/manga/${upd.mangas.id}`}
                className="group relative flex flex-col bg-[#141814] border border-[#2a332a] hover:border-[#4caf50] rounded-xl overflow-hidden transition-all hover:-translate-y-1 shadow-lg"
              >
                <div className="aspect-[2/3] relative overflow-hidden">
                  <img 
                    src={upd.mangas.cover_image || 'https://via.placeholder.com/300x450?text=No+Cover'} 
                    alt={upd.mangas.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-90"></div>
                  
                  {/* Badge Chapter */}
                  <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end">
                    <span className="bg-[#4caf50] text-[#141814] text-[10px] font-black px-2 py-1 rounded-md shadow-lg">
                      CHAP {upd.chapter_number}
                    </span>
                  </div>
                </div>

                <div className="p-3">
                  <h3 className="font-bold text-sm line-clamp-2 group-hover:text-[#4caf50] transition-colors min-h-[40px]">
                    {upd.mangas.title}
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-1">
                    {new Date(upd.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {new Date(upd.created_at).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
