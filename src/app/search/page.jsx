'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { optimizeImage } from '@/lib/cloudinary';
import Link from 'next/link';
import { MangaCardSkeleton } from '@/components/ui/Skeleton';
import { motion, AnimatePresence } from 'framer-motion';

const GENRES = [
  "All", "Manga", "Manhua", "Manhwa", "Truyện màu", "One Shot",
  "Action", "Adventure", "Comedy", "Drama", "Fantasy", 
  "Horror", "Mystery", "Psychological", "Romance", 
  "Sci-Fi", "Slice of Life", "Supernatural", "Tragedy", "Historical",
  "Isekai", "School Life"
];

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const query = searchParams.get('q') || '';
  const initialGenre = searchParams.get('genre') || 'All';
  const currentPage = parseInt(searchParams.get('page') || '1') || 1;
  const pageSize = 20;

  const [mangas, setMangas] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState(initialGenre);
  const [searchInput, setSearchInput] = useState(query);

  useEffect(() => {
    setSearchInput(query);
    setSelectedGenre(initialGenre);
    fetchResults();
  }, [query, initialGenre, currentPage]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      let supabaseQuery = supabase.from('mangas').select(`
        *,
        chapters(chapter_number)
      `, { count: 'exact' });

      if (query) {
        supabaseQuery = supabaseQuery.ilike('title', `%${query}%`);
      }

      if (initialGenre !== 'All') {
        supabaseQuery = supabaseQuery.contains('genres', [initialGenre]);
      }

      const { data, error, count } = await supabaseQuery
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
      console.error('Lỗi tìm kiếm:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchInput) params.set('q', searchInput);
    else params.delete('q');
    params.set('page', '1');
    router.push(`/search?${params.toString()}`);
  };

  const handleGenreChange = (genre) => {
    const params = new URLSearchParams(searchParams);
    if (genre !== 'All') params.set('genre', genre);
    else params.delete('genre');
    params.set('page', '1');
    router.push(`/search?${params.toString()}`);
  };

  const handlePageChange = (p) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', p);
    router.push(`/search?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="min-h-screen bg-[#0a0c0a] text-white p-6 md:p-12 relative overflow-hidden">
      {/* SHIROI AMBIENCE BRUSHES */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#4caf50]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/3 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10 pt-16 md:pt-20">
        
        {/* HEADER & SEARCH BAR */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
          <div className="space-y-2">
             <div className="flex items-center gap-3 mb-2">
                <div className="w-1.5 h-8 bg-[#4caf50] rounded-full shadow-[0_0_15px_rgba(76,175,80,0.5)]"></div>
                <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">Kết Quả Tìm Kiếm 🍀</h1>
             </div>
             <p className="text-gray-500 font-medium tracking-wide">
                {query ? (
                  <>Đang hiển thị kết quả cho: <span className="text-[#4caf50] font-bold">"{query}"</span></>
                ) : (
                  "Khám phá toàn bộ kho truyện của Shiroi Arika"
                )}
             </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative group w-full md:w-[450px]">
             <input 
               type="text" 
               placeholder="Tìm siêu phẩm tiếp theo..." 
               value={searchInput}
               onChange={(e) => setSearchInput(e.target.value)}
               className="w-full bg-[#141814]/80 backdrop-blur-xl border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-[#4caf50] focus:ring-4 focus:ring-[#4caf50]/10 transition-all font-bold placeholder:text-gray-700 shadow-2xl"
             />
             <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-[#4caf50] text-[#0a0c0a] rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#4caf50]/20">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
             </button>
          </form>
        </div>

        {/* GENRE FILTERING SYSTEM */}
        <section className="mb-12">
            <div className="flex items-center gap-2 mb-6">
                <svg className="w-4 h-4 text-[#4caf50]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Lọc theo thể loại</span>
            </div>
            <div className="flex flex-wrap gap-2 pb-2 custom-scrollbar overflow-x-auto md:overflow-visible">
                {GENRES.map(genre => (
                    <button
                        key={genre}
                        onClick={() => handleGenreChange(genre)}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shrink-0 ${
                            selectedGenre === genre 
                                ? 'bg-[#4caf50] border-[#4caf50] text-[#0a0c0a] shadow-[0_8px_20px_rgba(76,175,80,0.3)] scale-105' 
                                : 'bg-[#141814]/60 border-white/5 text-gray-400 hover:border-[#4caf50]/40 hover:text-white'
                        }`}
                    >
                        {genre}
                    </button>
                ))}
            </div>
        </section>

        {/* RESULTS GRID */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-8 animate-pulse">
            {[...Array(12)].map((_, i) => (
              <MangaCardSkeleton key={i} />
            ))}
          </div>
        ) : mangas.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-32 bg-[#141814]/40 border-2 border-dashed border-white/5 rounded-[40px] flex flex-col items-center gap-6"
          >
             <div className="relative">
                <span className="text-8xl grayscale opacity-20">🔍</span>
                <span className="absolute bottom-0 right-0 text-4xl">🌵</span>
             </div>
             <div className="space-y-2">
                <h3 className="text-xl font-black text-gray-600 uppercase tracking-widest">Không có kết quả nào</h3>
                <p className="text-gray-700 text-sm font-medium">Hãy thử với từ khóa khác hoặc một thể loại khác bạn nhé!</p>
             </div>
             <button 
                onClick={() => { setSearchInput(''); handleGenreChange('All'); }}
                className="mt-4 px-8 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#4caf50] hover:text-[#0a0c0a] transition-all"
             >
                Xóa các bộ lọc
             </button>
          </motion.div>
        ) : (
          <>
            <motion.div 
              initial="hidden"
              animate="show"
              variants={{
                  show: { transition: { staggerChildren: 0.05 } }
              }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-8"
            >
              {mangas.map((manga) => (
                <motion.div
                  key={manga.id}
                  variants={{
                      hidden: { opacity: 0, y: 20 },
                      show: { opacity: 1, y: 0 }
                  }}
                >
                  <Link 
                    href={`/manga/${manga.id}`}
                    className="group flex flex-col bg-[#141814]/60 border border-white/5 hover:border-[#4caf50]/50 rounded-[24px] overflow-hidden shadow-2xl transition-all hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] h-full"
                  >
                    <div className="aspect-[2/3] relative overflow-hidden bg-black/40">
                      <img 
                        src={optimizeImage(manga.cover_image, 400)} 
                        alt={manga.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                      
                      {manga.latestChapter && (
                        <div className="absolute bottom-3 left-3">
                           <span className="bg-[#4caf50] text-[#0a0c0a] text-[9px] font-black px-2.5 py-1 rounded-lg shadow-xl shadow-[#4caf50]/20 border border-[#4caf50]/20">
                             CHAP {manga.latestChapter.chapter_number}
                           </span>
                        </div>
                      )}

                      <div className="absolute top-3 left-3 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         {manga.genres?.slice(0, 2).map((g, i) => (
                           <span key={i} className="bg-black/80 backdrop-blur-md text-[8px] text-[#4caf50] px-2 py-0.5 rounded-md border border-[#4caf50]/20 uppercase font-black tracking-widest">{g}</span>
                         ))}
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-center">
                      <h3 className="font-bold text-sm md:text-base line-clamp-2 group-hover:text-[#4caf50] transition-colors leading-tight">{manga.title}</h3>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>

            {/* Pagination UI 🍀 */}
            {totalPages > 1 && (
              <div className="mt-16 flex flex-wrap justify-center items-center gap-2 pb-10">
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
                          ? 'bg-[#4caf50] border-[#4caf50] text-[#0a0c0a] scale-110 shadow-lg shadow-[#4caf50]/20'
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
               <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Trang {currentPage} / {totalPages} (Tổng {totalCount} kết quả)</span>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0a0c0a; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2a332a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4caf50; }
      `}</style>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
        <div className="min-h-screen bg-[#0a0c0a] p-12 flex flex-col gap-10">
            <div className="animate-pulse space-y-4">
                <div className="h-10 w-64 bg-white/5 rounded-full" />
                <div className="h-4 w-96 bg-white/5 rounded-full" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-6 pt-20">
                {[...Array(12)].map((_, i) => <MangaCardSkeleton key={i} />)}
            </div>
        </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
