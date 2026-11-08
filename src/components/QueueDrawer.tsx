import React from 'react';
import { X, Trash2, Music2, Play, Volume2 } from 'lucide-react';
import { YoutubeIcon } from './icons/YoutubeIcon';
import { usePlayerStore } from '../store/usePlayerStore';
import { formatTime } from '../utils/formatTime';

export const QueueDrawer: React.FC = () => {
  const {
    queue,
    currentIndex,
    isPlaying,
    isQueueOpen,
    setIsQueueOpen,
    playTrackAtIndex,
    removeFromQueue,
    clearQueue,
  } = usePlayerStore();

  if (!isQueueOpen) return null;

  return (
    <aside className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 apple-sheet shadow-2xl flex flex-col transition-all duration-300">
      {/* 頂部標題與控制 (Apple 待播清單樣式) */}
      <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Music2 className="w-4 h-4 text-[#fa2d48]" />
          <h3 className="font-semibold text-white text-base tracking-tight">待播清單</h3>
          <span className="px-2 py-0.5 rounded-full text-xs bg-white/10 text-neutral-300 font-mono">
            {queue.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {queue.length > 0 && (
            <button
              onClick={clearQueue}
              className="p-2 rounded-full text-neutral-400 hover:text-rose-400 hover:bg-white/10 transition-colors text-xs cursor-pointer"
              title="清空待播清單"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsQueueOpen(false)}
            className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="關閉"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 待播清單主體 */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04] p-2 sm:p-3">
        {queue.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-neutral-500">
            <Music2 className="w-10 h-10 text-neutral-600 mb-3" />
            <p className="text-sm font-medium text-neutral-300">待播清單目前是空的</p>
            <p className="text-xs text-neutral-500 mt-1">點擊上方藝人標籤或搜尋歌曲即可自動排播</p>
          </div>
        ) : (
          queue.map((track, index) => {
            const isCurrent = index === currentIndex;

            return (
              <div
                key={`${track.id}-${index}`}
                onClick={() => playTrackAtIndex(index)}
                className={`group flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                  isCurrent
                    ? 'bg-white/10 text-white'
                    : 'hover:bg-white/[0.05] text-neutral-300'
                }`}
              >
                {/* 狀態指示 / 序號 */}
                <div className="w-6 text-center shrink-0">
                  {isCurrent ? (
                    isPlaying ? (
                      <Volume2 className="w-4 h-4 text-[#fa2d48] animate-pulse mx-auto" />
                    ) : (
                      <Play className="w-3.5 h-3.5 text-[#fa2d48] fill-[#fa2d48] mx-auto" />
                    )
                  ) : (
                    <span className="text-xs font-mono text-neutral-500 group-hover:text-neutral-400">
                      {index + 1}
                    </span>
                  )}
                </div>

                {/* 封面 */}
                <img
                  src={track.artwork}
                  alt={track.title}
                  className="w-10 h-10 rounded-lg object-cover bg-neutral-900 shrink-0"
                />

                {/* 歌名與歌手 */}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium truncate ${isCurrent ? 'text-[#fa2d48] font-semibold' : 'text-neutral-100'}`}>
                    {track.title}
                  </p>
                  <p className="text-[11px] text-neutral-400 truncate mt-0.5 flex items-center gap-1">
                    {track.source === 'youtube' && <YoutubeIcon className="w-2.5 h-2.5 text-[#fa2d48] shrink-0" />}
                    <span>{track.artist}</span>
                  </p>
                </div>

                {/* 時長與刪除按鈕 */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono text-neutral-500">
                    {formatTime(track.duration)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromQueue(index);
                    }}
                    className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="從清單移除"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 底部目前播放提示 */}
      {queue[currentIndex] && (
        <div className="p-3.5 bg-black/60 border-t border-white/[0.08] text-xs text-neutral-400 flex items-center justify-between">
          <span className="truncate pr-2">
            正在播放: <strong className="text-white font-medium">{queue[currentIndex].title}</strong>
          </span>
          <span className="font-mono text-[#fa2d48] shrink-0">
            {currentIndex + 1} / {queue.length}
          </span>
        </div>
      )}
    </aside>
  );
};
