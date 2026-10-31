'use client';

import React, { useState, useEffect, useRef } from 'react';

/**
 * 🎧 FLOATING AUDIO PLAYER (TRÌNH PHÁT AUDIO TIỂU THUYẾT NỔI) 🍀
 * Tích hợp cho Audio-Novel: Diễn đọc người thật, tua nhanh, chỉnh tốc độ, lưu vị trí nghe dở.
 */
export default function FloatingAudioPlayer({
  audioUrl,
  chapterTitle,
  chapterNumber,
  mangaTitle,
  chapterId,
  theme = 'dark',
  onAudioComplete,
}) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);

  const localPosKey = `shiroi_audio_pos_${chapterId}`;

  // 1. Khôi phục vị trí nghe dở từ localStorage
  useEffect(() => {
    if (!audioUrl) return;
    const savedTime = localStorage.getItem(localPosKey);
    if (savedTime && audioRef.current) {
      const parsed = parseFloat(savedTime);
      if (!isNaN(parsed) && parsed > 0) {
        audioRef.current.currentTime = parsed;
        setCurrentTime(parsed);
      }
    }
  }, [audioUrl, localPosKey]);

  // 2. Lưu vị trí đang nghe định kỳ vào localStorage
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      if (audioRef.current) {
        localStorage.setItem(localPosKey, audioRef.current.currentTime.toString());
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isPlaying, localPosKey]);

  // 3. Phím tắt Space để Play/Pause
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea') return;
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.warn("Lỗi phát audio:", err);
      });
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const cur = audioRef.current.currentTime;
    const dur = audioRef.current.duration || duration || 0;
    setCurrentTime(cur);

    // Kích hoạt hoàn thành chương khi nghe >= 70%
    if (dur > 0 && !hasCompleted && (cur / dur) >= 0.7) {
      setHasCompleted(true);
      if (typeof onAudioComplete === 'function') {
        onAudioComplete();
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    const dur = audioRef.current.duration;
    if (dur && isFinite(dur)) {
      setDuration(dur);
    }
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const skipTime = (seconds) => {
    if (!audioRef.current) return;
    const nextTime = Math.max(0, Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + seconds));
    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const cycleSpeed = () => {
    const speeds = [0.8, 1.0, 1.25, 1.5, 2.0];
    const currentIndex = speeds.indexOf(playbackRate);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setPlaybackRate(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    audioRef.current.muted = nextMute;
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs) || !isFinite(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!audioUrl) return null;

  return (
    <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[15000] w-[95%] max-w-2xl transition-all duration-300">
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => {
          setIsPlaying(false);
          if (typeof onAudioComplete === 'function') onAudioComplete();
        }}
        onError={(e) => console.error("Lỗi tải audio player:", e)}
      />

      {isMinimized ? (
        /* GIAO DIỆN THU GỌN (MINI PILL) */
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-black/90 backdrop-blur-xl border border-[#4caf50]/40 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.8)] text-white animate-fade-in mx-auto w-fit">
          <button
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-[#4caf50] text-[#0a0c0a] flex items-center justify-center font-black transition-transform active:scale-95"
            title={isPlaying ? "Tạm dừng" : "Phát tiếp"}
          >
            {isPlaying ? (
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            ) : (
              <svg className="w-3.5 h-3.5 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsMinimized(false)}>
            <span className="text-[10px] font-black uppercase text-[#4caf50] tracking-wider flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full bg-[#4caf50] ${isPlaying ? 'animate-ping' : ''}`}></span>
              Audio Novel
            </span>
            <span className="text-[9px] text-gray-400 font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1 hover:text-[#4caf50] text-gray-400 transition-colors"
            title="Mở rộng trình phát"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7"/></svg>
          </button>
        </div>
      ) : (
        /* GIAO DIỆN ĐẦY ĐỦ (FULL FLOATING PLAYER) */
        <div className="bg-black/85 backdrop-blur-2xl border border-white/10 hover:border-[#4caf50]/30 rounded-3xl p-4 sm:p-5 shadow-[0_20px_60px_rgba(0,0,0,0.85)] text-white transition-all space-y-3">
          {/* Header thanh phát */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-[#4caf50]/20 border border-[#4caf50]/40 flex items-center justify-center text-base flex-shrink-0">
                {isPlaying ? (
                  <span className="animate-pulse">🎧</span>
                ) : (
                  <span>🎵</span>
                )}
              </div>
              <div className="truncate min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase bg-[#4caf50] text-black px-1.5 py-0.2 rounded tracking-widest flex-shrink-0">
                    AUDIO NOVEL
                  </span>
                  <span className="text-[10px] font-bold text-gray-400 truncate">
                    {mangaTitle}
                  </span>
                </div>
                <h4 className="text-xs font-black text-white truncate tracking-wide mt-0.5">
                  Chương {chapterNumber}{chapterTitle ? ` - ${chapterTitle}` : ''}
                </h4>
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Nút chỉnh tốc độ */}
              <button
                onClick={cycleSpeed}
                className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-mono font-bold text-[#4caf50] transition-colors"
                title="Thay đổi tốc độ đọc"
              >
                {playbackRate}x
              </button>

              {/* Nút Mute */}
              <button
                onClick={toggleMute}
                className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                title={isMuted ? "Bật âm thanh" : "Tắt tiếng"}
              >
                {isMuted ? (
                  <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                )}
              </button>

              {/* Nút Thu gọn */}
              <button
                onClick={() => setIsMinimized(true)}
                className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                title="Thu nhỏ thanh phát"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
              </button>
            </div>
          </div>

          {/* Thanh trượt Timeline (Seek bar) */}
          <div className="space-y-1">
            <div className="relative group flex items-center">
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.5}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#4caf50] focus:outline-none transition-all"
                style={{
                  background: `linear-gradient(to right, #4caf50 ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.1) ${(currentTime / (duration || 1)) * 100}%)`,
                }}
              />
            </div>
            <div className="flex justify-between text-[9px] font-mono text-gray-400 px-0.5">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Bộ điều khiển playback */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 pt-0.5">
            {/* Lùi 10s */}
            <button
              onClick={() => skipTime(-10)}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all active:scale-95 flex items-center gap-0.5 text-[10px] font-mono"
              title="Lùi 10 giây"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z"/></svg>
              -10s
            </button>

            {/* Nút Play / Pause to */}
            <button
              onClick={togglePlay}
              className="w-12 h-12 rounded-2xl bg-[#4caf50] text-[#0a0c0a] hover:bg-[#66bb6a] shadow-[0_0_20px_rgba(76,175,80,0.4)] flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              title={isPlaying ? "Tạm dừng (Phím Space)" : "Phát audio (Phím Space)"}
            >
              {isPlaying ? (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              ) : (
                <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              )}
            </button>

            {/* Tua tới 15s */}
            <button
              onClick={() => skipTime(15)}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all active:scale-95 flex items-center gap-0.5 text-[10px] font-mono"
              title="Tua tới 15 giây"
            >
              +15s
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z"/></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
