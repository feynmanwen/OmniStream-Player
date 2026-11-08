import React, { useEffect, useRef } from 'react';
import {
  registerAdapter,
  unregisterAdapter,
  reportFromEngine,
  PlaybackAdapter,
} from '../engine/playbackController';
import { usePlayerStore } from '../store/usePlayerStore';
import { setupMediaSessionActionHandlers } from '../utils/mediaSession';
import { getOfflineAudioUrl } from '../services/offlineCache';

export const AudioEngine: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { togglePlay, nextTrack, prevTrack, seekTo } = usePlayerStore();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const adapter: PlaybackAdapter = {
      load: async (track) => {
        let playUrl = track.streamUrl;
        try {
          const offlineBlobUrl = await getOfflineAudioUrl(track.id);
          if (offlineBlobUrl) {
            playUrl = offlineBlobUrl;
          }
        } catch {
          // 降級使用 streamUrl
        }

        if (!playUrl) return;
        audio.src = playUrl;
        audio.load();
        audio.play().catch((err) => {
          console.warn('HTML Audio 自動播放被攔截或失敗:', err);
          reportFromEngine('audio', 'onPlayState', false);
        });
      },
      play: () => {
        audio.play().catch((err) => console.warn('HTML Audio play 失敗:', err));
      },
      pause: () => {
        audio.pause();
      },
      stop: () => {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      },
      seek: (seconds) => {
        if (Number.isFinite(seconds)) {
          audio.currentTime = seconds;
        }
      },
      setVolume: (v) => {
        audio.volume = Math.max(0, Math.min(1, v));
      },
      setMuted: (m) => {
        audio.muted = m;
      },
    };

    registerAdapter('audio', adapter);

    return () => {
      unregisterAdapter('audio', adapter);
    };
  }, []);

  // 設定全域系統層級 MediaSession 控制
  useEffect(() => {
    setupMediaSessionActionHandlers({
      onPlay: () => togglePlay(),
      onPause: () => togglePlay(),
      onNext: () => nextTrack(),
      onPrev: () => prevTrack(),
      onSeekTo: (time) => seekTo(time),
    });
  }, [togglePlay, nextTrack, prevTrack, seekTo]);

  return (
    <audio
      ref={audioRef}
      id="omnistream-audio-element"
      preload="auto"
      onPlay={() => reportFromEngine('audio', 'onPlayState', true)}
      onPause={() => reportFromEngine('audio', 'onPlayState', false)}
      onTimeUpdate={(e) => {
        const el = e.currentTarget;
        reportFromEngine('audio', 'onTime', el.currentTime, el.duration);
      }}
      onLoadedMetadata={(e) => {
        const el = e.currentTarget;
        reportFromEngine('audio', 'onTime', el.currentTime, el.duration);
      }}
      onEnded={() => {
        reportFromEngine('audio', 'onEnded');
      }}
      onError={(e) => {
        console.warn('HTML Audio 串流載入錯誤:', e);
        reportFromEngine('audio', 'onError', '此曲目音訊暫時無法播放');
      }}
      className="hidden"
    />
  );
};
