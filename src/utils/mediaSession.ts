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
