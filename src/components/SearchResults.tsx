import React from 'react';
import {
  Play,
  Plus,
  Heart,
  Music,
  Check,
  Volume2,
  AlertTriangle,
  Key,
  History,
  Trash2,
  HardDriveDownload,
  FolderPlus,
  Library,
  ArrowLeft,
} from 'lucide-react';
import { YoutubeIcon } from './icons/YoutubeIcon';
import { usePlayerStore, filterBySource } from '../store/usePlayerStore';
import { MAX_OFFLINE_TRACKS } from '../services/offlineCache';
import { Track } from '../types/player';
import { formatTime } from '../utils/formatTime';
import { MainNavTab } from './Navbar';

interface SearchResultsProps {
  activeTab: MainNavTab;
  setActiveTab?: (tab: MainNavTab) => void;
  onOpenAddToPlaylist?: (track: Track) => void;
  onOpenCreatePlaylist?: () => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  activeTab,
  onOpenAddToPlaylist,
  onOpenCreatePlaylist,
}) => {
  const {
    searchResults,
    searchQuery,
    isSearching,
    queue,
    currentIndex,
    isPlaying,
    favorites,
    historyTracks,
    playlists,
    activePlaylistId,
    setActivePlaylistId,
    deletePlaylist,
    clearPlaylistTracks,
    clearAllPlaylists,
    removeTrackFromPlaylist,
    playTrack,
    playList,
    addToQueue,
    toggleFavorite,
    deleteHistoryTrack,
    clearHistory,
    cacheTrackAudio,
    sourceFilter,
    setSourceFilter,
    searchWarnings,
    getYoutubeApiKey,
    setIsSettingsOpen,
    currentUser,
  } = usePlayerStore();

  const currentTrack = queue[currentIndex] || null;
  const activePlaylist = playlists.find((p) => p.id === activePlaylistId) || null;

  const baseTracks: Track[] =
    activeTab === 'favorites'
      ? favorites
      : activeTab === 'history'
      ? historyTracks
      : activeTab === 'playlists' && activePlaylist
      ? activePlaylist.tracks
      : searchResults;

  // 計算各來源數量
  const ytCount = baseTracks.filter((t) => t.source === 'youtube').length;
  const audiusCount = baseTracks.filter((t) => t.source !== 'youtube').length;

  const displayTracks: Track[] =
    activeTab === 'favorites'
      ? favorites
      : activeTab === 'history'
      ? historyTracks
      : activeTab === 'playlists' && activePlaylist
      ? activePlaylist.tracks
      : filterBySource(baseTracks, sourceFilter);
  const hasYtKey = Boolean(getYoutubeApiKey());

  const handlePlayAll = () => {
    if (displayTracks.length === 0) return;
    playList(displayTracks);
  };

  const handleAddAllToQueue = () => {
    displayTracks.forEach((track) => addToQueue(track));
  };

  const isCurrentTrack = (track: Track) => {
    return currentTrack?.id === track.id;
  };

  const isFav = (track: Track) => {
    return favorites.some((f) => f.id === track.id);
  };

  const isQueued = (track: Track) => {
    return queue.some((q) => q.id === track.id);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-36">
      {/* 搜尋警告提示 */}
      {searchWarnings.length > 0 && (
        <div className="mb-6 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <div className="flex-1">{searchWarnings.join('；')}</div>
        </div>
      )}

      {/* 尚未設定 YouTube 金鑰之引導提示 (若有自訂金鑰需求) */}
      {!hasYtKey && activeTab === 'search' && searchQuery && (
        <div className="mb-6 p-4 rounded-2xl apple-card text-xs text-neutral-300 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <YoutubeIcon className="w-5 h-5 text-[#fa2d48] shrink-0" />
            <span className="truncate">
              尚未設定 YouTube API 金鑰，目前僅搜尋 Audius 免費曲庫。填入金鑰即可解鎖更多官方歌曲！
            </span>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="px-3.5 py-1.5 bg-[#fa2d48]/15 hover:bg-[#fa2d48]/25 text-[#fa2d48] rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Key className="w-3.5 h-3.5" />
            設定金鑰
          </button>
        </div>
      )}

      {/* Apple Music 風格大標題與操作控制項 */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-6 pb-4 border-b border-white/[0.06]">
        <div>
          {activeTab === 'playlists' && activePlaylist ? (
            <button
              onClick={() => setActivePlaylistId(null)}
              className="inline-flex items-center gap-1.5 text-xs text-[#fa2d48] hover:underline mb-2 cursor-pointer font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              返回歌單列表
            </button>
          ) : null}

          <span className="text-[11px] font-semibold tracking-wider text-[#fa2d48] uppercase mb-1 block">
            {activeTab === 'favorites'
              ? '個人收藏庫'
              : activeTab === 'history'
              ? '離線暫存庫'
              : activeTab === 'playlists'
              ? `${currentUser.displayName} 的歌單`
              : '精選推薦'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
            {activeTab === 'favorites' ? (
              <>
                <Heart className="w-7 h-7 text-[#fa2d48] fill-[#fa2d48]" />
                喜愛歌曲
              </>
            ) : activeTab === 'history' ? (
              <>
                <History className="w-7 h-7 text-emerald-400" />
                <span>播放歷史與離線歌區</span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-mono font-medium border ${
                  historyTracks.length >= MAX_OFFLINE_TRACKS
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    : 'bg-white/10 text-neutral-300 border-white/10'
                }`}>
                  {historyTracks.length} / {MAX_OFFLINE_TRACKS} 首
                </span>
              </>
            ) : activeTab === 'playlists' ? (
              activePlaylist ? (
                <>
                  <Library className="w-7 h-7 text-purple-400" />
                  {activePlaylist.name}
                </>
              ) : (
                <>
                  <Library className="w-7 h-7 text-purple-400" />
                  自訂播放歌單
                </>
              )
            ) : searchQuery ? (
              <>
                <span>{searchQuery}</span>
              </>
            ) : (
              <>
                <span>探索音樂</span>
              </>
            )}
          </h1>
          <p className="text-xs text-neutral-400 mt-1 font-normal flex items-center gap-2">
            {activeTab === 'history' ? (
              <span>離線歌區上限為 {MAX_OFFLINE_TRACKS} 首，播過的歌曲會自動暫存離線檔案。達上限時請清除以釋出空間。</span>
            ) : activeTab === 'playlists' ? (
              activePlaylist ? (
                <span>{activePlaylist.description || `包含 ${activePlaylist.tracks.length} 首自選曲目`}</span>
              ) : (
                <span>專屬 {currentUser.displayName} 的個性化歌單，資料獨立儲存並自動記住。</span>
              )
            ) : isSearching ? (
              '正在連接音樂資料庫...'
            ) : (
              `共 ${displayTracks.length} 首精彩曲目`
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {activeTab === 'playlists' && !activePlaylist && (
            <>
              <button
                onClick={() => onOpenCreatePlaylist?.()}
                className="px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-500 active:scale-95 text-white text-xs font-semibold shadow-lg shadow-purple-600/25 flex items-center gap-2 transition-all cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>新建歌單</span>
              </button>
              {playlists.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm('確定要清空所有自訂播放清單嗎？（此動作無法復原）')) {
                      clearAllPlaylists();
                    }
                  }}
                  className="px-3.5 py-2 rounded-full apple-pill text-neutral-400 hover:text-rose-400 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                  title="清除所有播放清單"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">清空全部歌單</span>
                </button>
              )}
            </>
          )}

          {activeTab === 'playlists' && activePlaylist && (
            <>
              {activePlaylist.tracks.length > 0 && (
                <button
                  onClick={() => {
                    if (window.confirm(`確定要清除「${activePlaylist.name}」內的所有歌曲嗎？`)) {
                      clearPlaylistTracks(activePlaylist.id);
                    }
                  }}
                  className="px-3.5 py-2 rounded-full apple-pill text-neutral-400 hover:text-amber-400 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                  title="清空此歌單內的歌曲"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>清空歌曲</span>
                </button>
              )}
              <button
                onClick={() => {
                  if (window.confirm(`確定要刪除「${activePlaylist.name}」歌單嗎？`)) {
                    deletePlaylist(activePlaylist.id);
                  }
                }}
                className="px-3.5 py-2 rounded-full apple-pill text-neutral-400 hover:text-rose-400 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                title="刪除此歌單"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>刪除此歌單</span>
              </button>
            </>
          )}

          {displayTracks.length > 0 && (
            <>
              <button
                onClick={handlePlayAll}
                className="px-5 py-2 rounded-full bg-[#fa2d48] hover:bg-[#e0233d] active:scale-95 text-white text-xs font-semibold shadow-lg shadow-[#fa2d48]/25 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>全部播放</span>
              </button>
              <button
                onClick={handleAddAllToQueue}
                className="px-4 py-2 rounded-full apple-pill text-neutral-200 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>加入待播</span>
              </button>
            </>
          )}

          {activeTab === 'history' && historyTracks.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('確定要清空離線歌區與所有已快取的歌曲嗎？')) {
                  clearHistory();
                }
              }}
              className="px-3.5 py-2 rounded-full apple-pill text-neutral-400 hover:text-rose-400 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
              title="清空歷史記錄與離線快取"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>清空離線歌區</span>
            </button>
          )}
        </div>
      </div>

      {/* 離線歌區額滿警示橫幅 */}
      {activeTab === 'history' && historyTracks.length >= MAX_OFFLINE_TRACKS && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>
              <strong>離線歌區已達到上限（{MAX_OFFLINE_TRACKS} 首）！</strong>
              無法再新增或快取更多歌曲，請使用右上方「清空離線歌區」或點選單曲垃圾桶圖示刪除歌曲。
            </span>
          </div>
          <button
            onClick={() => {
              if (window.confirm('確定要清空離線歌區與所有快取歌曲以釋出空間嗎？')) {
                clearHistory();
              }
            }}
            className="px-3.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer shadow"
          >
            <Trash2 className="w-3.5 h-3.5" />
            立即清空
          </button>
        </div>
      )}

      {/* 歌單總覽卡片網格 (當 activeTab === 'playlists' 且尚未選擇特定歌單) */}
      {activeTab === 'playlists' && !activePlaylist && (
        <div className="mb-10">
          {playlists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-3xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 shadow-xl">
                <Library className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold text-neutral-200 mb-1">
                尚無任何自訂歌單
              </h3>
              <p className="text-xs text-neutral-400 max-w-sm mb-5">
                為 {currentUser.displayName} 建立第一個專屬歌單，收納您最愛的歌曲！
              </p>
              <button
                onClick={() => onOpenCreatePlaylist?.()}
                className="px-5 py-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                <FolderPlus className="w-4 h-4" />
                <span>立即建立歌單</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {playlists.map((playlist) => {
                const cover = playlist.tracks[0]?.artwork || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop';
                return (
                  <div
                    key={playlist.id}
                    onClick={() => setActivePlaylistId(playlist.id)}
                    className="group flex flex-col justify-between p-3.5 rounded-2xl apple-card cursor-pointer hover:border-purple-500/30 transition-all hover:scale-[1.02]"
                  >
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-3 bg-neutral-900 shadow-md">
                      <img
                        src={cover}
                        alt={playlist.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-lg opacity-80 group-hover:opacity-100 transition-opacity">
                          <Library className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-[14px] text-white truncate">
                          {playlist.name}
                        </h3>
                        <p className="text-[12px] text-neutral-400 truncate mt-0.5">
                          {playlist.tracks.length} 首歌曲
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                        {playlist.tracks.length > 0 && (
                          <button
                            onClick={() => {
                              if (window.confirm(`確定要清空「${playlist.name}」中的歌曲嗎？`)) {
                                clearPlaylistTracks(playlist.id);
                              }
                            }}
                            className="p-1.5 rounded-full text-neutral-400 hover:text-amber-400 hover:bg-white/10 transition-colors cursor-pointer"
                            title="清空此歌單歌曲"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (window.confirm(`確定要刪除「${playlist.name}」歌單嗎？`)) {
                              deletePlaylist(playlist.id);
                            }
                          }}
                          className="p-1.5 rounded-full text-neutral-400 hover:text-rose-400 hover:bg-white/10 transition-colors cursor-pointer"
                          title="刪除歌單"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Apple 膠囊分段控制器 (Segmented Control) */}
      {activeTab === 'search' && baseTracks.length > 0 && (
        <div className="inline-flex p-1 rounded-full bg-white/[0.05] border border-white/[0.06] mb-6 gap-1">
          <button
            onClick={() => setSourceFilter('all')}
            className={`px-3.5 py-1 rounded-full text-xs transition-all cursor-pointer ${
              sourceFilter === 'all'
                ? 'bg-white/15 text-white font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            全部 ({baseTracks.length})
          </button>
          <button
            onClick={() => setSourceFilter('youtube')}
            className={`px-3.5 py-1 rounded-full text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
              sourceFilter === 'youtube'
                ? 'bg-white/15 text-white font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <YoutubeIcon className="w-3 h-3 text-[#fa2d48]" />
            YouTube ({ytCount})
          </button>
          <button
            onClick={() => setSourceFilter('audius')}
            className={`px-3.5 py-1 rounded-full text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
              sourceFilter === 'audius'
                ? 'bg-white/15 text-white font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Audius ({audiusCount})
          </button>
        </div>
      )}

      {/* 空狀態顯示 */}
      {displayTracks.length === 0 && !isSearching && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-3xl bg-neutral-900/80 border border-white/10 flex items-center justify-center text-neutral-500 mb-4 shadow-xl">
            {activeTab === 'favorites' ? (
              <Heart className="w-8 h-8 text-[#fa2d48]/40" />
            ) : activeTab === 'history' ? (
              <History className="w-8 h-8 text-emerald-400/40" />
            ) : (
              <Music className="w-8 h-8 text-neutral-400" />
            )}
          </div>
          <h3 className="text-base font-semibold text-neutral-200 mb-1">
            {activeTab === 'favorites'
              ? '您尚未加入任何喜愛歌曲'
              : activeTab === 'history'
              ? '目前暫無播放過的歷史歌曲'
              : '沒有找到相符的曲目'}
          </h3>
          <p className="text-xs text-neutral-400 max-w-sm mb-5">
            {activeTab === 'favorites'
              ? '點選任何歌曲上的愛心圖示，即可將其收納至此處。'
              : activeTab === 'history'
              ? '只要開始播放任何歌曲，系統就會自動將其加入此暫存清單，並自動快取離線檔案。'
              : '試試搜尋上方推薦的藝人（周杰倫、周深、張雨生、毛不易），或更換關鍵字。'}
          </p>
        </div>
      )}

      {/* Apple Music 風格專輯封面卡片網格 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
        {displayTracks.map((track) => {
          const active = isCurrentTrack(track);
          const favorite = isFav(track);
          const queued = isQueued(track);
          const isYt = track.source === 'youtube';

          return (
            <div
              key={track.id}
              className={`group flex flex-col justify-between p-3 rounded-2xl apple-card cursor-pointer ${
                active
                  ? 'bg-white/[0.09] border-white/20 shadow-xl'
                  : ''
              }`}
              onClick={() => playTrack(track)}
            >
              {/* 頂部封面圖 (正方形圓角) */}
              <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-3 bg-neutral-900 shadow-md">
                <img
                  src={track.artwork}
                  alt={track.title}
                  loading="lazy"
                  className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                    active && isPlaying ? 'scale-105' : ''
                  }`}
                  onError={(e) => {
                    e.currentTarget.src =
                      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop';
                  }}
                />

                {/* 懸浮與播放中覆蓋按鈕 */}
                <div
                  className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center transition-opacity ${
                    active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center shadow-2xl transition-transform active:scale-90 ${
                      active && isPlaying
                        ? 'bg-[#fa2d48] text-white shadow-[#fa2d48]/40 scale-100'
                        : 'bg-white text-black hover:scale-110'
                    }`}
                  >
                    {active && isPlaying ? (
                      <div className="flex items-end gap-0.5 h-4">
                        <span className="w-1 bg-white animate-[bounce_0.8s_infinite] h-full rounded-full" />
                        <span className="w-1 bg-white animate-[bounce_0.6s_infinite_0.2s] h-3/4 rounded-full" />
                        <span className="w-1 bg-white animate-[bounce_0.9s_infinite_0.4s] h-full rounded-full" />
                      </div>
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </div>
                </div>

                {/* 播放中標記 */}
                {active && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-white text-[10px] font-medium flex items-center gap-1 shadow">
                    <Volume2 className="w-3 h-3 text-[#fa2d48] animate-pulse" />
                    <span>播放中</span>
                  </div>
                )}

                {/* 來源與離線標記 (Apple 磨砂膠囊標記) */}
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  {track.isOfflineAvailable && (
                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/80 text-[9px] font-bold text-black shadow flex items-center gap-0.5" title="離線可播放">
                      <HardDriveDownload className="w-2.5 h-2.5" />
                      <span>離線</span>
                    </span>
                  )}
                  {isYt ? (
                    <span className="px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-medium text-white flex items-center gap-1 border border-white/10 shadow">
                      <YoutubeIcon className="w-2.5 h-2.5 text-[#fa2d48]" />
                      <span>YT</span>
                    </span>
                  ) : track.isPreview || track.source === 'itunes' ? (
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-500/80 text-[10px] font-bold text-black shadow">
                      試聽
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-medium text-emerald-300 border border-emerald-500/20 shadow">
                      完整
                    </span>
                  )}
                </div>

                {/* 時長 */}
                {track.duration > 0 && (
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] text-neutral-300 font-mono">
                    {formatTime(track.duration)}
                  </span>
                )}
              </div>

              {/* 中間文字資訊 */}
              <div className="flex-1 min-w-0 mb-2">
                <h3
                  className={`font-semibold text-[13px] leading-snug line-clamp-1 ${
                    active ? 'text-[#fa2d48]' : 'text-neutral-100 group-hover:text-white'
                  }`}
                  title={track.title}
                >
                  {track.title}
                </h3>
                <p className="text-[12px] text-neutral-400 truncate mt-0.5" title={track.artist}>
                  {track.artist}
                </p>
              </div>

              {/* 底部互動按鈕 */}
              <div
                className="flex items-center justify-between pt-1.5 border-t border-white/[0.04]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-1">
                  {track.year && (
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {track.year}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {/* 若在歷史分頁，提供手動離線快取或移除歷史按鈕 */}
                  {activeTab === 'history' ? (
                    <>
                      {track.source !== 'youtube' && !track.isOfflineAvailable && (
                        <button
                          onClick={() => cacheTrackAudio(track)}
                          className="p-2 sm:p-1.5 rounded-full text-neutral-400 hover:text-emerald-400 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                          title="手動下載離線快取"
                        >
                          <HardDriveDownload className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteHistoryTrack(track.id)}
                        className="p-2 sm:p-1.5 rounded-full text-neutral-400 hover:text-rose-400 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                        title="從歷史記錄移除"
                      >
                        <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                      </button>
                    </>
                  ) : null}

                  {/* 若在自訂歌單分頁中，提供從該歌單移除按鈕 */}
                  {activeTab === 'playlists' && activePlaylist ? (
                    <button
                      onClick={() => removeTrackFromPlaylist(activePlaylist.id, track.id)}
                      className="p-2 sm:p-1.5 rounded-full text-neutral-400 hover:text-rose-400 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                      title="從此歌單移除"
                    >
                      <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    </button>
                  ) : null}

                  {/* 加入自訂歌單 */}
                  {onOpenAddToPlaylist && (
                    <button
                      onClick={() => onOpenAddToPlaylist(track)}
                      className="p-2 sm:p-1.5 rounded-full text-neutral-400 hover:text-purple-400 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                      title="加入自訂歌單"
                    >
                      <FolderPlus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    </button>
                  )}

                  {/* 加入待播清單 */}
                  <button
                    onClick={() => addToQueue(track)}
                    className={`p-2 sm:p-1.5 rounded-full active:scale-95 transition-all cursor-pointer ${
                      queued
                        ? 'text-emerald-400 bg-emerald-500/10'
                        : 'text-neutral-400 hover:text-white hover:bg-white/10'
                    }`}
                    title={queued ? '已在待播中' : '加入待播清單'}
                  >
                    {queued ? <Check className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> : <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />}
                  </button>

                  {/* 喜愛 */}
                  <button
                    onClick={() => toggleFavorite(track)}
                    className={`p-2 sm:p-1.5 rounded-full active:scale-95 transition-all cursor-pointer ${
                      favorite
                        ? 'text-[#fa2d48] bg-[#fa2d48]/10'
                        : 'text-neutral-400 hover:text-[#fa2d48] hover:bg-white/10'
                    }`}
                    title={favorite ? '取消喜愛' : '加入喜愛'}
                  >
                    <Heart className={`w-4 h-4 sm:w-3.5 sm:h-3.5 ${favorite ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
