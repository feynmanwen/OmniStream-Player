import { create } from 'zustand';
import { Track, PlaybackMode, SourceFilter } from '../types/player';
import { searchMediaTracks, fetchTrendingTracks } from '../services/searchService';
import { updateMediaSessionMetadata } from '../utils/mediaSession';
import { playback, setEngineListeners } from '../engine/playbackController';

// 本地存儲鍵名
const STORAGE_KEY_FAVORITES = 'omnistream_favorites_v1';
const STORAGE_KEY_HISTORY = 'omnistream_search_history_v1';
const STORAGE_KEY_VOLUME = 'omnistream_volume_v1';
const STORAGE_KEY_FULL_ONLY = 'omnistream_full_only_v1';
const STORAGE_KEY_YT_KEY = 'omnistream_youtube_api_key_v1';
const STORAGE_KEY_SOURCE_FILTER = 'omnistream_source_filter_v1';

// 系統內建預設 YouTube Data API v3 金鑰 (若 .env 未指定則使用此金鑰)
const BUILTIN_YOUTUBE_API_KEY = 'AIzaSyCRMJipqFFFE-nc0f0VZm3Nwfp_UbcWGu4';

/** 系統內建或 .env 設定的 YouTube 金鑰 (優先於使用者在設定面板輸入的金鑰) */
export const ENV_YOUTUBE_API_KEY = (import.meta.env.VITE_YOUTUBE_API_KEY || BUILTIN_YOUTUBE_API_KEY).trim();

function readStorage<T>(key: string, fallback: T, parse: (raw: string) => T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : parse(raw);
  } catch {
    return fallback;
  }
}

const initialVolume = readStorage(STORAGE_KEY_VOLUME, 0.85, parseFloat);
playback.setVolume(initialVolume);

export function filterBySource(tracks: Track[], filter: SourceFilter): Track[] {
  if (filter === 'all') return tracks;
  if (filter === 'youtube') return tracks.filter((t) => t.source === 'youtube');
  return tracks.filter((t) => t.source !== 'youtube');
}

interface PlayerState {
  // 播放佇列與核心狀態
  queue: Track[];
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  playbackMode: PlaybackMode;

  // 搜尋狀態
  searchQuery: string;
  searchResults: Track[];
  isSearching: boolean;
  searchHistory: string[];
  /** 非致命搜尋警告 (例如 YouTube 配額用盡) */
  searchWarnings: string[];
  favorites: Track[];
  /** 僅顯示完整曲目 (排除 iTunes 30 秒試聽) */
  fullOnly: boolean;
  /** 使用者於設定面板輸入的 YouTube 金鑰 */
  userYoutubeApiKey: string;
  sourceFilter: SourceFilter;
  /** 播放錯誤提示 (自動消失) */
  toast: string | null;

  // 介面控制
  isQueueOpen: boolean;
  isFullscreenPlayerOpen: boolean;
  isSettingsOpen: boolean;

