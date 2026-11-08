import { create } from 'zustand';
import { Track, PlaybackMode, SourceFilter, Playlist, UserAccount } from '../types/player';
import { searchMediaTracks, fetchTrendingTracks } from '../services/searchService';
import {
  updateMediaSessionMetadata,
  updateMediaSessionPlaybackState,
  updateMediaSessionPositionState
} from '../utils/mediaSession';
import { playback, setEngineListeners } from '../engine/playbackController';
import {
  saveTrackToHistory,
  getHistoryTracks,
  removeHistoryTrack,
  clearAllHistory,
  cacheAudioBlob,
  MAX_OFFLINE_TRACKS,
} from '../services/offlineCache';
import {
  getSavedActiveUser,
  saveActiveUser,
  verifyCredentials,
} from '../services/authService';

// 本地存儲鍵名前綴 (支援依使用者名稱隔離)
function getUserStorageKey(user: UserAccount | null, key: string): string {
  const prefix = user ? `omnistream_user_${user.username.toLowerCase()}_` : 'omnistream_guest_';
  return `${prefix}${key}`;
}

const KEY_FAVORITES = 'favorites_v1';
const KEY_HISTORY = 'search_history_v1';
const KEY_VOLUME = 'volume_v1';
const KEY_FULL_ONLY = 'full_only_v1';
const KEY_YT_KEY = 'youtube_api_key_v1';
const KEY_SOURCE_FILTER = 'source_filter_v1';
const KEY_PLAYLISTS = 'playlists_v1';

// 系統內建預設 YouTube Data API v3 金鑰 (若 .env 未指定則使用此金鑰)
const BUILTIN_YOUTUBE_API_KEY = 'AIzaSyCRMJipqFFFE-nc0f0VZm3Nwfp_UbcWGu4';

/** 系統內建或 .env 設定的 YouTube 金鑰 (優先於使用者在設定面板輸入的金鑰) */
export const ENV_YOUTUBE_API_KEY = (import.meta.env.VITE_YOUTUBE_API_KEY || BUILTIN_YOUTUBE_API_KEY).trim();

function readUserStorage<T>(user: UserAccount | null, key: string, fallback: T, parse: (raw: string) => T): T {
  try {
    const fullKey = getUserStorageKey(user, key);
    const raw = localStorage.getItem(fullKey);
    return raw === null ? fallback : parse(raw);
  } catch {
    return fallback;
  }
}

function writeUserStorage(user: UserAccount | null, key: string, value: string): void {
  try {
    const fullKey = getUserStorageKey(user, key);
    localStorage.setItem(fullKey, value);
  } catch (e) {
    console.warn('寫入使用者資料庫失敗:', e);
  }
}

// 取得記住的登入使用者，若無則預設為第一位使用者 Feynman (自動記住登入)
const initialUser: UserAccount = getSavedActiveUser() || {
  username: 'Feynman',
  displayName: 'Feynman',
  avatar: '#fa2d48',
};
saveActiveUser(initialUser);

