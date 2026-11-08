import { Track } from '../types/player';

export function updateMediaSessionMetadata(track: Track | null) {
  if (!('mediaSession' in navigator) || !track) return;

  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: track.album || 'OmniStream Player',
      artwork: [
        {
          src: track.artwork,
          sizes: '512x512',
          type: 'image/jpeg'
        },
        {
          src: track.artwork,
          sizes: '256x256',
          type: 'image/jpeg'
        }
      ]
    });
  } catch (err) {
    console.warn('無法更新 MediaSession metadata:', err);
  }
}

export function updateMediaSessionPlaybackState(isPlaying: boolean) {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  } catch {
    // 安全忽略不支援的瀏覽器
  }
}

export function updateMediaSessionPositionState(position: number, duration: number, playbackRate: number = 1.0) {
  if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
  if (!Number.isFinite(duration) || duration <= 0) return;
  if (!Number.isFinite(position) || position < 0) return;

  try {
    navigator.mediaSession.setPositionState({
      duration: Math.max(0, duration),
      playbackRate: playbackRate,
      position: Math.min(Math.max(0, position), duration),
    });
  } catch {
    // 安全忽略不支援的狀態
  }
}

export function setupMediaSessionActionHandlers(actions: {
  onPlay: () => void;
  onPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeekTo?: (time: number) => void;
}) {
  if (!('mediaSession' in navigator)) return;

  const actionList: [MediaSessionAction, (details: any) => void][] = [
    ['play', actions.onPlay],
    ['pause', actions.onPause],
    ['previoustrack', actions.onPrev],
    ['nexttrack', actions.onNext],
    [
      'seekto',
      (details) => {
        if (details.seekTime !== undefined && actions.onSeekTo) {
          actions.onSeekTo(details.seekTime);
        }
      }
    ]
  ];

  for (const [action, handler] of actionList) {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch {
      // 部分瀏覽器可能不支援特定 action，安全忽略
    }
  }
}