  // 動作 (Actions)
  setSearchQuery: (query: string) => void;
  searchAndAutoplay: (query: string) => Promise<void>;
  loadTrending: () => Promise<void>;
  setFullOnly: (fullOnly: boolean) => void;
  setUserYoutubeApiKey: (key: string) => void;
  setSourceFilter: (filter: SourceFilter) => void;
  getYoutubeApiKey: () => string;
  playTrackAtIndex: (index: number) => void;
  playTrack: (track: Track) => void;
  playList: (tracks: Track[]) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  togglePlaybackMode: () => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  toggleFavorite: (track: Track) => void;
  setIsQueueOpen: (open: boolean) => void;
  setIsFullscreenPlayerOpen: (open: boolean) => void;
  setIsSettingsOpen: (open: boolean) => void;
  showToast: (message: string) => void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
/** 連續播放失敗次數，避免整個佇列都無法播放時無限跳轉 */
let consecutiveErrors = 0;

export const usePlayerStore = create<PlayerState>((set, get) => {
  /** 透過轉接層載入並播放曲目 */
  const startTrack = (track: Track) => {
    set({ currentTime: 0, duration: track.duration || 0 });
    updateMediaSessionMetadata(track);
    playback.loadAndPlay(track);
  };

  // 接收兩個引擎回報的事件
  setEngineListeners({
    onPlayState: (playing) => {
      if (playing) consecutiveErrors = 0;
      set({ isPlaying: playing });
    },
    onTime: (time, duration) => {
      set({ currentTime: time, duration: duration > 0 && isFinite(duration) ? duration : get().duration });
    },
    onEnded: () => {
      get().nextTrack();
    },
    onError: (message) => {
      const { queue, currentIndex } = get();
      consecutiveErrors += 1;
      set({ isPlaying: false });
      if (consecutiveErrors >= Math.max(3, queue.length)) {
        get().showToast(`${message}（已停止自動跳轉）`);
        consecutiveErrors = 0;
        return;
      }
      get().showToast(`${message}，自動播放下一首`);
      const failedIndex = currentIndex;
      setTimeout(() => {
        // 只有在使用者沒有手動切歌時才跳下一首
        if (get().currentIndex === failedIndex) get().nextTrack();
      }, 800);
    },
  });

  return {
    queue: [],
    currentIndex: 0,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: initialVolume,
    isMuted: false,
    playbackRate: 1.0,
    playbackMode: 'repeat-all',

    searchQuery: '',
    searchResults: [],
    isSearching: false,
    searchHistory: readStorage(STORAGE_KEY_HISTORY, ['周杰倫', '周深', '張雨生', '毛不易'], JSON.parse),
    searchWarnings: [],
    favorites: readStorage<Track[]>(STORAGE_KEY_FAVORITES, [], JSON.parse),
    fullOnly: readStorage(STORAGE_KEY_FULL_ONLY, true, (raw) => raw !== 'false'),
    userYoutubeApiKey: readStorage(STORAGE_KEY_YT_KEY, '', (raw) => raw),
    sourceFilter: readStorage<SourceFilter>(STORAGE_KEY_SOURCE_FILTER, 'all', (raw) => raw as SourceFilter),
    toast: null,

    isQueueOpen: false,
    isFullscreenPlayerOpen: false,
    isSettingsOpen: false,

    setSearchQuery: (query) => set({ searchQuery: query }),

    setFullOnly: (fullOnly) => {
      localStorage.setItem(STORAGE_KEY_FULL_ONLY, String(fullOnly));
      set({ fullOnly });
    },

    setUserYoutubeApiKey: (key) => {
      const clean = key.trim();
      if (clean) localStorage.setItem(STORAGE_KEY_YT_KEY, clean);
      else localStorage.removeItem(STORAGE_KEY_YT_KEY);
      set({ userYoutubeApiKey: clean });
    },

    setSourceFilter: (filter) => {
      localStorage.setItem(STORAGE_KEY_SOURCE_FILTER, filter);
      set({ sourceFilter: filter });
    },

    getYoutubeApiKey: () => ENV_YOUTUBE_API_KEY || get().userYoutubeApiKey,

    // 啟動時預設載入歌手推薦曲目 (不自動發聲播放，避免違反瀏覽器 Autoplay 規範)
    loadTrending: async () => {
      set({ isSearching: true });
      const ytKey = get().getYoutubeApiKey();
      let tracks: Track[] = [];
      let warnings: string[] = [];
      try {
        if (ytKey) {
          const res = await searchMediaTracks('周杰倫', {
            fullOnly: get().fullOnly,
            youtubeApiKey: ytKey,
          });
          tracks = res.tracks;
          warnings = res.warnings;
          set({ searchQuery: '周杰倫' });
        } else {
          tracks = await fetchTrendingTracks();
        }
      } catch {
        tracks = await fetchTrendingTracks();
      }
      const { queue } = get();
      set({
        searchResults: tracks,
        searchWarnings: warnings,
        isSearching: false,
        ...(queue.length === 0 && tracks.length > 0
          ? { queue: tracks, currentIndex: 0, duration: tracks[0]?.duration || 0 }
          : {}),
      });
    },

    // 核心特色：搜尋即自動連續播放 (Search-to-Stream)
    searchAndAutoplay: async (query: string) => {
      const cleanQuery = query.trim();
      if (!cleanQuery) return;

      set({ isSearching: true, searchQuery: cleanQuery, searchWarnings: [] });

      try {
        const { tracks, warnings } = await searchMediaTracks(cleanQuery, {
          fullOnly: get().fullOnly,
          youtubeApiKey: get().getYoutubeApiKey() || undefined,
        });

        const currentHistory = get().searchHistory.filter((item) => item.toLowerCase() !== cleanQuery.toLowerCase());
        const updatedHistory = [cleanQuery, ...currentHistory].slice(0, 10);
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updatedHistory));

        set({ searchResults: tracks, searchWarnings: warnings, isSearching: false, searchHistory: updatedHistory });

        // 依目前的來源分頁決定要自動播放的清單；該分頁無結果時改用全部結果
        const filtered = filterBySource(tracks, get().sourceFilter);
        const playable = filtered.length > 0 ? filtered : tracks;
        if (playable.length > 0) {
          consecutiveErrors = 0;
          set({ queue: playable, currentIndex: 0 });
          startTrack(playable[0]);
        }
      } catch (err) {
        console.error('搜尋失敗:', err);
        set({ isSearching: false, searchWarnings: ['搜尋失敗，請檢查網路連線'] });
      }
    },

    playTrackAtIndex: (index: number) => {
      const { queue } = get();
      if (index < 0 || index >= queue.length) return;
      set({ currentIndex: index });
      startTrack(queue[index]);
    },

    playTrack: (track: Track) => {
      const { queue } = get();
      const existingIndex = queue.findIndex((t) => t.id === track.id);
      if (existingIndex !== -1) {
        get().playTrackAtIndex(existingIndex);
      } else {
        set({ queue: [track, ...queue] });
        get().playTrackAtIndex(0);
      }
    },

    playList: (tracks: Track[]) => {
      if (tracks.length === 0) return;
      consecutiveErrors = 0;
      set({ queue: tracks, currentIndex: 0 });
      startTrack(tracks[0]);
    },

    togglePlay: () => {
      const { isPlaying, queue, currentIndex } = get();
      if (isPlaying) {
        playback.pause();
      } else if (!playback.activeKind) {
        // 尚未載入任何曲目 (例如剛開啟 App)
        if (queue[currentIndex]) startTrack(queue[currentIndex]);
      } else {
        playback.play();
      }
    },

    nextTrack: () => {
      const { queue, currentIndex, playbackMode } = get();
      if (queue.length === 0) return;

      if (playbackMode === 'repeat-one') {
        playback.seek(0);
        playback.play();
        return;
      }

      if (playbackMode === 'shuffle') {
        get().playTrackAtIndex(Math.floor(Math.random() * queue.length));
        return;
      }

      const nextIndex = currentIndex + 1;
      if (nextIndex < queue.length) {
        get().playTrackAtIndex(nextIndex);
      } else if (playbackMode === 'repeat-all') {
        get().playTrackAtIndex(0);
      } else {
        playback.pause();
      }
    },

    prevTrack: () => {
      const { queue, currentIndex, currentTime } = get();
      if (queue.length === 0) return;

      // 若播放超過 3 秒，先重頭播放當前曲目
      if (currentTime > 3 && playback.activeKind) {
        playback.seek(0);
        set({ currentTime: 0 });
        return;
      }

      get().playTrackAtIndex(currentIndex - 1 >= 0 ? currentIndex - 1 : queue.length - 1);
    },

    seekTo: (time: number) => {
      playback.seek(time);
      set({ currentTime: time });
    },

    setVolume: (volume: number) => {
      const safeVol = Math.max(0, Math.min(1, volume));
      playback.setVolume(safeVol);
      playback.setMuted(false);
      localStorage.setItem(STORAGE_KEY_VOLUME, safeVol.toString());
      set({ volume: safeVol, isMuted: false });
    },

    toggleMute: () => {
      const muted = !get().isMuted;
      playback.setMuted(muted);
      set({ isMuted: muted });
    },

    togglePlaybackMode: () => {
      const modes: PlaybackMode[] = ['repeat-all', 'repeat-one', 'shuffle', 'order'];
      const nextIndex = (modes.indexOf(get().playbackMode) + 1) % modes.length;
      set({ playbackMode: modes[nextIndex] });
    },

    addToQueue: (track: Track) => {
      const { queue } = get();
      if (queue.some((t) => t.id === track.id)) return;
      set({ queue: [...queue, track] });
    },

    removeFromQueue: (index: number) => {
      const { queue, currentIndex } = get();
      const newQueue = queue.filter((_, i) => i !== index);
      let newIndex = currentIndex;
      if (index < currentIndex) {
        newIndex = currentIndex - 1;
      } else if (index === currentIndex && index >= newQueue.length) {
        newIndex = Math.max(0, newQueue.length - 1);
      }
      set({ queue: newQueue, currentIndex: newIndex });
    },

    clearQueue: () => {
      playback.stopAll();
      set({ queue: [], currentIndex: 0, isPlaying: false, currentTime: 0, duration: 0 });
    },

    toggleFavorite: (track: Track) => {
      const { favorites } = get();
      const exists = favorites.some((t) => t.id === track.id);
      const updated = exists ? favorites.filter((t) => t.id !== track.id) : [track, ...favorites];
      localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(updated));
      set({ favorites: updated });
    },

    setIsQueueOpen: (open) => set({ isQueueOpen: open }),
    setIsFullscreenPlayerOpen: (open) => set({ isFullscreenPlayerOpen: open }),
    setIsSettingsOpen: (open) => set({ isSettingsOpen: open }),

    showToast: (message) => {
      if (toastTimer) clearTimeout(toastTimer);
      set({ toast: message });
      toastTimer = setTimeout(() => set({ toast: null }), 4000);
    },
  };
});
