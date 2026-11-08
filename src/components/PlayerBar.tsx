import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  Shuffle,
  Volume2,
  VolumeX,
  ListMusic,
  Heart,
  Maximize2
} from 'lucide-react';
import { YoutubeIcon } from './icons/YoutubeIcon';
import { usePlayerStore } from '../store/usePlayerStore';
import { formatTime } from '../utils/formatTime';

export const PlayerBar: React.FC = () => {
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
    isQueueOpen,
    togglePlay,
    nextTrack,
    prevTrack,
    seekTo,
    setVolume,
    toggleMute,
    togglePlaybackMode,
    toggleFavorite,
    setIsQueueOpen,
    setIsFullscreenPlayerOpen
  } = usePlayerStore();

  const currentTrack = queue[currentIndex] || null;
  const isFav = currentTrack ? favorites.some((f) => f.id === currentTrack.id) : false;

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    seekTo(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
  };

  const getPlaybackModeIcon = () => {
    switch (playbackMode) {
      case 'repeat-one':
        return <Repeat1 className="w-4 h-4 text-[#fa2d48]" />;
      case 'shuffle':
        return <Shuffle className="w-4 h-4 text-[#fa2d48]" />;
      case 'repeat-all':
        return <Repeat className="w-4 h-4 text-[#fa2d48]" />;
      case 'order':
      default:
        return <Repeat className="w-4 h-4 text-neutral-500 hover:text-neutral-300" />;
    }
  };

  const getPlaybackModeTitle = () => {
    switch (playbackMode) {
      case 'repeat-one': return '模式：單曲循環';
      case 'shuffle': return '模式：隨機播放';
      case 'repeat-all': return '模式：列表循環';
      case 'order': return '模式：循序播放';
    }
  };

  if (!currentTrack) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 apple-bar shadow-2xl transition-all">
      {/* 行動端頂部 2px 播放進度條 */}
      <div className="sm:hidden w-full h-[2px] bg-white/[0.06]">
        <div
          className="h-full bg-[#fa2d48] transition-all duration-200"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3 sm:gap-8">
        {/* 左側：曲目資訊與封面 */}
        <div className="flex items-center gap-3 min-w-0 max-w-[210px] sm:max-w-[300px]">
          <div
            onClick={() => setIsFullscreenPlayerOpen(true)}
            className="relative w-12 h-12 rounded-xl overflow-hidden bg-neutral-900 shrink-0 cursor-pointer group shadow-md"
          >
            <img
              src={currentTrack.artwork}
              alt={currentTrack.title}
              className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                isPlaying ? 'scale-105' : ''
              }`}
            />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Maximize2 className="w-4 h-4 text-white" />
            </div>
          </div>

          <div
            onClick={() => setIsFullscreenPlayerOpen(true)}
            className="flex-1 min-w-0 cursor-pointer"
          >
            <h4 className="text-[13px] font-semibold text-white truncate hover:text-[#fa2d48] transition-colors leading-tight">
              {currentTrack.title}
            </h4>
            <p className="text-[11px] text-neutral-400 truncate mt-0.5 flex items-center gap-1">
              {currentTrack.source === 'youtube' && (
                <YoutubeIcon className="w-3 h-3 text-[#fa2d48] shrink-0 inline" />
              )}
              <span className="truncate">{currentTrack.artist}</span>
            </p>
          </div>

          <button
            onClick={() => toggleFavorite(currentTrack)}
            className="p-1.5 rounded-full text-neutral-400 hover:text-[#fa2d48] transition-colors shrink-0 hidden sm:block cursor-pointer"
            title={isFav ? '取消喜愛' : '加入喜愛'}
          >
            <Heart className={`w-4 h-4 ${isFav ? 'fill-[#fa2d48] text-[#fa2d48]' : ''}`} />
          </button>
        </div>

        {/* 中間：播放器控制與進度條 */}
        <div className="flex-1 max-w-xl flex flex-col items-center gap-1.5">
          {/* 按鈕組 */}
          <div className="flex items-center gap-3 sm:gap-6">
            {/* 播放模式切換 */}
            <button
              onClick={togglePlaybackMode}
              className="p-1.5 rounded-full hover:bg-white/10 transition-all hidden sm:block cursor-pointer"
              title={getPlaybackModeTitle()}
            >
              {getPlaybackModeIcon()}
            </button>

            {/* 上一首 */}
            <button
              onClick={prevTrack}
              className="p-1.5 rounded-full text-neutral-300 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
              title="上一首"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            {/* 播放 / 暫停主按鈕 (Apple 白色圓形極簡鍵) */}
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-white hover:bg-neutral-100 active:scale-95 text-black flex items-center justify-center shadow-lg transition-all cursor-pointer"
              title={isPlaying ? '暫停' : '播放'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-black" />
              ) : (
                <Play className="w-5 h-5 fill-black ml-0.5" />
              )}
            </button>

            {/* 下一首 */}
            <button
              onClick={nextTrack}
              className="p-1.5 rounded-full text-neutral-300 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
              title="下一首"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>

            {/* 全螢幕展開 (行動端) */}
            <button
              onClick={() => setIsFullscreenPlayerOpen(true)}
              className="p-1.5 rounded-full text-neutral-400 hover:text-white sm:hidden cursor-pointer"
              title="展開播放視窗"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>

          {/* 桌面端時間與進度滑桿 */}
          <div className="w-full hidden sm:flex items-center gap-3 text-[11px] text-neutral-400 font-mono">
            <span className="w-9 text-right shrink-0">{formatTime(currentTime)}</span>
            <div className="flex-1 relative flex items-center">
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.5"
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 bg-white/15 rounded-full appearance-none cursor-pointer focus:outline-none"
              />
            </div>
            <span className="w-9 text-left shrink-0">{formatTime(duration)}</span>
          </div>
        </div>

        {/* 右側：音量與待播清單 (桌面端) */}
        <div className="hidden sm:flex items-center justify-end gap-3 min-w-[210px]">
          {/* 音量控制 */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="p-1 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title={isMuted ? '解除靜音' : '靜音'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-neutral-500" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-20 h-1 bg-white/15 rounded-full appearance-none cursor-pointer focus:outline-none"
            />
          </div>

          {/* 播放佇列按鈕 */}
          <button
            onClick={() => setIsQueueOpen(!isQueueOpen)}
            className={`p-2 rounded-full border transition-all cursor-pointer ${
              isQueueOpen
                ? 'bg-white/20 border-white/30 text-white'
                : 'apple-pill text-neutral-400 hover:text-white'
            }`}
            title="查看待播佇列"
          >
            <ListMusic className="w-4 h-4" />
          </button>

          {/* 全螢幕模式 */}
          <button
            onClick={() => setIsFullscreenPlayerOpen(true)}
            className="p-2 rounded-full apple-pill text-neutral-400 hover:text-white transition-all cursor-pointer"
            title="全螢幕模式"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
