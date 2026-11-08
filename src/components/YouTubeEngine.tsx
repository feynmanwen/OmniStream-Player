import React, { useEffect, useRef, useState } from 'react';
import {
  registerAdapter,
  unregisterAdapter,
  reportFromEngine,
  PlaybackAdapter,
} from '../engine/playbackController';
import { usePlayerStore } from '../store/usePlayerStore';
import { ExternalLink, Minimize2, Maximize2 } from 'lucide-react';
import { YoutubeIcon } from './icons/YoutubeIcon';
import { startSilentAudioKeepAlive, stopSilentAudioKeepAlive } from '../utils/silentAudio';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

export const YouTubeEngine: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const isReadyRef = useRef<boolean>(false);
  const pendingTrackRef = useRef<any>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const [isPiPMinimized, setIsPiPMinimized] = useState(false);

  const { queue, currentIndex, isFullscreenPlayerOpen, setIsFullscreenPlayerOpen } = usePlayerStore();
  const currentTrack = queue[currentIndex] || null;
  const isYouTubeActive = currentTrack?.source === 'youtube';

  // 清除進度輪詢
  const stopProgressPoll = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  // 開始輪詢播放進度
  const startProgressPoll = () => {
    stopProgressPoll();
    progressTimerRef.current = setInterval(() => {
      const player = playerRef.current;
      if (player && isReadyRef.current && typeof player.getCurrentTime === 'function') {
        const time = player.getCurrentTime() || 0;
        const dur = player.getDuration() || 0;
        reportFromEngine('youtube', 'onTime', time, dur);
      }
    }, 400);
  };

  // 1. 動態載入 YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setIsApiLoaded(true);
      return;
    }

    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevReady) prevReady();
      setIsApiLoaded(true);
    };

    if (!document.getElementById('yt-iframe-api-script')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  }, []);

  // 2. 初始化 YouTube 播放器實例並註冊 Adapter
  useEffect(() => {
    if (!isApiLoaded || !containerRef.current || playerRef.current) return;

    const player = new window.YT.Player(containerRef.current, {
      width: '100%',
      height: '100%',
      playerVars: {
        playsinline: 1,
        autoplay: 0,
        controls: 1,
        rel: 0,
        modestbranding: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: () => {
          isReadyRef.current = true;
          // 若在準備好之前已有載入請求，立即執行
          if (pendingTrackRef.current) {
            const track = pendingTrackRef.current;
            pendingTrackRef.current = null;
            player.loadVideoById({ videoId: track.youtubeId, startSeconds: 0 });
          }
        },
        onStateChange: (event: any) => {
          const state = event.data;
          // 1: PLAYING, 2: PAUSED, 0: ENDED, 3: BUFFERING
          if (state === 1) {
            startSilentAudioKeepAlive();
            reportFromEngine('youtube', 'onPlayState', true);
            startProgressPoll();
          } else if (state === 2) {
            stopSilentAudioKeepAlive();
            reportFromEngine('youtube', 'onPlayState', false);
            stopProgressPoll();
          } else if (state === 0) {
            stopSilentAudioKeepAlive();
            stopProgressPoll();
            reportFromEngine('youtube', 'onPlayState', false);
            reportFromEngine('youtube', 'onEnded');
          }
        },
        onError: (event: any) => {
          stopSilentAudioKeepAlive();
          stopProgressPoll();
          reportFromEngine('youtube', 'onPlayState', false);
          const code = event.data;
          let msg = 'YouTube 播放失敗';
          if (code === 101 || code === 150) {
            msg = '此 YouTube 影片版權方禁止站外嵌入播放';
          } else if (code === 100) {
            msg = '找不到該 YouTube 影片或已遭刪除';
          } else if (code === 2) {
            msg = 'YouTube 影片參數錯誤';
          }
          reportFromEngine('youtube', 'onError', msg);
        },
      },
    });

    playerRef.current = player;

    const adapter: PlaybackAdapter = {
      load: (track) => {
        if (!track.youtubeId) return;
        if (isReadyRef.current && playerRef.current) {
          playerRef.current.loadVideoById({
            videoId: track.youtubeId,
            startSeconds: 0,
          });
        } else {
          pendingTrackRef.current = track;
        }
      },
      play: () => {
        if (isReadyRef.current && playerRef.current) {
          playerRef.current.playVideo();
        }
      },
      pause: () => {
        stopSilentAudioKeepAlive();
        if (isReadyRef.current && playerRef.current) {
          playerRef.current.pauseVideo();
        }
      },
      stop: () => {
        stopSilentAudioKeepAlive();
        stopProgressPoll();
        if (isReadyRef.current && playerRef.current) {
          try {
            playerRef.current.stopVideo();
          } catch {
            // 安全忽略
          }
        }
      },
      seek: (seconds) => {
        if (isReadyRef.current && playerRef.current) {
          playerRef.current.seekTo(seconds, true);
        }
      },
      setVolume: (v) => {
        if (isReadyRef.current && playerRef.current) {
          playerRef.current.setVolume(Math.round(v * 100));
        }
      },
      setMuted: (m) => {
        if (isReadyRef.current && playerRef.current) {
          if (m) playerRef.current.mute();
          else playerRef.current.unMute();
        }
      },
    };

    registerAdapter('youtube', adapter);

    return () => {
      stopProgressPoll();
      unregisterAdapter('youtube', adapter);
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      isReadyRef.current = false;
    };
  }, [isApiLoaded]);

  return (
    <>
      {/*
        遵守 YouTube 服務條款：不可將播放器完全隱藏或設為 0 像素。
        當播放 YouTube 曲目且未開全螢幕時，以懸浮畫中畫視窗呈現，使用者可最小化或點擊展開全螢幕。
      */}
      <div
        className={`fixed z-40 transition-all duration-300 ${
          isYouTubeActive && !isFullscreenPlayerOpen
            ? isPiPMinimized
              ? 'bottom-20 right-3 sm:bottom-24 sm:right-6 w-48 sm:w-56 shadow-2xl rounded-2xl overflow-hidden apple-sheet border border-white/10'
              : 'bottom-20 right-3 sm:bottom-24 sm:right-6 w-72 sm:w-96 shadow-2xl rounded-2xl overflow-hidden apple-sheet border border-white/10'
            : 'pointer-events-none opacity-0 -bottom-[1000px] left-0 w-64 h-36'
        }`}
      >
        {/* 小視窗頂部工具列 */}
        {isYouTubeActive && !isFullscreenPlayerOpen && (
          <div className="bg-black/60 px-3 py-1.5 flex items-center justify-between border-b border-white/[0.08] text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <YoutubeIcon className="w-3.5 h-3.5 text-[#fa2d48] shrink-0" />
              <span className="font-medium text-white truncate text-[11px]">
                {currentTrack?.title || 'YouTube 播放中'}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {currentTrack?.youtubeId && (
                <a
                  href={`https://www.youtube.com/watch?v=${currentTrack.youtubeId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 text-slate-400 hover:text-white transition-colors"
                  title="在 YouTube 開啟"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <button
                onClick={() => setIsPiPMinimized(!isPiPMinimized)}
                className="p-1 text-slate-400 hover:text-white transition-colors"
                title={isPiPMinimized ? '展開視窗' : '最小化視窗'}
              >
                {isPiPMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
              </button>
              <button
                onClick={() => setIsFullscreenPlayerOpen(true)}
                className="p-1 text-slate-400 hover:text-white transition-colors"
                title="進入全螢幕播放器"
              >
                <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
              </button>
            </div>
          </div>
        )}

        {/* 實際 IFrame 容器 (比例 16:9) */}
        <div className={`relative bg-black aspect-video w-full ${isPiPMinimized ? 'h-28' : 'h-auto'}`}>
          <div ref={containerRef} className="w-full h-full" />
        </div>
      </div>
    </>
  );
};
