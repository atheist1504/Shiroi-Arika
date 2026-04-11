'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function MangaListPage() {
  const [mangas, setMangas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const GENRES = [
    "All", "Manga", "Manhua", "Manhwa", "Truyện màu", "One Shot",
    "Action", "Adventure", "Comedy", "Drama", "Fantasy", 
    "Horror", "Mystery", "Psychological", "Romance", 
    "Sci-Fi", "Slice of Life", "Supernatural", "Tragedy", "Historical",
    "Isekai", "School Life"
  ];

  useEffect(() => {
    fetchMangas();
  }, [selectedGenre]);

  const fetchMangas = async () => {
    try {
      setLoading(true);
      let query = supabase.from('mangas').select(`
        *,
        chapters(chapter_number)
      `);

      if (selectedGenre !== 'All') {
        query = query.contains('genres', [selectedGenre]);
      }

      const { data, error } = await query.order('title');

      if (error) throw error;
      
      const processed = data?.map(m => ({
        ...m,
        latestChapter: m.chapters?.sort((a, b) => b.chapter_number - a.chapter_number)[0] || null
      })) || [];

      setMangas(processed);
    } catch (err) {
      console.error('Lỗi tải danh sách truyện:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = mangas.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0c0a] text-white p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
          <div className="flex items-center gap-3">
             <div className="w-2 h-8 bg-blue-500 rounded-full"></div>
             <h1 className="text-3xl font-black uppercase tracking-tight">Kho Truyện 🍀</h1>
          </div>
          
          <div className="relative group w-full md:w-96">
             <input 
               type="text" 
               placeholder="Tìm tên truyện..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full bg-[#141814] border border-[#2a332a] rounded-xl px-5 py-3 outline-none focus:border-[#4caf50] transition-all group-hover:bg-[#1a211a]"
             />
             <svg className="absolute right-4 top-3.5 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
        </div>

        {/* Danh sách Thể loại */}
        <div className="flex flex-wrap gap-2 mb-10 overflow-x-auto pb-4 custom-scrollbar">
          {GENRES.map(genre => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all border ${
                selectedGenre === genre 
                  ? 'bg-[#4caf50] border-[#4caf50] text-[#141814]' 
                  : 'bg-[#141814] border-[#2a332a] text-gray-400 hover:border-[#4caf50] hover:text-[#4caf50]'
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
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-[#141814] rounded-3xl border border-[#2a332a]">
             <p className="text-gray-500">Không tìm thấy truyện nào phù hợp.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {filtered.map((manga) => (
              <Link 
                key={manga.id} 
                href={`/manga/${manga.id}`}
                className="group flex flex-col bg-[#141814] border border-[#2a332a] hover:border-[#4caf50] rounded-xl overflow-hidden shadow-lg transition-all hover:-translate-y-1"
              >
                <div className="aspect-[2/3] relative overflow-hidden">
                  <img 
                    src={manga.cover_image || 'https://via.placeholder.com/300x450?text=No+Cover'} 
                    alt={manga.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                  
                  {manga.latestChapter && (
                    <div className="absolute bottom-2 left-2">
                       <span className="bg-[#4caf50] text-[#141814] text-[10px] font-black px-2 py-0.5 rounded shadow-lg">
                         CHAP {manga.latestChapter.chapter_number}
                       </span>
                    </div>
                  )}

                  {/* Hiện thể loại khi hover */}
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                     {manga.genres?.slice(0, 2).map((g, i) => (
                       <span key={i} className="bg-black/60 text-[8px] text-white px-1.5 py-0.5 rounded border border-white/10 uppercase font-bold">{g}</span>
                     ))}
                  </div>
                </div>

                <div className="p-3">
                  <h3 className="font-bold text-sm line-clamp-2 group-hover:text-[#4caf50] transition-colors">{manga.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
