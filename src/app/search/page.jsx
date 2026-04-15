'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { optimizeImage } from '@/lib/cloudinary';
import Link from 'next/link';
import { MangaCardSkeleton } from '@/components/ui/Skeleton';
import { motion, AnimatePresence } from 'framer-motion';

import { GENRES, STATUS_OPTIONS } from '@/lib/constants';


function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const query = searchParams.get('q') || '';
  const selectedGenres = searchParams.get('genres') ? searchParams.get('genres').split(',') : [];
  const selectedStatus = searchParams.get('status') || 'All';
  const currentPage = parseInt(searchParams.get('page') || '1') || 1;
  const pageSize = 24;

  const [mangas, setMangas] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(query);

  useEffect(() => {
    setSearchInput(query);
    fetchResults();
  }, [query, searchParams.get('genres'), selectedStatus, currentPage]);

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

      // Multi-genre selection matching (AND logic)
      if (selectedGenres.length > 0) {
        supabaseQuery = supabaseQuery.contains('genres', selectedGenres);
      }

      // Status filtering
      if (selectedStatus !== 'All') {
        supabaseQuery = supabaseQuery.eq('status', selectedStatus);
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

  const toggleGenre = (genre) => {
    const params = new URLSearchParams(searchParams);
    let newGenres = [...selectedGenres];
    
    if (newGenres.includes(genre)) {
      newGenres = newGenres.filter(g => g !== genre);
    } else {
      newGenres.push(genre);
    }

    if (newGenres.length > 0) params.set('genres', newGenres.join(','));
    else params.delete('genres');
    
    params.set('page', '1');
    router.push(`/search?${params.toString()}`);
  };

  const handleStatusChange = (status) => {
    const params = new URLSearchParams(searchParams);
    if (status !== 'All') params.set('status', status);
    else params.delete('status');
    params.set('page', '1');
    router.push(`/search?${params.toString()}`);
  };

  const handlePageChange = (p) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', p);
    router.push(`/search?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearAllFilters = () => {
    router.push('/search');
    setSearchInput('');
  };

  const totalPages = Math.ceil(totalCount / pageSize);
  const hasFilters = selectedGenres.length > 0 || selectedStatus !== 'All' || query !== '';

  return (
    <div className="min-h-screen bg-[#0a0c0a] text-white p-6 md:p-12 relative overflow-hidden pb-32">
      {/* SHIROI AMBIENCE BRUSHES */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#4caf50]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/3 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10 pt-16 md:pt-20">
        
        {/* HEADER & SEARCH BAR (KẾT HỢP) */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-8">
          <div className="space-y-2">
             <div className="flex items-center gap-3 mb-2">
                <div className="w-1.5 h-10 bg-[#4caf50] rounded-full shadow-[0_0_20px_rgba(76,175,80,0.6)]"></div>
                <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">Tìm Kiếm 🍀</h1>
             </div>
             <p className="text-gray-500 font-medium tracking-wide pl-4 text-xs">
                {query ? (
                  <>Kết quả cho: <span className="text-[#4caf50] font-black">"{query}"</span></>
                ) : (
                  "Khám phá kho tàng Shiroi Arika"
                )}
             </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            {hasFilters && (
                <button 
                  onClick={clearAllFilters}
                  className="px-6 py-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all whitespace-nowrap"
                >
                  XÓA BỘ LỌC
                </button>
            )}
          </div>
        </div>

        {/* BỘ LỌC GỌN GÀNG 🍀 */}
        <section className="bg-[#141814]/40 border border-[#2a332a] rounded-[32px] p-6 mb-12 space-y-8 backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                {/* Status */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 text-[#4caf50]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#4caf50]">TRẠNG THÁI</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {STATUS_OPTIONS.map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => handleStatusChange(opt.id)}
                                className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.05em] transition-all border ${
                                    selectedStatus === opt.id 
                                        ? 'bg-[#4caf50] border-[#4caf50] text-[#0a0c0a] shadow-lg' 
                                        : 'bg-[#0a0c0a] border-[#2a332a] text-gray-500 hover:border-[#4caf50]/40 hover:text-white'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Local Search Input Area */}
                <form onSubmit={handleSearchSubmit} className="relative group w-full md:w-80">
                   <input 
                     type="text" 
                     placeholder="Tìm siêu phẩm..." 
                     value={searchInput}
                     onChange={(e) => setSearchInput(e.target.value)}
                     className="w-full bg-[#0a0c0a] border border-[#2a332a] rounded-xl px-4 py-2.5 outline-none focus:border-[#4caf50] transition-all text-xs"
                   />
                   <button type="submit" className="absolute right-3 top-2.5 text-[#4caf50]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                   </button>
                </form>
            </div>

            <div className="h-px bg-white/5 w-full"></div>

            {/* Genres Grid */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-[#4caf50]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#4caf50]">THỂ LOẠI (VỀ Ô NHỎ)</span>
                </div>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                    <button
                        onClick={() => {
                            const params = new URLSearchParams(searchParams);
                            params.delete('genres');
                            params.set('page', '1');
                            router.push(`/search?${params.toString()}`);
                        }}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.05em] transition-all border ${
                            selectedGenres.length === 0 
                                ? 'bg-[#4caf50] border-[#4caf50] text-[#0a0c0a] shadow-lg' 
                                : 'bg-[#0a0c0a] border-[#2a332a] text-gray-400 hover:border-[#4caf50]/40 hover:text-white'
                        }`}
                    >
                        TẤT CẢ
                    </button>
                    {GENRES.map(genre => (
                        <button
                            key={genre}
                            onClick={() => toggleGenre(genre)}
                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.05em] transition-all border flex items-center gap-2 ${
                                selectedGenres.includes(genre)
                                    ? 'bg-[#4caf50] border-[#4caf50] text-[#0a0c0a] shadow-lg' 
                                    : 'bg-[#0a0c0a] border-[#2a332a] text-gray-500 hover:border-[#4caf50]/30 hover:text-white'
                            }`}
                        >
                            {genre}
                            {selectedGenres.includes(genre) && (
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </section>

        {/* RESULTS GRID */}
        <div className="flex items-center gap-4 mb-10">
           <span className="h-0.5 flex-1 bg-gradient-to-r from-transparent to-white/5"></span>
           <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em]">Đã tìm thấy {totalCount} siêu phẩm</p>
           <span className="h-0.5 flex-1 bg-gradient-to-l from-transparent to-white/5"></span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-10 animate-pulse">
            {[...Array(12)].map((_, i) => (
              <MangaCardSkeleton key={i} />
            ))}
          </div>
        ) : mangas.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-40 bg-[#141814]/40 border-2 border-dashed border-[#2a332a] rounded-[50px] flex flex-col items-center gap-8 mx-auto max-w-2xl shadow-2xl"
          >
             <div className="relative">
                <span className="text-9xl grayscale opacity-10">💮</span>
                <div className="absolute inset-0 flex items-center justify-center">
                   <svg className="w-16 h-16 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
             </div>
             <div className="space-y-3">
                <h3 className="text-[#4caf50] font-black uppercase tracking-[0.5em] text-sm">Không thể tìm thấy</h3>
                <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest leading-relaxed">Bộ lọc hiện tại không có kết quả phù hợp. Hãy thử thay đổi tiêu chí nhé!</p>
             </div>
             <button 
                onClick={clearAllFilters}
                className="px-10 py-4 bg-[#1a221a] text-[#4caf50] text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl border-2 border-[#4caf50]/20 hover:bg-[#4caf50] hover:text-black hover:border-[#4caf50] transition-all shadow-xl active:scale-95"
             >
                Xóa các bộ lọc 💮
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
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-10"
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
                    className="group flex flex-col bg-[#141814]/60 border border-[#2a332a] hover:border-[#4caf50]/50 rounded-[32px] overflow-hidden shadow-2xl transition-all duration-700 hover:-translate-y-3 hover:shadow-[0_30px_60px_rgba(0,0,0,0.6)] h-full"
                  >
                    <div className="aspect-[2/3] relative overflow-hidden bg-black/40">
                      <img 
                        src={optimizeImage(manga.cover_image, 400)} 
                        alt={manga.title}
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90" />
                      
                      {/* Status Badge */}
                      <div className="absolute top-4 right-4">
                        <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-[0.1em] shadow-2xl border backdrop-blur-md ${manga.status === 'completed' ? 'bg-blue-500/80 border-blue-400 text-white' : 'bg-[#4caf50]/80 border-[#66bb6a] text-[#0a0c0a]'}`}>
                            {manga.status === 'completed' ? 'Final' : 'Live'}
                        </span>
                      </div>

                      {manga.latestChapter && (
                        <div className="absolute bottom-4 left-4">
                           <span className="bg-white text-black text-[10px] font-black px-3 py-1.5 rounded-lg shadow-2xl tracking-tighter">
                             Chap {manga.latestChapter.chapter_number}
                           </span>
                        </div>
                      )}

                      <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0 duration-500 bg-gradient-to-t from-black to-transparent">
                         <div className="flex flex-wrap gap-1.5">
                            {manga.genres?.slice(0, 3).map((g, i) => (
                              <span key={i} className="bg-[#4caf50]/20 text-[7px] text-[#4caf50] px-2 py-0.5 rounded-md font-black uppercase border border-[#4caf50]/30">{g}</span>
                            ))}
                         </div>
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-center bg-gradient-to-b from-transparent to-black/20">
                      <h3 className="font-bold text-xs md:text-sm line-clamp-2 group-hover:text-[#4caf50] transition-colors leading-tight h-8 md:h-10 text-center md:text-left">{manga.title}</h3>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>

            {/* Pagination UI 🍀 */}
            {totalPages > 1 && (
              <div className="mt-24 flex flex-wrap justify-center items-center gap-3 pb-10">
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  className={`px-8 py-4 rounded-[20px] font-black text-[10px] uppercase tracking-[0.2em] transition-all border-2 ${
                    currentPage === 1 
                    ? 'opacity-20 cursor-not-allowed border-white/5' 
                    : 'bg-[#141814] border-white/5 text-gray-400 hover:border-[#4caf50] hover:text-[#4caf50] hover:bg-[#4caf50]/5'
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
                        className={`w-14 h-14 flex items-center justify-center rounded-[20px] font-black text-sm transition-all border-2 ${
                          currentPage === p
                          ? 'bg-[#4caf50] border-[#4caf50] text-[#141814] scale-110 shadow-2xl shadow-[#4caf50]/30'
                          : 'bg-[#141814] border-white/5 text-gray-500 hover:border-[#4caf50] hover:text-[#4caf50]'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  }
                  if (p === currentPage - 3 || p === currentPage + 3) return <span key={p} className="text-gray-700 px-2">...</span>;
                  return null;
                })}

                <button
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  className={`px-8 py-4 rounded-[20px] font-black text-[10px] uppercase tracking-[0.2em] transition-all border-2 ${
                    currentPage === totalPages 
                    ? 'opacity-20 cursor-not-allowed border-white/5' 
                    : 'bg-[#141814] border-white/5 text-gray-400 hover:border-[#4caf50] hover:text-[#4caf50] hover:bg-[#4caf50]/5'
                  }`}
                >
                  SAU
                </button>
              </div>
            )}

            <div className="text-center mt-12 pb-10">
               <span className="text-[10px] font-black text-gray-700 bg-black/40 px-8 py-2.5 rounded-full border border-white/5 uppercase tracking-[0.4em]">Trang {currentPage} / {totalPages} • Lọc được {totalCount} siêu phẩm</span>
            </div>
          </>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0a0c0a; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2a332a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4caf50; }
      `}} />
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
