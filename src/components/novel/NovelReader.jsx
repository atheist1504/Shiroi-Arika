'use client';

import React, { useState, useEffect, useMemo } from 'react';

/**
 * 📖 NOVEL READER COMPONENT (TRÌNH ĐỌC TIỂU THUYẾT / TRUYỆN CHỮ) 🍀
 * Trải nghiệm đọc cao cấp: Tùy biến cỡ chữ, font chữ, giãn dòng, theme màu chống mỏi mắt.
 * v2 — Sửa lỗi font tiếng Việt bị tách dấu, thêm inline markdown (bold, italic, image).
 */

// ========== FONT STACK HỖ TRỢ TIẾNG VIỆT ==========
const FONT_STACKS = {
  serif: '"Noto Serif", "Palatino Linotype", "Book Antiqua", "Segoe UI", serif',
  sans: '"Segoe UI", "Noto Sans", "Helvetica Neue", Arial, sans-serif',
  mono: '"Cascadia Code", "Fira Code", "Consolas", "Noto Sans Mono", monospace',
};

// ========== INLINE MARKDOWN PARSER ==========
// Parse **bold**, *italic*, ![alt](url) bên trong một đoạn text
function parseInlineMarkdown(text) {
  if (!text) return [text];

  const result = [];
  // Regex: **bold** | *italic* | ![alt](url)
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(!?\[([^\]]*)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Push text trước match
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      // **bold**
      result.push(
        <strong key={`b-${match.index}`} className="font-bold text-white">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      // *italic*
      result.push(
        <em key={`i-${match.index}`} className="italic opacity-90">
          {match[4]}
        </em>
      );
    } else if (match[0].startsWith('![')) {
      // ![alt](url) — inline image
      result.push(
        <span key={`img-${match.index}`} className="block my-4 flex flex-col items-center">
          <img
            src={match[7]}
            alt={match[6] || 'Ảnh minh họa'}
            className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain border border-white/10"
            loading="lazy"
          />
          {match[6] && match[6] !== 'Ảnh minh họa' && (
            <span className="text-[11px] text-gray-500 italic mt-2 text-center">
              {match[6]}
            </span>
          )}
        </span>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Push phần text còn lại
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result.length > 0 ? result : [text];
}

export default function NovelReader({
  content = '',
  chapterTitle = '',
  chapterNumber,
  mangaTitle,
  theme = 'dark',
  endOfChapterRef,
}) {
  // 1. Tùy chọn đọc lưu trong localStorage
  const [fontSize, setFontSize] = useState(18); // px
  const [fontFamily, setFontFamily] = useState('serif'); // 'serif' | 'sans' | 'mono'
  const [lineHeight, setLineHeight] = useState(1.9); // 1.7 | 1.9 | 2.1
  const [textAlign, setTextAlign] = useState('left'); // 'left' | 'justify'
  const [showNovelControls, setShowNovelControls] = useState(false);

  useEffect(() => {
    const savedSize = localStorage.getItem('shiroi_novel_fontsize');
    const savedFont = localStorage.getItem('shiroi_novel_fontfamily');
    const savedLine = localStorage.getItem('shiroi_novel_lineheight');
    const savedAlign = localStorage.getItem('shiroi_novel_align');

    if (savedSize) setFontSize(parseInt(savedSize, 10));
    if (savedFont) setFontFamily(savedFont);
    if (savedLine) setLineHeight(parseFloat(savedLine));
    if (savedAlign) setTextAlign(savedAlign);
  }, []);

  const changeFontSize = (delta) => {
    setFontSize((prev) => {
      const next = Math.min(26, Math.max(14, prev + delta));
      localStorage.setItem('shiroi_novel_fontsize', next.toString());
      return next;
    });
  };

  const changeFontFamily = (family) => {
    setFontFamily(family);
    localStorage.setItem('shiroi_novel_fontfamily', family);
  };

  const changeLineHeight = (lh) => {
    setLineHeight(lh);
    localStorage.setItem('shiroi_novel_lineheight', lh.toString());
  };

  const changeTextAlign = (align) => {
    setTextAlign(align);
    localStorage.setItem('shiroi_novel_align', align);
  };

  // 2. Parser nội dung thành các phần tử UI (hỗ trợ inline markdown)
  const parsedElements = useMemo(() => {
    if (!content) return [];
    const lines = content.split(/\r?\n/);
    const elements = [];
    let currentParagraph = [];

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        elements.push({
          type: 'paragraph',
          text: currentParagraph.join('\n'),
        });
        currentParagraph = [];
      }
    };

    lines.forEach((line) => {
      const trimmed = line.trim();

      if (!trimmed) {
        flushParagraph();
        return;
      }

      // 1. Đường phân cách: ---
      if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
        flushParagraph();
        elements.push({ type: 'divider' });
        return;
      }

      // 2. Tiêu đề: ### hoặc ## hoặc #
      if (trimmed.startsWith('#')) {
        flushParagraph();
        const headerLevel = trimmed.match(/^#+/)?.[0]?.length || 1;
        const headerText = trimmed.replace(/^#+\s*/, '');
        elements.push({ type: 'header', level: headerLevel, text: headerText });
        return;
      }

      // 3. Trích dẫn: >
      if (trimmed.startsWith('>')) {
        flushParagraph();
        elements.push({
          type: 'quote',
          text: trimmed.replace(/^>\s*/, ''),
        });
        return;
      }

      // 4. Ảnh minh họa trên dòng riêng: ![alt](url)
      const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imgMatch) {
        flushParagraph();
        elements.push({
          type: 'image',
          alt: imgMatch[1] || 'Ảnh minh họa',
          url: imgMatch[2],
        });
        return;
      }

      currentParagraph.push(trimmed);
    });

    flushParagraph();
    return elements;
  }, [content]);

  // Thống kê số từ
  const wordCount = useMemo(() => {
    return content.trim() ? content.trim().split(/\s+/).length : 0;
  }, [content]);

  const readTime = Math.max(1, Math.ceil(wordCount / 220));

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-8 py-6">
      {/* THANH ĐIỀU KHIỂN CỠ CHỮ & FONT TRUYỆN CHỮ */}
      <div className="flex items-center justify-between mb-8 p-3 sm:p-4 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-sm">📖</span>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#4caf50]">
              Chế Độ Truyện Chữ
            </span>
            <span className="text-[9px] text-gray-500 font-bold">
              {wordCount.toLocaleString()} từ • ~{readTime} phút đọc
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tăng / Giảm Cỡ chữ */}
          <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/5">
            <button
              onClick={() => changeFontSize(-1)}
              className="w-7 h-7 flex items-center justify-center text-xs font-black text-gray-400 hover:text-white rounded-lg transition-colors active:scale-95"
              title="Thu nhỏ chữ"
            >
              A-
            </button>
            <span className="px-2 text-[10px] font-mono font-bold text-[#4caf50]">
              {fontSize}px
            </span>
            <button
              onClick={() => changeFontSize(1)}
              className="w-7 h-7 flex items-center justify-center text-xs font-black text-gray-400 hover:text-white rounded-lg transition-colors active:scale-95"
              title="Phóng to chữ"
            >
              A+
            </button>
          </div>

          {/* Nút bật Panel Cài Đặt Nâng Cao */}
          <button
            onClick={() => setShowNovelControls(!showNovelControls)}
            className={`p-2 rounded-xl border transition-all ${
              showNovelControls
                ? 'bg-[#4caf50]/20 border-[#4caf50] text-[#4caf50]'
                : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'
            }`}
            title="Cài đặt font chữ & khoảng cách"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
          </button>
        </div>
      </div>

      {/* PANEL CÀI ĐẶT NÂNG CAO */}
      {showNovelControls && (
        <div className="mb-8 p-5 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl animate-fade-in grid grid-cols-1 sm:grid-cols-3 gap-4 text-[10px] font-bold">
          {/* Kiểu font */}
          <div className="space-y-1.5">
            <label className="text-gray-400 uppercase tracking-wider block">Kiểu font chữ</label>
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
              <button
                onClick={() => changeFontFamily('serif')}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${fontFamily === 'serif' ? 'bg-[#4caf50] text-black font-black' : 'text-gray-400 hover:text-white'}`}
                style={{ fontFamily: FONT_STACKS.serif }}
              >
                Serif (Sách)
              </button>
              <button
                onClick={() => changeFontFamily('sans')}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${fontFamily === 'sans' ? 'bg-[#4caf50] text-black font-black' : 'text-gray-400 hover:text-white'}`}
                style={{ fontFamily: FONT_STACKS.sans }}
              >
                Sans (Hiện đại)
              </button>
              <button
                onClick={() => changeFontFamily('mono')}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${fontFamily === 'mono' ? 'bg-[#4caf50] text-black font-black' : 'text-gray-400 hover:text-white'}`}
                style={{ fontFamily: FONT_STACKS.mono }}
              >
                Mono
              </button>
            </div>
          </div>

          {/* Giãn dòng */}
          <div className="space-y-1.5">
            <label className="text-gray-400 uppercase tracking-wider block">Giãn dòng (Line Height)</label>
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
              <button
                onClick={() => changeLineHeight(1.7)}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${lineHeight === 1.7 ? 'bg-[#4caf50] text-black font-black' : 'text-gray-400 hover:text-white'}`}
              >
                Gọn (1.7)
              </button>
              <button
                onClick={() => changeLineHeight(1.9)}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${lineHeight === 1.9 ? 'bg-[#4caf50] text-black font-black' : 'text-gray-400 hover:text-white'}`}
              >
                Chuẩn (1.9)
              </button>
              <button
                onClick={() => changeLineHeight(2.1)}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${lineHeight === 2.1 ? 'bg-[#4caf50] text-black font-black' : 'text-gray-400 hover:text-white'}`}
              >
                Thoáng (2.1)
              </button>
            </div>
          </div>

          {/* Căn lề */}
          <div className="space-y-1.5">
            <label className="text-gray-400 uppercase tracking-wider block">Canh lề văn bản</label>
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
              <button
                onClick={() => changeTextAlign('left')}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${textAlign === 'left' ? 'bg-[#4caf50] text-black font-black' : 'text-gray-400 hover:text-white'}`}
              >
                Trái
              </button>
              <button
                onClick={() => changeTextAlign('justify')}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${textAlign === 'justify' ? 'bg-[#4caf50] text-black font-black' : 'text-gray-400 hover:text-white'}`}
              >
                Đều hai bên
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER BÀI ĐỌC */}
      <div className="text-center space-y-3 pb-8 mb-8 border-b border-white/10">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#4caf50]">
          {mangaTitle}
        </span>
        <h1 className="text-2xl sm:text-3xl font-black leading-snug">
          Chương {chapterNumber}
          {chapterTitle ? `: ${chapterTitle}` : ''}
        </h1>
      </div>

      {/* KHU VỰC VĂN BẢN CHÍNH */}
      <div
        className="transition-all duration-300 space-y-6 leading-relaxed"
        style={{
          fontFamily: FONT_STACKS[fontFamily] || FONT_STACKS.serif,
          fontSize: `${fontSize}px`,
          lineHeight: lineHeight,
          textAlign: textAlign,
          wordBreak: 'keep-all',
          overflowWrap: 'break-word',
        }}
      >
        {parsedElements.map((el, idx) => {
          if (el.type === 'header') {
            return (
              <h3
                key={idx}
                className="font-black text-[#4caf50] pt-4 pb-2"
                style={{
                  fontSize: `${Math.round(fontSize * 1.25)}px`,
                  fontFamily: FONT_STACKS.sans,
                  letterSpacing: '0.01em',
                }}
              >
                {parseInlineMarkdown(el.text)}
              </h3>
            );
          }

          if (el.type === 'quote') {
            return (
              <blockquote
                key={idx}
                className="pl-5 py-2 my-4 border-l-4 border-[#4caf50] bg-white/[0.02] rounded-r-xl italic opacity-90"
              >
                {parseInlineMarkdown(el.text)}
              </blockquote>
            );
          }

          if (el.type === 'divider') {
            return (
              <div key={idx} className="flex items-center justify-center py-6 opacity-30">
                <span className="text-base tracking-[0.8em]">❖ ❖ ❖</span>
              </div>
            );
          }

          if (el.type === 'image') {
            return (
              <div key={idx} className="my-8 flex flex-col items-center">
                <img
                  src={el.url}
                  alt={el.alt}
                  className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain border border-white/10"
                  loading="lazy"
                />
                {el.alt && el.alt !== 'Ảnh minh họa' && (
                  <span className="text-[11px] text-gray-500 italic mt-2 text-center">
                    {el.alt}
                  </span>
                )}
              </div>
            );
          }

          // Đoạn văn thông thường — parse inline bold/italic/image
          return (
            <p key={idx} className="select-text" style={{ letterSpacing: '0.01em' }}>
              {parseInlineMarkdown(el.text)}
            </p>
          );
        })}
      </div>

      {/* MỐC CUỐI CHƯƠNG ĐỂ THEO DÕI XP & ĐÃ ĐỌC */}
      <div ref={endOfChapterRef} className="h-10 mt-12" />
    </div>
  );
}
