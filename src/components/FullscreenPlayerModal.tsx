import React from 'react';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  Shuffle,
  Volume2,
  VolumeX,
  Heart,
  ListMusic,
  ExternalLink
} from 'lucide-react';
import { YoutubeIcon } from './icons/YoutubeIcon';
import { usePlayerStore } from '../store/usePlayerStore';
import { formatTime } from '../utils/formatTime';

export const FullscreenPlayerModal: React.FC = () => {
  const {
    queue,
    currentIndex,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackMode,
    favorites,
    isFullscreenPlayerOpen,
    setIsFullscreenPlayerOpen,
    togglePlay,
    nextTrack,
    prevTrack,
    seekTo,
    setVolume,
    toggleMute,
    togglePlaybackMode,
    toggleFavorite,
    setIsQueueOpen
  } = usePlayerStore();

  const currentTrack = queue[currentIndex] || null;
  const isFav = currentTrack ? favorites.some((f) => f.id === currentTrack.id) : false;

  if (!isFullscreenPlayerOpen || !currentTrack) return null;

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    seekTo(parseFloat(e.target.value));
  };

  const getPlaybackModeIcon = () => {
    switch (playbackMode) {
      case 'repeat-one': return <Repeat1 className="w-5 h-5 text-[#fa2d48]" />;
      case 'shuffle': return <Shuffle className="w-5 h-5 text-[#fa2d48]" />;
      case 'repeat-all': return <Repeat className="w-5 h-5 text-[#fa2d48]" />;
      default: return <Repeat className="w-5 h-5 text-neutral-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
      {/* Apple Music 動態毛玻璃背景擴散流 */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30 blur-3xl scale-125 pointer-events-none transition-all duration-700"
        style={{ backgroundImage: `url(${currentTrack.artwork})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/85 to-black pointer-events-none" />

      {/* 頂部導航列 */}
      <div className="relative z-10 p-5 sm:p-6 flex items-center justify-between">
        <button
          onClick={() => setIsFullscreenPlayerOpen(false)}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white transition-all active:scale-95 cursor-pointer"
          title="最小化"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        <div className="text-center">
          <p className="text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
            正在播放
          </p>
          <p className="text-xs text-neutral-300 font-mono mt-0.5">
            {currentIndex + 1} / {queue.length}
          </p>
        </div>

        <button
          onClick={() => {
            setIsFullscreenPlayerOpen(false);
            setIsQueueOpen(true);
          }}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white transition-all active:scale-95 cursor-pointer"
          title="待播清單"
        >
          <ListMusic className="w-5 h-5" />
        </button>
      </div>

      {/* 中間大封面與曲目資料 */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 max-w-md mx-auto w-full">
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-3xl overflow-hidden shadow-2xl shadow-black/90 border border-white/10 mb-8 bg-neutral-900 group">
          <img
            src={currentTrack.artwork}
            alt={currentTrack.title}
            className={`w-full h-full object-cover transition-transform duration-700 ${
              isPlaying ? 'scale-105' : 'scale-100'
            }`}
          />
        </div>

        <div className="w-full flex items-center justify-between gap-4 mb-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-white truncate tracking-tight">
              {currentTrack.title}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              {currentTrack.source === 'youtube' && (
                <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-medium flex items-center gap-1 shrink-0 border border-white/10">
                  <YoutubeIcon className="w-3 h-3 text-[#fa2d48]" /> YouTube
                </span>
              )}
              <p className="text-sm sm:text-base text-neutral-300 truncate">
                {currentTrack.artist}
              </p>
              {currentTrack.youtubeId && (
                <a
                  href={`https://www.youtube.com/watch?v=${currentTrack.youtubeId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 text-neutral-400 hover:text-white transition-colors"
                  title="在 YouTube 另開分頁"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            {currentTrack.album && currentTrack.album !== currentTrack.title && (
              <p className="text-xs text-neutral-500 truncate mt-0.5">
                {currentTrack.album}
              </p>
            )}
          </div>

          <button
            onClick={() => toggleFavorite(currentTrack)}
            className="p-3 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 transition-all shrink-0 cursor-pointer"
            title={isFav ? '取消喜愛' : '加入喜愛'}
          >
            <Heart className={`w-6 h-6 ${isFav ? 'fill-[#fa2d48] text-[#fa2d48]' : 'text-neutral-300'}`} />
          </button>
        </div>
      </div>

      {/* 底部播放進度與控制器 */}
      <div className="relative z-10 w-full max-w-md mx-auto px-6 pb-12 sm:pb-14 flex flex-col gap-6">
        {/* 進度條 */}
        <div className="w-full flex flex-col gap-1.5">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.5"
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer focus:outline-none"
          />
          <div className="flex justify-between text-xs font-mono text-neutral-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* 核心控制按鈕 */}
        <div className="flex items-center justify-between">
          <button
            onClick={togglePlaybackMode}
            className="p-2.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            {getPlaybackModeIcon()}
          </button>

          <button
            onClick={prevTrack}
            className="p-3 rounded-full text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
          >
            <SkipBack className="w-7 h-7 fill-current" />
          </button>

          <button
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-white hover:bg-neutral-100 active:scale-95 text-black flex items-center justify-center shadow-2xl transition-all cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 fill-black" />
            ) : (
              <Play className="w-8 h-8 fill-black ml-1" />
            )}
          </button>

          <button
            onClick={nextTrack}
            className="p-3 rounded-full text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
          >
            <SkipForward className="w-7 h-7 fill-current" />
          </button>

          <button
            onClick={toggleMute}
            className="p-2.5 rounded-full hover:bg-white/10 transition-colors text-neutral-400 hover:text-white cursor-pointer"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-5 h-5 text-neutral-500" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* 音量滑桿 */}
        <div className="w-full flex items-center gap-3 pt-1">
          <Volume2 className="w-4 h-4 text-neutral-400 shrink-0" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.02"
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
};