const initialVolume = readUserStorage(initialUser, KEY_VOLUME, 0.85, parseFloat);
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

  // 使用者帳號與自訂歌單
  currentUser: UserAccount;
  isAuthModalOpen: boolean;
  playlists: Playlist[];
  activePlaylistId: string | null;

  historyTracks: Track[];
  isHistoryLoading: boolean;

  // 動作 (Actions)
  login: (username: string, pin: string) => boolean;
  logout: () => void;
  setIsAuthModalOpen: (open: boolean) => void;

  // 播放清單動作
  createPlaylist: (name: string, description?: string) => Playlist;
  deletePlaylist: (playlistId: string) => void;
  clearPlaylistTracks: (playlistId: string) => void;
  clearAllPlaylists: () => void;
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  setActivePlaylistId: (id: string | null) => void;
  generateRandomFavoritesPlaylist: () => Promise<Playlist | null>;

  setSearchQuery: (query: string) => void;
  searchAndAutoplay: (query: string) => Promise<void>;
  loadTrending: () => Promise<void>;
  loadHistory: () => Promise<void>;
  deleteHistoryTrack: (trackId: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  cacheTrackAudio: (track: Track) => Promise<void>;
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

    // 儲存至 IndexedDB 播放歷史並自動快取離線音訊 (上限 200 首)
    saveTrackToHistory(track)
      .then((res) => {
        if (res?.limitExceeded) {
          get().showToast(`⚠️ 離線歌區已達上限（${MAX_OFFLINE_TRACKS} 首），請先清除歷史歌曲否則無法新增！`);
        }
        return getHistoryTracks();
      })
      .then((history) => {
        set({ historyTracks: history });
      })
      .catch((err) => console.warn('無法記錄播放歷史:', err));
  };

  // 接收兩個引擎回報的事件
  setEngineListeners({
    onPlayState: (playing) => {
      if (playing) consecutiveErrors = 0;
      updateMediaSessionPlaybackState(playing);
      set({ isPlaying: playing });
    },
    onTime: (time, duration) => {
      const dur = duration > 0 && isFinite(duration) ? duration : get().duration;
      updateMediaSessionPositionState(time, dur);
      set({ currentTime: time, duration: dur });
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

    // 使用者帳號與播放清單
    currentUser: initialUser,
    isAuthModalOpen: false,
    playlists: readUserStorage<Playlist[]>(initialUser, KEY_PLAYLISTS, [], JSON.parse),
    activePlaylistId: null,

    searchQuery: '',
    searchResults: [],
    isSearching: false,
    searchHistory: readUserStorage(initialUser, KEY_HISTORY, ['周杰倫', '周深', '張雨生', '毛不易'], JSON.parse),
    searchWarnings: [],
    favorites: readUserStorage<Track[]>(initialUser, KEY_FAVORITES, [], JSON.parse),
    fullOnly: readUserStorage(initialUser, KEY_FULL_ONLY, true, (raw) => raw !== 'false'),
    userYoutubeApiKey: readUserStorage(initialUser, KEY_YT_KEY, '', (raw) => raw),
    sourceFilter: readUserStorage<SourceFilter>(initialUser, KEY_SOURCE_FILTER, 'all', (raw) => raw as SourceFilter),
    toast: null,

    historyTracks: [],
    isHistoryLoading: false,

    isQueueOpen: false,
    isFullscreenPlayerOpen: false,
    isSettingsOpen: false,

    login: (username: string, pin: string) => {
      const verified = verifyCredentials(username, pin);
      if (!verified) {
        get().showToast('帳號或密碼錯誤，請重新確認');
        return false;
      }

      saveActiveUser(verified);

      // 載入該使用者的專屬偏好設定與播放清單
      const userVolume = readUserStorage(verified, KEY_VOLUME, 0.85, parseFloat);
      const userFavs = readUserStorage<Track[]>(verified, KEY_FAVORITES, [], JSON.parse);
      const userPlaylists = readUserStorage<Playlist[]>(verified, KEY_PLAYLISTS, [], JSON.parse);
      const userFullOnly = readUserStorage(verified, KEY_FULL_ONLY, true, (raw) => raw !== 'false');
      const userKey = readUserStorage(verified, KEY_YT_KEY, '', (raw) => raw);
      const userFilter = readUserStorage<SourceFilter>(verified, KEY_SOURCE_FILTER, 'all', (raw) => raw as SourceFilter);
      const userHist = readUserStorage(verified, KEY_HISTORY, ['周杰倫', '周深', '張雨生', '毛不易'], JSON.parse);

      playback.setVolume(userVolume);

      set({
        currentUser: verified,
        isAuthModalOpen: false,
        volume: userVolume,
        favorites: userFavs,
        playlists: userPlaylists,
        fullOnly: userFullOnly,
        userYoutubeApiKey: userKey,
        sourceFilter: userFilter,
        searchHistory: userHist,
        activePlaylistId: null,
      });

      get().showToast(`歡迎回來，${verified.displayName}！已載入您的專屬設定與歌單`);
      return true;
    },

    logout: () => {
      saveActiveUser(null);
      get().showToast('已登出');
      // 切換回訪客或第一位預設帳號
      const fallbackUser: UserAccount = {
        username: 'Feynman',
        displayName: 'Feynman',
        avatar: '#fa2d48',
      };
      set({ currentUser: fallbackUser });
    },

    setIsAuthModalOpen: (open) => set({ isAuthModalOpen: open }),

    // 播放清單操作
    createPlaylist: (name: string, description?: string) => {
      const cleanName = name.trim();
      const newPlaylist: Playlist = {
        id: `pl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: cleanName || '未命名歌單',
        description: description?.trim() || '',
        createdAt: Date.now(),
        tracks: [],
      };

      const { playlists, currentUser } = get();
      const updated = [newPlaylist, ...playlists];
      writeUserStorage(currentUser, KEY_PLAYLISTS, JSON.stringify(updated));
      set({ playlists: updated });
      get().showToast(`已建立播放清單「${newPlaylist.name}」`);
      return newPlaylist;
    },

    deletePlaylist: (playlistId: string) => {
      const { playlists, currentUser, activePlaylistId } = get();
      const target = playlists.find((pl) => pl.id === playlistId);
      const updated = playlists.filter((pl) => pl.id !== playlistId);
      writeUserStorage(currentUser, KEY_PLAYLISTS, JSON.stringify(updated));
      set({
        playlists: updated,
        activePlaylistId: activePlaylistId === playlistId ? null : activePlaylistId,
      });
      get().showToast(`已刪除播放清單「${target?.name || ''}」`);
    },

    clearPlaylistTracks: (playlistId: string) => {
      const { playlists, currentUser } = get();
      let targetName = '';
      const updated = playlists.map((pl) => {
        if (pl.id === playlistId) {
          targetName = pl.name;
          return { ...pl, tracks: [] };
        }
        return pl;
      });
      writeUserStorage(currentUser, KEY_PLAYLISTS, JSON.stringify(updated));
      set({ playlists: updated });
      get().showToast(`已清空「${targetName}」內的所有歌曲`);
    },

    clearAllPlaylists: () => {
      const { currentUser } = get();
      writeUserStorage(currentUser, KEY_PLAYLISTS, JSON.stringify([]));
      set({ playlists: [], activePlaylistId: null });
      get().showToast('已清空所有自訂播放清單');
    },

    addTrackToPlaylist: (playlistId: string, track: Track) => {
      const { playlists, currentUser } = get();
      let addedTitle = '';
      const updated = playlists.map((pl) => {
        if (pl.id === playlistId) {
          addedTitle = pl.name;
          const exists = pl.tracks.some((t) => t.id === track.id);
          if (exists) return pl;
          return { ...pl, tracks: [track, ...pl.tracks] };
        }
        return pl;
      });

      writeUserStorage(currentUser, KEY_PLAYLISTS, JSON.stringify(updated));
      set({ playlists: updated });
      get().showToast(`已將《${track.title}》加入歌單「${addedTitle}」`);
    },

    removeTrackFromPlaylist: (playlistId: string, trackId: string) => {
      const { playlists, currentUser } = get();
      const updated = playlists.map((pl) => {
        if (pl.id === playlistId) {
          return { ...pl, tracks: pl.tracks.filter((t) => t.id !== trackId) };
        }
        return pl;
      });

      writeUserStorage(currentUser, KEY_PLAYLISTS, JSON.stringify(updated));
      set({ playlists: updated });
      get().showToast('已從歌單移除曲目');
    },

    setActivePlaylistId: (id) => set({ activePlaylistId: id }),

    generateRandomFavoritesPlaylist: async () => {
      const { favorites, historyTracks, playlists, searchResults, currentUser } = get();

      // 彙整使用者喜好的候選曲庫（優先權：我的喜愛 -> 播放歷史 -> 現有歌單歌曲 -> 目前推薦/搜尋曲目）
      const candidateMap = new Map<string, Track>();

      favorites.forEach((t) => candidateMap.set(t.id, t));
      historyTracks.forEach((t) => {
        if (!candidateMap.has(t.id)) candidateMap.set(t.id, t);
      });
      playlists.forEach((pl) => {
        pl.tracks.forEach((t) => {
          if (!candidateMap.has(t.id)) candidateMap.set(t.id, t);
        });
      });
      searchResults.forEach((t) => {
        if (!candidateMap.has(t.id)) candidateMap.set(t.id, t);
      });

      const allCandidates = Array.from(candidateMap.values());

      if (allCandidates.length === 0) {
        get().showToast('曲庫暫無歌曲，請先探索或播放一些歌曲！');
        return null;
      }

      // 洗牌演算法 (Fisher-Yates Shuffle)
      const shuffled = [...allCandidates];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      // 挑選 10 首 (若曲庫總數不足 10 首則取全部)
      const selectedTracks = shuffled.slice(0, 10);

      // 取得今天日期字串 (例如 "2026/11/08")
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const dateStr = `${year}/${month}/${day}`;

      const playlistTitle = `${dateStr} 隨機心選推薦`;
      const description = `依據 ${currentUser.displayName} 的聆聽偏好與收藏智慧挑選的 10 首精選曲目`;

      const newPlaylist: Playlist = {
        id: `pl_random_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: playlistTitle,
        description,
        createdAt: Date.now(),
        tracks: selectedTracks,
      };

      const updated = [newPlaylist, ...playlists];
      writeUserStorage(currentUser, KEY_PLAYLISTS, JSON.stringify(updated));
      set({ playlists: updated, activePlaylistId: newPlaylist.id });
      get().showToast(`已建立「${playlistTitle}」共 ${selectedTracks.length} 首歌曲！`);

      return newPlaylist;
    },

    loadHistory: async () => {
      set({ isHistoryLoading: true });
      try {
        const history = await getHistoryTracks();
        set({ historyTracks: history, isHistoryLoading: false });
      } catch {
        set({ isHistoryLoading: false });
      }
    },

    deleteHistoryTrack: async (trackId: string) => {
      await removeHistoryTrack(trackId);
      const history = await getHistoryTracks();
      set({ historyTracks: history });
      get().showToast('已從歷史清單移除');
    },

    clearHistory: async () => {
      await clearAllHistory();
      set({ historyTracks: [] });
      get().showToast('已清空離線歌區與本機快取');
    },

    cacheTrackAudio: async (track: Track) => {
      if (!track.streamUrl || track.source === 'youtube') {
        get().showToast('此來源不支援離線快取下載');
        return;
      }
      const { historyTracks } = get();
      const exists = historyTracks.some((t) => t.id === track.id);
      if (!exists && historyTracks.length >= MAX_OFFLINE_TRACKS) {
        get().showToast(`⚠️ 離線歌區已達上限（${MAX_OFFLINE_TRACKS} 首），請先清除歷史歌曲否則無法新增！`);
        return;
      }
      get().showToast(`正在快取《${track.title}》...`);
      const ok = await cacheAudioBlob(track.id, track.streamUrl);
      if (ok) {
        const history = await getHistoryTracks();
        set({ historyTracks: history });
        get().showToast(`《${track.title}》已完成離線快取`);
      } else {
        get().showToast(`快取《${track.title}》失敗`);
      }
    },

    setSearchQuery: (query) => set({ searchQuery: query }),

    setFullOnly: (fullOnly) => {
      writeUserStorage(get().currentUser, KEY_FULL_ONLY, String(fullOnly));
      set({ fullOnly });
    },

    setUserYoutubeApiKey: (key) => {
      const clean = key.trim();
      writeUserStorage(get().currentUser, KEY_YT_KEY, clean);
      set({ userYoutubeApiKey: clean });
    },

    setSourceFilter: (filter) => {
      writeUserStorage(get().currentUser, KEY_SOURCE_FILTER, filter);
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
        writeUserStorage(get().currentUser, KEY_HISTORY, JSON.stringify(updatedHistory));

        set({ searchResults: tracks, searchWarnings: warnings, isSearching: false, searchHistory: updatedHistory });

        // 搜尋完成後直接選第一首播放
        if (tracks.length > 0) {
          const firstTrack = tracks[0];
          consecutiveErrors = 0;
          set({ queue: tracks, currentIndex: 0 });
          startTrack(firstTrack);
          get().showToast(`正在播放第一首：《${firstTrack.title}》`);
        } else {
          get().showToast('查無相符歌曲，請更換關鍵字再試');
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
      writeUserStorage(get().currentUser, KEY_VOLUME, safeVol.toString());
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
      const { favorites, currentUser } = get();
      const exists = favorites.some((t) => t.id === track.id);
      const updated = exists ? favorites.filter((t) => t.id !== track.id) : [track, ...favorites];
      writeUserStorage(currentUser, KEY_FAVORITES, JSON.stringify(updated));
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
