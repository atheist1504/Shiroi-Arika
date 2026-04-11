'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { optimizeImage } from '@/lib/cloudinary';

const GENRES = [
  "All", "Manga", "Manhua", "Manhwa", "Truyện màu", "One Shot",
  "Action", "Adventure", "Comedy", "Drama", "Fantasy", 
  "Horror", "Mystery", "Psychological", "Romance", 
  "Sci-Fi", "Slice of Life", "Supernatural", "Tragedy", "Historical",
  "Isekai", "School Life"
];

function MangaListContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const currentPage = parseInt(searchParams.get('page') || '1') || 1;
  const selectedGenre = searchParams.get('genre') || 'All';
  const searchQuery = searchParams.get('q') || '';
  const pageSize = 20;

  const [mangas, setMangas] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    fetchMangas();
  }, [currentPage, selectedGenre, searchQuery]);

  const fetchMangas = async () => {
    try {
      setLoading(true);
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase.from('mangas').select(`
        *,
        chapters(chapter_number)
      `, { count: 'exact' });

      if (selectedGenre !== 'All') {
        query = query.contains('genres', [selectedGenre]);
      }

      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      const { data, error, count } = await query
        .order('updated_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      const processed = data?.map(m => ({
        ...m,
        latestChapter: m.chapters?.sort((a, b) => b.chapter_number - a.chapter_number)[0] || null
      })) || [];

      setMangas(processed);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Lỗi tải danh sách truyện:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (p) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', p);
    router.push(`/manga?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGenreChange = (genre) => {
    const params = new URLSearchParams(searchParams);
    params.set('genre', genre);
    params.set('page', '1'); // Reset to page 1
    router.push(`/manga?${params.toString()}`);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (localSearch) params.set('q', localSearch);
    else params.delete('q');
    params.set('page', '1');
    router.push(`/manga?${params.toString()}`);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="min-h-screen bg-[#0a0c0a] text-white p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-8 bg-[#4caf50] rounded-full shadow-[0_0_15px_rgba(76,175,80,0.5)]"></div>
             <h1 className="text-3xl font-black uppercase tracking-tight">Kho Truyện 🍀</h1>
          </div>
          
          <form onSubmit={handleSearchSubmit} className="relative group w-full md:w-96">
             <input 
               type="text" 
               placeholder="Tìm tên truyện..." 
               value={localSearch}
               onChange={(e) => setLocalSearch(e.target.value)}
               className="w-full bg-[#141814] border border-[#2a332a] rounded-xl px-5 py-3 outline-none focus:border-[#4caf50] transition-all group-hover:bg-[#1a211a]"
             />
             <button type="submit" className="absolute right-4 top-3.5 text-gray-500 hover:text-[#4caf50]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
             </button>
          </form>
        </div>

        {/* Danh sách Thể loại */}
        <div className="flex flex-wrap gap-2 mb-10 overflow-x-auto pb-4 custom-scrollbar">
          {GENRES.map(genre => (
            <button
              key={genre}
              onClick={() => handleGenreChange(genre)}
              className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
                selectedGenre === genre 
                  ? 'bg-[#4caf50] border-[#4caf50] text-[#141814] shadow-lg shadow-[#4caf50]/20' 
                  : 'bg-[#141814] border-[#2a332a] text-gray-500 hover:border-[#4caf50] hover:text-[#4caf50]'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 animate-pulse">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-[#141814] rounded-xl border border-[#2a332a]"></div>
            ))}
          </div>
        ) : mangas.length === 0 ? (
          <div className="text-center py-32 bg-[#141814]/40 rounded-3xl border-2 border-dashed border-[#2a332a] flex flex-col items-center gap-4">
             <span className="text-6xl opacity-20 grayscale">🌵</span>
             <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Không tìm thấy truyện nào phù hợp</p>
             <button onClick={() => router.push('/manga')} className="text-[#4caf50] text-[10px] font-black uppercase underline">Quay lại tất cả</button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {mangas.map((manga) => (
                <Link 
                  key={manga.id} 
                  href={`/manga/${manga.id}`}
                  className="group flex flex-col bg-[#141814]/60 border border-[#2a332a] hover:border-[#4caf50]/50 rounded-xl overflow-hidden shadow-2xl transition-all hover:-translate-y-2"
                >
                  <div className="aspect-[2/3] relative overflow-hidden">
                    <img 
                      src={optimizeImage(manga.cover_image, 400)} 
                      alt={manga.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"></div>
                    
                    {manga.latestChapter && (
                      <div className="absolute bottom-3 left-3">
                         <span className="bg-[#4caf50] text-[#141814] text-[10px] font-black px-2.5 py-1 rounded shadow-xl">
                           CHAP {manga.latestChapter.chapter_number}
                         </span>
                      </div>
                    )}

                    <div className="absolute top-3 left-3 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                       {manga.genres?.slice(0, 2).map((g, i) => (
                         <span key={i} className="bg-black/60 text-[8px] text-[#4caf50] px-1.5 py-0.5 rounded border border-[#4caf50]/20 uppercase font-black">{g}</span>
                       ))}
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-bold text-sm line-clamp-2 group-hover:text-[#4caf50] transition-colors leading-tight">{manga.title}</h3>
                  </div>
                </Link>
              ))}
            </div>

            {/* Phân trang */}
            {totalPages > 1 && (
              <div className="mt-16 flex flex-wrap justify-center items-center gap-2">
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  className={`px-4 py-2 rounded-xl font-bold text-[10px] uppercase transition-all border ${
                    currentPage === 1 
                    ? 'opacity-30 cursor-not-allowed border-white/5' 
                    : 'bg-[#141814] border-white/5 text-gray-400 hover:border-[#4caf50] hover:text-[#4caf50]'
                  }`}
                >
                  TRƯỚC
                </button>

                {[...Array(totalPages)].map((_, i) => {
                  const p = i + 1;
                  if (p === 1 || p === totalPages || (p >= currentPage - 2 && p <= currentPage + 2)) {
                    return (
                      <button
                        key={p}
                        onClick={() => handlePageChange(p)}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl font-black text-xs transition-all border ${
                          currentPage === p
                          ? 'bg-[#4caf50] border-[#4caf50] text-[#141814] scale-110 shadow-lg shadow-[#4caf50]/20'
                          : 'bg-[#141814] border-white/5 text-gray-500 hover:border-[#4caf50] hover:text-[#4caf50]'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  }
                  if (p === currentPage - 3 || p === currentPage + 3) return <span key={p} className="text-gray-700">...</span>;
                  return null;
                })}

                <button
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  className={`px-4 py-2 rounded-xl font-bold text-[10px] uppercase transition-all border ${
                    currentPage === totalPages 
                    ? 'opacity-30 cursor-not-allowed border-white/5' 
                    : 'bg-[#141814] border-white/5 text-gray-400 hover:border-[#4caf50] hover:text-[#4caf50]'
                  }`}
                >
                  SAU
                </button>
              </div>
            )}
            
            <div className="text-center mt-6">
               <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Trang {currentPage} / {totalPages} (Tổng {totalCount} truyện)</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function MangaListPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0c0a] flex items-center justify-center"><div className="w-10 h-10 border-4 border-[#4caf50]/20 border-t-[#4caf50] rounded-full animate-spin"></div></div>}>
      <MangaListContent />
    </Suspense>
  );
}
